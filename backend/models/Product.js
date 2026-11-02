import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    modelNumber: {
      type: String,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
      index: true,
    },
    unit: {
      type: String,
      required: [true, 'Unit of measurement is required'],
      enum: ['Piece', 'Box', 'Roll', 'Meter', 'Packet', 'Set'],
      default: 'Piece',
    },
    currentStock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    minStock: {
      type: Number,
      required: true,
      default: 5,
      min: [0, 'Minimum stock threshold cannot be negative'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ProductSchema.virtual('isLowStock').get(function () {
  return this.currentStock <= this.minStock;
});

// Compound index for fast searching and filtering
ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ category: 1, currentStock: 1 });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
