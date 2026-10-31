import mongoose from 'mongoose';

const BusinessSettingSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: true,
      default: 'CCTV Security Solutions',
      trim: true,
    },
    contactNumber: {
      type: String,
      default: '+91 98765 43210',
      trim: true,
    },
    email: {
      type: String,
      default: 'contact@cctvsolutions.com',
      trim: true,
    },
    address: {
      type: String,
      default: 'Shop No. 12, Electronics Market, Surat, Gujarat',
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.BusinessSetting || mongoose.model('BusinessSetting', BusinessSettingSchema);

