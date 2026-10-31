import MaterialReturn from '../models/MaterialReturn.js';
import WorkEntry from '../models/WorkEntry.js';
import { recordMaterialReturn as recordReturnService } from '../services/stockService.js';

/**
 * Generate sequential unique Return Number: RET-YYYYMMDD-XXXX
 */
const generateReturnNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `RET-${dateStr}-`;

  const lastEntry = await MaterialReturn.findOne({ returnNumber: { $regex: `^${prefix}` } })
    .sort({ returnNumber: -1 })
    .select('returnNumber');

  let seq = 1;
  if (lastEntry && lastEntry.returnNumber) {
    const parts = lastEntry.returnNumber.split('-');
    if (parts.length === 3) {
      seq = parseInt(parts[2], 10) + 1;
    }
  }

  return `${prefix}${seq.toString().padStart(4, '0')}`;
};

/**
 * @desc    Get all material returns with filtering
 * @route   GET /api/returns
 * @access  Private
 */
export const getMaterialReturns = async (req, res, next) => {
  try {
    const { karigar, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = {};

    if (karigar && karigar !== 'ALL') {
      query.karigar = karigar;
    }

    if (startDate || endDate) {
      query.returnDate = {};
      if (startDate) query.returnDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.returnDate.$lte = end;
      }
    }

    const total = await MaterialReturn.countDocuments(query);
    const skip = (Number(page) - 1) * Number(limit);

    const returns = await MaterialReturn.find(query)
      .populate('karigar', 'fullName phone')
      .populate('workEntry', 'workOrderNumber customerName customerAddress')
      .populate('items.product', 'name unit')
      .sort({ returnDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      count: returns.length,
      page: Number(page),
      data: returns,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get returnable items from a Work Entry
 * @route   GET /api/returns/work-entry/:workEntryId/items
 * @access  Private
 */
export const getWorkEntryReturnableItems = async (req, res, next) => {
  try {
    const workEntry = await WorkEntry.findById(req.params.workEntryId)
      .populate('karigar', 'fullName phone')
      .populate('materials.product', 'name unit currentStock');

    if (!workEntry) {
      return res.status(404).json({ success: false, message: 'Work entry not found.' });
    }

    if (workEntry.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Work entry is cancelled. Cannot return materials.' });
    }

    const returnableItems = workEntry.materials.map((m) => {
      const issued = m.issuedQuantity;
      const returned = m.returnedQuantity || 0;
      const remaining = Math.max(0, issued - returned);
      return {
        product: m.product ? m.product._id : null,
        productName: m.productNameSnapshot || (m.product && m.product.name),
        unit: m.unitSnapshot || (m.product && m.product.unit),
        issuedQuantity: issued,
        returnedQuantity: returned,
        remainingQuantity: remaining,
        currentStock: m.product ? m.product.currentStock : 0,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        workEntry: {
          _id: workEntry._id,
          workOrderNumber: workEntry.workOrderNumber,
          workDate: workEntry.workDate,
          customerName: workEntry.customerName,
          customerAddress: workEntry.customerAddress,
          karigar: workEntry.karigar,
        },
        items: returnableItems,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a Material Return
 * @route   POST /api/returns
 * @access  Private
 */
export const createMaterialReturn = async (req, res, next) => {
  try {
    const { workEntryId, karigarId, returnDate, notes, items } = req.body;

    if (!workEntryId) {
      return res.status(400).json({ success: false, message: 'Work Entry reference is required.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one return item must be specified.' });
    }

    const returnNumber = await generateReturnNumber();

    const result = await recordReturnService({
      returnNumber,
      workEntryId,
      karigarId,
      returnDate: returnDate ? new Date(returnDate) : new Date(),
      notes,
      items,
    });

    res.status(201).json({
      success: true,
      message: `Return ${returnNumber} processed successfully. Stock updated.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
