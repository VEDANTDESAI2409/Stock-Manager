import WorkEntry from '../models/WorkEntry.js';
import Karigar from '../models/Karigar.js';
import MaterialReturn from '../models/MaterialReturn.js';
import { issueMaterialsForWork, cancelWorkEntry as cancelWorkService } from '../services/stockService.js';

/**
 * Generate sequential unique Work Order Number: WO-YYYYMMDD-XXXX
 */
const generateWorkOrderNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `WO-${dateStr}-`;

  const lastEntry = await WorkEntry.findOne({ workOrderNumber: { $regex: `^${prefix}` } })
    .sort({ workOrderNumber: -1 })
    .select('workOrderNumber');

  let seq = 1;
  if (lastEntry && lastEntry.workOrderNumber) {
    const parts = lastEntry.workOrderNumber.split('-');
    if (parts.length === 3) {
      seq = parseInt(parts[2], 10) + 1;
    }
  }

  return `${prefix}${seq.toString().padStart(4, '0')}`;
};

/**
 * @desc    Get all work entries with filters
 * @route   GET /api/work-entries
 * @access  Private
 */
export const getWorkEntries = async (req, res, next) => {
  try {
    const { karigar, customer, startDate, endDate, status, page = 1, limit = 50 } = req.query;
    const query = {};

    if (karigar && karigar !== 'ALL') {
      query.karigar = karigar;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (customer && customer.trim() !== '') {
      query.customerName = { $regex: customer.trim(), $options: 'i' };
    }

    if (startDate || endDate) {
      query.workDate = {};
      if (startDate) query.workDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.workDate.$lte = end;
      }
    }

    const total = await WorkEntry.countDocuments(query);
    const skip = (Number(page) - 1) * Number(limit);

    const workEntries = await WorkEntry.find(query)
      .populate('karigar', 'fullName phone status')
      .populate('materials.product', 'name unit currentStock')
      .sort({ workDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      count: workEntries.length,
      page: Number(page),
      data: workEntries,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single work entry by ID with its material returns
 * @route   GET /api/work-entries/:id
 * @access  Private
 */
export const getWorkEntryById = async (req, res, next) => {
  try {
    const workEntry = await WorkEntry.findById(req.params.id)
      .populate('karigar', 'fullName phone status address')
      .populate('materials.product', 'name unit currentStock');

    if (!workEntry) {
      return res.status(404).json({ success: false, message: 'Work entry not found.' });
    }

    // Get returns linked to this work entry
    const returns = await MaterialReturn.find({ workEntry: workEntry._id })
      .populate('items.product', 'name unit')
      .sort({ returnDate: -1 });

    res.status(200).json({
      success: true,
      data: {
        workEntry,
        returns,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new Work Entry (Issue materials & deduct stock)
 * @route   POST /api/work-entries
 * @access  Private
 */
export const createWorkEntry = async (req, res, next) => {
  try {
    const { workDate, karigar, customerName, customerPhone, customerAddress, notes, materials } = req.body;

    if (!karigar) {
      return res.status(400).json({ success: false, message: 'Karigar is required.' });
    }
    if (!customerName || customerName.trim() === '') {
      return res.status(400).json({ success: false, message: 'Customer name is required.' });
    }
    if (!customerAddress || customerAddress.trim() === '') {
      return res.status(400).json({ success: false, message: 'Customer address/location is required.' });
    }
    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({ success: false, message: 'Please add at least one material to issue.' });
    }

    // Verify Karigar is active
    const karigarDoc = await Karigar.findById(karigar);
    if (!karigarDoc) {
      return res.status(404).json({ success: false, message: 'Selected Karigar not found.' });
    }
    if (karigarDoc.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: `Cannot issue materials to inactive Karigar "${karigarDoc.fullName}". Please activate the technician first.`,
      });
    }

    const workOrderNumber = await generateWorkOrderNumber();

    const createdEntry = await issueMaterialsForWork({
      workOrderNumber,
      workDate: workDate ? new Date(workDate) : new Date(),
      karigar,
      customerName: customerName.trim(),
      customerPhone: customerPhone ? customerPhone.trim() : '',
      customerAddress: customerAddress.trim(),
      notes: notes ? notes.trim() : '',
      materials,
    });

    res.status(201).json({
      success: true,
      message: `Work Order ${createdEntry.workOrderNumber} created and materials issued successfully.`,
      data: createdEntry,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Cancel Work Entry (Safely reverse issued stock if no returns exist)
 * @route   POST /api/work-entries/:id/cancel
 * @access  Private
 */
export const cancelWorkEntry = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const cancelledEntry = await cancelWorkService(req.params.id, reason);

    res.status(200).json({
      success: true,
      message: `Work Order ${cancelledEntry.workOrderNumber} was cancelled and inventory has been restored.`,
      data: cancelledEntry,
    });
  } catch (err) {
    next(err);
  }
};
