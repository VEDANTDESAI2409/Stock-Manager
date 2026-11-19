import express from 'express';
import {
  getWorkEntries,
  getWorkEntryById,
  createWorkEntry,
  cancelWorkEntry,
  uploadPhotos,
  addPhotosToWorkEntry,
  deleteWorkPhoto,
} from '../controllers/workEntryController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadWorkPhotos } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getWorkEntries)
  .post(createWorkEntry);

// Photo upload (pre-creation or batch)
router.post('/upload-photos', uploadWorkPhotos.array('photos', 10), uploadPhotos);

router.route('/:id')
  .get(getWorkEntryById);

router.post('/:id/cancel', cancelWorkEntry);

// Photo attachment & deletion on existing work entry
router.post('/:id/photos', uploadWorkPhotos.array('photos', 10), addPhotosToWorkEntry);
router.delete('/:id/photos/:photoId', deleteWorkPhoto);

export default router;
