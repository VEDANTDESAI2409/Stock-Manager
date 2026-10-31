import mongoose from 'mongoose';

const KarigarSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Karigar name is required'],
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

KarigarSchema.index({ fullName: 'text', phone: 'text' });

export default mongoose.models.Karigar || mongoose.model('Karigar', KarigarSchema);

