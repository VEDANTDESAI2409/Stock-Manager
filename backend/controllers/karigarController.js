import Karigar from '../models/Karigar.js';
import WorkEntry from '../models/WorkEntry.js';
import MaterialReturn from '../models/MaterialReturn.js';
import Attendance from '../models/Attendance.js';

/**
 * @desc    Get all karigars with optional search & status filter
 * @route   GET /api/karigars
 * @access  Private
 */
export const getKarigars = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const query = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (search && search.trim() !== '') {
      query.$or = [
        { fullName: { $regex: search.trim(), $options: 'i' } },
        { phone: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const karigars = await Karigar.find(query).sort({ fullName: 1 });

    // Calculate quick counts for each karigar
    const karigarIds = karigars.map((k) => k._id);
    const workCounts = await WorkEntry.aggregate([
      { $match: { karigar: { $in: karigarIds }, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: '$karigar', totalWork: { $sum: 1 } } },
    ]);
    const workMap = new Map(workCounts.map((w) => [w._id.toString(), w.totalWork]));

    const karigarsWithStats = karigars.map((k) => ({
      ...k.toObject(),
      totalWorkEntries: workMap.get(k._id.toString()) || 0,
    }));

    res.status(200).json({
      success: true,
      data: karigarsWithStats,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get Karigar Details with Complete History
 * @route   GET /api/karigars/:id
 * @access  Private
 */
export const getKarigarById = async (req, res, next) => {
  try {
    const karigar = await Karigar.findById(req.params.id);
    if (!karigar) {
      return res.status(404).json({ success: false, message: 'Karigar not found' });
    }

    // Work entries
    const workEntries = await WorkEntry.find({ karigar: karigar._id })
      .populate('materials.product', 'name unit')
      .sort({ workDate: -1 });

    // Material returns
    const materialReturns = await MaterialReturn.find({ karigar: karigar._id })
      .populate('workEntry', 'workOrderNumber customerName')
      .populate('items.product', 'name unit')
      .sort({ returnDate: -1 });

    // Attendance stats
    const attendanceRecords = await Attendance.find({ karigar: karigar._id }).sort({ date: -1 });
    const attendanceStats = {
      present: 0,
      absent: 0,
      halfDay: 0,
    };
    attendanceRecords.forEach((a) => {
      if (a.status === 'PRESENT') attendanceStats.present++;
      else if (a.status === 'ABSENT') attendanceStats.absent++;
      else if (a.status === 'HALF_DAY') attendanceStats.halfDay++;
    });

    // Material Summary (Issued vs Returned per product)
    const materialSummaryMap = new Map();
    workEntries.forEach((entry) => {
      if (entry.status !== 'CANCELLED') {
        entry.materials.forEach((m) => {
          const prodId = m.product ? m.product._id.toString() : m.productNameSnapshot;
          const prodName = m.productNameSnapshot || (m.product && m.product.name) || 'Product';
          const unit = m.unitSnapshot || (m.product && m.product.unit) || 'Piece';

          if (!materialSummaryMap.has(prodId)) {
            materialSummaryMap.set(prodId, {
              productName: prodName,
              unit,
              totalIssued: 0,
              totalReturned: 0,
            });
          }
          const item = materialSummaryMap.get(prodId);
          item.totalIssued += m.issuedQuantity;
          item.totalReturned += m.returnedQuantity || 0;
        });
      }
    });

    const materialSummary = Array.from(materialSummaryMap.values()).map((item) => ({
      ...item,
      pendingReturn: Math.max(0, item.totalIssued - item.totalReturned),
    }));

    res.status(200).json({
      success: true,
      data: {
        karigar,
        stats: {
          totalWorkOrders: workEntries.filter((w) => w.status !== 'CANCELLED').length,
          totalReturns: materialReturns.length,
          attendance: attendanceStats,
        },
        materialSummary,
        workEntries,
        materialReturns,
        attendanceHistory: attendanceRecords.slice(0, 30),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a new Karigar
 * @route   POST /api/karigars
 * @access  Private
 */
export const createKarigar = async (req, res, next) => {
  try {
    const { fullName, phone, address, notes } = req.body;

    if (!fullName || fullName.trim() === '') {
      return res.status(400).json({ success: false, message: 'Karigar name is required.' });
    }

    const karigar = await Karigar.create({
      fullName: fullName.trim(),
      phone: phone ? phone.trim() : '',
      address: address ? address.trim() : '',
      notes: notes ? notes.trim() : '',
      status: 'ACTIVE',
    });

    res.status(201).json({
      success: true,
      message: 'Karigar added successfully',
      data: karigar,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update Karigar
 * @route   PUT /api/karigars/:id
 * @access  Private
 */
export const updateKarigar = async (req, res, next) => {
  try {
    const { fullName, phone, address, notes, status } = req.body;

    const karigar = await Karigar.findById(req.params.id);
    if (!karigar) {
      return res.status(404).json({ success: false, message: 'Karigar not found' });
    }

    if (fullName) karigar.fullName = fullName.trim();
    if (phone !== undefined) karigar.phone = phone.trim();
    if (address !== undefined) karigar.address = address.trim();
    if (notes !== undefined) karigar.notes = notes.trim();
    if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
      karigar.status = status;
    }

    await karigar.save();

    res.status(200).json({
      success: true,
      message: 'Karigar updated successfully',
      data: karigar,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Toggle Karigar Status (Active / Inactive)
 * @route   PATCH /api/karigars/:id/toggle-status
 * @access  Private
 */
export const toggleKarigarStatus = async (req, res, next) => {
  try {
    const karigar = await Karigar.findById(req.params.id);
    if (!karigar) {
      return res.status(404).json({ success: false, message: 'Karigar not found' });
    }

    karigar.status = karigar.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await karigar.save();

    res.status(200).json({
      success: true,
      message: `Karigar marked as ${karigar.status}`,
      data: karigar,
    });
  } catch (err) {
    next(err);
  }
};
