import mongoose from 'mongoose';

const WorkMaterialSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productNameSnapshot: {
      type: String,
      trim: true,
    },
    unitSnapshot: {
      type: String,
      default: 'Piece',
    },
    issuedQuantity: {
      type: Number,
      required: true,
      min: [1, 'Issued quantity must be at least 1'],
    },
    returnedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Returned quantity cannot be negative'],
    },
  },
  { _id: true }
);

WorkMaterialSchema.virtual('remainingQuantity').get(function () {
  return Math.max(0, this.issuedQuantity - this.returnedQuantity);
});

const WorkEntrySchema = new mongoose.Schema(
  {
    workOrderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    workDate: {
      type: Date,
      required: [true, 'Work date is required'],
      index: true,
    },
    karigar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Karigar',
      required: [true, 'Karigar is required'],
      index: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      index: true,
    },
    customerPhone: {
      type: String,
      trim: true,
      default: '',
    },
    customerAddress: {
      type: String,
      required: [true, 'Customer address / location is required'],
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    materials: [WorkMaterialSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

WorkEntrySchema.index({ workDate: -1, karigar: 1 });
WorkEntrySchema.index({ customerName: 'text', customerAddress: 'text' });

export default mongoose.models.WorkEntry || mongoose.model('WorkEntry', WorkEntrySchema);

