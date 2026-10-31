import express from 'express';
import {
  getKarigars,
  getKarigarById,
  createKarigar,
  updateKarigar,
  toggleKarigarStatus,
} from '../controllers/karigarController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getKarigars)
  .post(createKarigar);

router.route('/:id')
  .get(getKarigarById)
  .put(updateKarigar);

router.patch('/:id/toggle-status', toggleKarigarStatus);

export default router;

