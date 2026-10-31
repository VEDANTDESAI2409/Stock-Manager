import mongoose from 'mongoose';

const ReturnItemSchema = new mongoose.Schema(
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
    returnedQuantity: {
      type: Number,
      required: true,
      min: [1, 'Return quantity must be at least 1'],
    },
  },
  { _id: true }
);

const MaterialReturnSchema = new mongoose.Schema(
  {
    returnNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    workEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkEntry',
      required: [true, 'Original work entry is required'],
      index: true,
    },
    karigar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Karigar',
      required: [true, 'Karigar is required'],
      index: true,
    },
    returnDate: {
      type: Date,
      required: [true, 'Return date is required'],
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    items: [ReturnItemSchema],
  },
  { timestamps: true }
);

MaterialReturnSchema.index({ returnDate: -1, karigar: 1 });

export default mongoose.models.MaterialReturn || mongoose.model('MaterialReturn', MaterialReturnSchema);
