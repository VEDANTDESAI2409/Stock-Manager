import express from 'express';
import {
  getMaterialReturns,
  getWorkEntryReturnableItems,
  createMaterialReturn,
} from '../controllers/materialReturnController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getMaterialReturns)
  .post(createMaterialReturn);

router.get('/work-entry/:workEntryId/items', getWorkEntryReturnableItems);

export default router;
