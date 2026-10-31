import express from 'express';
import {
  getWorkEntries,
  getWorkEntryById,
  createWorkEntry,
  cancelWorkEntry,
} from '../controllers/workEntryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getWorkEntries)
  .post(createWorkEntry);

router.route('/:id')
  .get(getWorkEntryById);

router.post('/:id/cancel', cancelWorkEntry);

export default router;

