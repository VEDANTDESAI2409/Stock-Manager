import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import WorkEntry from '../models/WorkEntry.js';
import Karigar from '../models/Karigar.js';
import MaterialReturn from '../models/MaterialReturn.js';
import { issueMaterialsForWork, cancelWorkEntry as cancelWorkService } from '../services/stockService.js';
import { getUploadDirectory } from '../middleware/uploadMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      query.$or = [{ karigar }, { karigars: karigar }];
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
      .populate('karigars', 'fullName phone status')
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
      .populate('karigars', 'fullName phone status address')
      .populate('materials.product', 'name unit currentStock');

    if (!workEntry) {
      return res.status(404).json({ success: false, message: 'Work entry not found.' });
    }

    // Get returns linked to this work entry
    const returns = await MaterialReturn.find({ workEntry: workEntry._id })
      .populate('karigar', 'fullName phone')
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
    const {
      workDate,
      karigar,
      karigars,
      customerName,
      customerPhone,
      customerAddress,
      notes,
      materials,
      photos,
    } = req.body;

    // Normalize karigars list (supporting both single and multiple karigars)
    let assignedKarigars = [];
    if (Array.isArray(karigars) && karigars.length > 0) {
      assignedKarigars = karigars.map((k) => (k && k._id ? k._id.toString() : k.toString()));
    } else if (karigar) {
      assignedKarigars = [karigar.toString()];
    }

    // Filter empty values
    assignedKarigars = assignedKarigars.filter(Boolean);

    if (assignedKarigars.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one technician (Karigar) must be assigned.',
      });
    }

    // Prevent duplicate Karigars in the same Work Entry
    const uniqueKarigars = new Set(assignedKarigars);
    if (uniqueKarigars.size !== assignedKarigars.length) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate technician selected. Each Karigar can only be assigned once.',
      });
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

    // Verify all Karigars exist and are active
    const karigarDocs = await Karigar.find({ _id: { $in: assignedKarigars } });
    if (karigarDocs.length !== assignedKarigars.length) {
      return res.status(404).json({ success: false, message: 'One or more selected Karigars do not exist.' });
    }

    const inactive = karigarDocs.find((k) => k.status !== 'ACTIVE');
    if (inactive) {
      return res.status(400).json({
        success: false,
        message: `Cannot issue materials to inactive Karigar "${inactive.fullName}". Please activate the technician first.`,
      });
    }

    const workOrderNumber = await generateWorkOrderNumber();

    const createdEntry = await issueMaterialsForWork({
      workOrderNumber,
      workDate: workDate ? new Date(workDate) : new Date(),
      karigar: assignedKarigars[0],
      karigars: assignedKarigars,
      customerName: customerName.trim(),
      customerPhone: customerPhone ? customerPhone.trim() : '',
      customerAddress: customerAddress.trim(),
      notes: notes ? notes.trim() : '',
      materials,
      photos: Array.isArray(photos) ? photos : [],
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
 * @desc    Upload Work Entry Photos (Temporary or pre-save)
 * @route   POST /api/work-entries/upload-photos
 * @access  Private
 */
export const uploadPhotos = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No photo files were provided.' });
    }

    const uploaded = req.files.map((file) => ({
      url: `/uploads/work-entries/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date(),
    }));

    res.status(200).json({
      success: true,
      message: `${uploaded.length} photo(s) uploaded successfully.`,
      data: uploaded,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add photos to an existing Work Entry
 * @route   POST /api/work-entries/:id/photos
 * @access  Private
 */
export const addPhotosToWorkEntry = async (req, res, next) => {
  try {
    const workEntry = await WorkEntry.findById(req.params.id);
    if (!workEntry) {
      return res.status(404).json({ success: false, message: 'Work entry not found.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No photo files were provided.' });
    }

    const newPhotos = req.files.map((file) => ({
      url: `/uploads/work-entries/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date(),
    }));

    workEntry.photos.push(...newPhotos);
    await workEntry.save();

    const updated = await WorkEntry.findById(workEntry._id)
      .populate('karigar', 'fullName phone status address')
      .populate('karigars', 'fullName phone status address')
      .populate('materials.product', 'name unit currentStock');

    res.status(200).json({
      success: true,
      message: `${newPhotos.length} photo(s) attached to Work Order #${workEntry.workOrderNumber}.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a photo from a Work Entry
 * @route   DELETE /api/work-entries/:id/photos/:photoId
 * @access  Private
 */
export const deleteWorkPhoto = async (req, res, next) => {
  try {
    const { id, photoId } = req.params;
    const workEntry = await WorkEntry.findById(id);

    if (!workEntry) {
      return res.status(404).json({ success: false, message: 'Work entry not found.' });
    }

    const photoIndex = workEntry.photos.findIndex((p) => p._id.toString() === photoId);
    if (photoIndex === -1) {
      return res.status(404).json({ success: false, message: 'Photo not found in this work order.' });
    }

    const photo = workEntry.photos[photoIndex];

    // Remove file from disk if present
    try {
      const uploadDir = getUploadDirectory();
      const filePath = path.join(uploadDir, photo.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fsErr) {
      console.warn('Could not unlink photo file from disk:', fsErr.message);
    }

    // Remove subdocument without deleting the work entry
    workEntry.photos.splice(photoIndex, 1);
    await workEntry.save();

    const updated = await WorkEntry.findById(workEntry._id)
      .populate('karigar', 'fullName phone status address')
      .populate('karigars', 'fullName phone status address')
      .populate('materials.product', 'name unit currentStock');

    res.status(200).json({
      success: true,
      message: 'Photo removed successfully.',
      data: updated,
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
