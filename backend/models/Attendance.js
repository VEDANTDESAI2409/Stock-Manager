import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema(
  {
    date: {
      type: String, // 'YYYY-MM-DD' format for exact timezone-agnostic date matching
      required: [true, 'Date is required'],
      index: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    karigar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Karigar',
      required: [true, 'Karigar is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'HALF_DAY'],
      required: [true, 'Attendance status is required'],
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// One record per Karigar per date
AttendanceSchema.index({ karigar: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ date: 1, status: 1 });

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);

