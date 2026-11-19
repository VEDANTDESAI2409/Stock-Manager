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

const WorkPhotoSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      trim: true,
      default: '',
    },
    size: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      trim: true,
      default: 'image/jpeg',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

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
    // Primary / Legacy Karigar reference for backwards compatibility
    karigar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Karigar',
      index: true,
    },
    // Multiple assigned Karigars
    karigars: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Karigar',
        index: true,
      },
    ],
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
    photos: [WorkPhotoSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-validate hook to sync karigar and karigars
WorkEntrySchema.pre('validate', function (next) {
  if (this.karigars && this.karigars.length > 0) {
    // Deduplicate
    const seen = new Set();
    const uniqueKarigars = [];
    for (const k of this.karigars) {
      const idStr = (k && k._id ? k._id : k).toString();
      if (!seen.has(idStr)) {
        seen.add(idStr);
        uniqueKarigars.push(k);
      }
    }
    this.karigars = uniqueKarigars;
    if (!this.karigar && this.karigars.length > 0) {
      this.karigar = this.karigars[0];
    }
  } else if (this.karigar) {
    this.karigars = [this.karigar];
  }

  // Ensure at least one karigar exists
  if ((!this.karigars || this.karigars.length === 0) && !this.karigar) {
    return next(new Error('At least one assigned Karigar (technician) is required.'));
  }

  next();
});

WorkEntrySchema.index({ workDate: -1, karigar: 1 });
WorkEntrySchema.index({ customerName: 'text', customerAddress: 'text' });

export default mongoose.models.WorkEntry || mongoose.model('WorkEntry', WorkEntrySchema);
