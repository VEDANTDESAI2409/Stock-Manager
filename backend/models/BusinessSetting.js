import mongoose from 'mongoose';

const BusinessSettingSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: true,
      default: 'Tanish Technology',
      trim: true,
    },
    contactNumber: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.BusinessSetting || mongoose.model('BusinessSetting', BusinessSettingSchema);

