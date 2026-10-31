import mongoose from 'mongoose';

const StockTransactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['STOCK_IN', 'STOCK_OUT', 'WORK_ISSUE', 'MATERIAL_RETURN', 'STOCK_ADJUSTMENT'],
      required: true,
      index: true,
    },
    changeType: {
      type: String,
      enum: ['ADD', 'SUBTRACT'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    previousStock: {
      type: Number,
      required: true,
      min: 0,
    },
    updatedStock: {
      type: Number,
      required: true,
      min: 0,
    },
    workEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkEntry',
      default: null,
      index: true,
    },
    materialReturn: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaterialReturn',
      default: null,
      index: true,
    },
    reason: {
      type: String,
      required: [true, 'Reason or description is required for inventory audit trail'],
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

StockTransactionSchema.index({ date: -1, type: 1 });
StockTransactionSchema.index({ product: 1, date: -1 });

export default mongoose.models.StockTransaction || mongoose.model('StockTransaction', StockTransactionSchema);

