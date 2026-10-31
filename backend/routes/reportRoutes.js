import express from 'express';
import {
  getDashboardStats,
  getStockHistory,
  getKarigarMaterialReport,
  getCustomerWorkReport,
} from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/stock-history', getStockHistory);
router.get('/karigar-materials', getKarigarMaterialReport);
router.get('/customer-work', getCustomerWorkReport);

export default router;

