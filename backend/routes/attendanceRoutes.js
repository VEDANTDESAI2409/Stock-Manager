import express from 'express';
import {
  getAttendanceByDate,
  saveAttendanceForDate,
  getMonthlyAttendance,
} from '../controllers/attendanceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/date/:date', getAttendanceByDate);
router.post('/save', saveAttendanceForDate);
router.get('/monthly', getMonthlyAttendance);

export default router;
