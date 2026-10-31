import Attendance from '../models/Attendance.js';
import Karigar from '../models/Karigar.js';

/**
 * Format date to YYYY-MM-DD
 */
const formatDate = (date) => {
  const d = date ? new Date(date) : new Date();
  return d.toISOString().slice(0, 10);
};

/**
 * @desc    Get attendance sheet for a specific date
 * @route   GET /api/attendance/date/:date
 * @access  Private
 */
export const getAttendanceByDate = async (req, res, next) => {
  try {
    const targetDate = req.params.date || formatDate();

    // Get all active Karigars
    const karigars = await Karigar.find({ status: 'ACTIVE' }).sort({ fullName: 1 });

    // Get existing attendance records for this date
    const records = await Attendance.find({ date: targetDate });
    const recordMap = new Map(records.map((r) => [r.karigar.toString(), r]));

    const sheet = karigars.map((k) => {
      const existing = recordMap.get(k._id.toString());
      return {
        karigarId: k._id,
        fullName: k.fullName,
        phone: k.phone,
        status: existing ? existing.status : null, // null means unmarked
        notes: existing ? existing.notes : '',
        recordId: existing ? existing._id : null,
      };
    });

    const summary = {
      total: karigars.length,
      marked: records.length,
      present: records.filter((r) => r.status === 'PRESENT').length,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      halfDay: records.filter((r) => r.status === 'HALF_DAY').length,
      unmarked: karigars.length - records.length,
    };

    res.status(200).json({
      success: true,
      date: targetDate,
      summary,
      data: sheet,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Save / Update Attendance for a date (bulk upsert)
 * @route   POST /api/attendance/save
 * @access  Private
 */
export const saveAttendanceForDate = async (req, res, next) => {
  try {
    const { date, entries } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required.' });
    }

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, message: 'No attendance records provided.' });
    }

    const operations = [];
    for (const item of entries) {
      if (!item.karigarId || !item.status) continue;
      if (!['PRESENT', 'ABSENT', 'HALF_DAY'].includes(item.status)) continue;

      operations.push({
        updateOne: {
          filter: { karigar: item.karigarId, date },
          update: {
            $set: {
              status: item.status,
              notes: item.notes ? item.notes.trim() : '',
            },
          },
          upsert: true,
        },
      });
    }

    if (operations.length > 0) {
      await Attendance.bulkWrite(operations);
    }

    res.status(200).json({
      success: true,
      message: `Attendance for ${date} successfully recorded (${operations.length} karigars).`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get Monthly Attendance Summary and Grid
 * @route   GET /api/attendance/monthly
 * @access  Private
 */
export const getMonthlyAttendance = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const monthStr = m.toString().padStart(2, '0');
    const regexPattern = `^${y}-${monthStr}-`;

    const karigars = await Karigar.find().sort({ fullName: 1 });
    const records = await Attendance.find({ date: { $regex: regexPattern } });

    // Days in this month
    const daysInMonth = new Date(y, m, 0).getDate();

    // Aggregate stats per karigar
    const report = karigars.map((k) => {
      const kRecords = records.filter((r) => r.karigar.toString() === k._id.toString());
      const dailyMap = {};
      let presentCount = 0;
      let absentCount = 0;
      let halfDayCount = 0;

      kRecords.forEach((r) => {
        const dayNum = parseInt(r.date.split('-')[2], 10);
        dailyMap[dayNum] = r.status;
        if (r.status === 'PRESENT') presentCount++;
        else if (r.status === 'ABSENT') absentCount++;
        else if (r.status === 'HALF_DAY') halfDayCount++;
      });

      return {
        karigar: {
          _id: k._id,
          fullName: k.fullName,
          phone: k.phone,
          status: k.status,
        },
        presentCount,
        absentCount,
        halfDayCount,
        totalRecorded: kRecords.length,
        days: dailyMap,
      };
    });

    res.status(200).json({
      success: true,
      year: y,
      month: m,
      daysInMonth,
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

