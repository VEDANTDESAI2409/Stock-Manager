import mongoose from 'mongoose';
import Product from '../models/Product.js';
import StockTransaction from '../models/StockTransaction.js';
import WorkEntry from '../models/WorkEntry.js';
import MaterialReturn from '../models/MaterialReturn.js';
import { supportsTransactions } from '../config/db.js';

/**
 * Handle Stock In (Receiving new inventory)
 */
export const recordStockIn = async ({ productId, quantity, notes, date = new Date() }) => {
  const qty = Number(quantity);
  if (!qty || qty <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new Error('Product not found.');
  }

  const previousStock = product.currentStock;
  const updatedStock = previousStock + qty;

  product.currentStock = updatedStock;
  await product.save();

  const transaction = await StockTransaction.create({
    product: product._id,
    type: 'STOCK_IN',
    changeType: 'ADD',
    quantity: qty,
    previousStock,
    updatedStock,
    reason: notes ? `Stock In: ${notes}` : 'Stock In (Materials Received)',
    date,
  });

  return { product, transaction };
};

/**
 * Handle Manual Stock Out (Damage, write-off, disposal, internal testing)
 */
export const recordStockOut = async ({ productId, quantity, reason, date = new Date() }) => {
  const qty = Number(quantity);
  if (!qty || qty <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }
  if (!reason || reason.trim() === '') {
    throw new Error('Reason is mandatory for manual stock out.');
  }

  // Atomic update with safeguard against negative stock
  const product = await Product.findOneAndUpdate(
    { _id: productId, currentStock: { $gte: qty } },
    { $inc: { currentStock: -qty } },
    { new: false } // return document before update to get previousStock
  );

  if (!product) {
    const existing = await Product.findById(productId);
    if (!existing) throw new Error('Product not found.');
    throw new Error(
      `Insufficient stock. Available: ${existing.currentStock} ${existing.unit}, requested to remove: ${qty} ${existing.unit}.`
    );
  }

  const previousStock = product.currentStock;
  const updatedStock = previousStock - qty;

  const transaction = await StockTransaction.create({
    product: product._id,
    type: 'STOCK_OUT',
    changeType: 'SUBTRACT',
    quantity: qty,
    previousStock,
    updatedStock,
    reason: `Stock Out: ${reason.trim()}`,
    date,
  });

  const updatedProduct = await Product.findById(productId);
  return { product: updatedProduct, transaction };
};

/**
 * Handle Controlled Stock Adjustment
 */
export const recordStockAdjustment = async ({ productId, newQuantity, reason, date = new Date() }) => {
  const newQty = Number(newQuantity);
  if (isNaN(newQty) || newQty < 0) {
    throw new Error('New stock quantity cannot be negative.');
  }
  if (!reason || reason.trim().length < 4) {
    throw new Error('A descriptive reason (min 4 characters) is mandatory for stock adjustment.');
  }

  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found.');

  const previousStock = product.currentStock;
  if (previousStock === newQty) {
    throw new Error('The new quantity is identical to the current stock.');
  }

  const difference = newQty - previousStock;
  const changeType = difference > 0 ? 'ADD' : 'SUBTRACT';
  const quantityMagnitude = Math.abs(difference);

  product.currentStock = newQty;
  await product.save();

  const transaction = await StockTransaction.create({
    product: product._id,
    type: 'STOCK_ADJUSTMENT',
    changeType,
    quantity: quantityMagnitude,
    previousStock,
    updatedStock: newQty,
    reason: `Stock Adjustment: ${reason.trim()}`,
    date,
  });

  return { product, transaction };
};

/**
 * Issue Materials for Work Entry (Atomic deduction)
 */
export const issueMaterialsForWork = async (workData) => {
  const { workOrderNumber, workDate, karigar, customerName, customerPhone, customerAddress, notes, materials } = workData;

  if (!materials || !Array.isArray(materials) || materials.length === 0) {
    throw new Error('At least one product material must be added to the work entry.');
  }

  // Pre-validate all materials
  const productIds = materials.map((m) => m.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const validatedMaterials = [];
  for (const item of materials) {
    const p = productMap.get(item.product.toString());
    if (!p) {
      throw new Error(`Product not found: ${item.product}`);
    }
    const qty = Number(item.issuedQuantity);
    if (!qty || qty <= 0) {
      throw new Error(`Invalid issued quantity for product ${p.name}. Must be at least 1.`);
    }
    if (p.currentStock < qty) {
      throw new Error(
        `Insufficient stock for "${p.name}". Available: ${p.currentStock} ${p.unit}, Requested: ${qty} ${p.unit}.`
      );
    }
    validatedMaterials.push({
      product: p._id,
      productNameSnapshot: p.name,
      unitSnapshot: p.unit,
      issuedQuantity: qty,
      returnedQuantity: 0,
    });
  }

  // Use MongoDB session transaction if replica set is supported, otherwise sequential rollback-safe execution
  const useTx = supportsTransactions();
  const session = useTx ? await mongoose.startSession() : null;
  if (useTx) session.startTransaction();

  const stockTransactions = [];
  const modifiedProducts = [];

  try {
    // Deduct stock for each item
    for (const item of validatedMaterials) {
      const p = productMap.get(item.product.toString());
      const prevStock = p.currentStock;
      const newStock = prevStock - item.issuedQuantity;

      // Atomic update
      const updated = await Product.findOneAndUpdate(
        { _id: item.product, currentStock: { $gte: item.issuedQuantity } },
        { $inc: { currentStock: -item.issuedQuantity } },
        { new: true, session: session || undefined }
      );

      if (!updated) {
        throw new Error(`Stock for "${item.productNameSnapshot}" changed concurrently or became insufficient.`);
      }

      modifiedProducts.push({ product: updated, prevStock, newStock, qty: item.issuedQuantity });
    }

    // Create WorkEntry
    const [workEntry] = await WorkEntry.create(
      [
        {
          workOrderNumber,
          workDate,
          karigar,
          customerName,
          customerPhone,
          customerAddress,
          notes,
          materials: validatedMaterials,
          status: 'ACTIVE',
        },
      ],
      { session: session || undefined }
    );

    // Record StockTransactions
    for (const mod of modifiedProducts) {
      const tx = await StockTransaction.create(
        [
          {
            product: mod.product._id,
            type: 'WORK_ISSUE',
            changeType: 'SUBTRACT',
            quantity: mod.qty,
            previousStock: mod.prevStock,
            updatedStock: mod.newStock,
            workEntry: workEntry._id,
            reason: `Issued for Work Order ${workOrderNumber} (Customer: ${customerName})`,
            date: workDate || new Date(),
          },
        ],
        { session: session || undefined }
      );
      stockTransactions.push(tx[0]);
    }

    if (useTx) {
      await session.commitTransaction();
      session.endSession();
    }

    return await WorkEntry.findById(workEntry._id)
      .populate('karigar', 'fullName phone status')
      .populate('materials.product', 'name unit currentStock');
  } catch (err) {
    if (useTx && session) {
      await session.abortTransaction();
      session.endSession();
    } else {
      // Manual rollback if non-transactional mode
      for (const mod of modifiedProducts) {
        await Product.findByIdAndUpdate(mod.product._id, { $inc: { currentStock: mod.qty } });
      }
    }
    throw err;
  }
};

/**
 * Record Material Return against a Work Entry
 */
export const recordMaterialReturn = async (returnData) => {
  const { returnNumber, workEntryId, karigarId, returnDate, notes, items } = returnData;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('At least one returned item must be specified.');
  }

  const workEntry = await WorkEntry.findById(workEntryId);
  if (!workEntry) {
    throw new Error('Original work entry not found.');
  }

  if (workEntry.status === 'CANCELLED') {
    throw new Error('Cannot process return for a cancelled work entry.');
  }

  // Validate that the returned quantities do not exceed remaining returnable quantity
  const returnItemsValidated = [];
  const returnDeltas = [];

  for (const retItem of items) {
    const qty = Number(retItem.returnedQuantity);
    if (!qty || qty <= 0) continue; // skip 0 returns

    const matchedMaterial = workEntry.materials.find(
      (m) => m.product.toString() === retItem.product.toString()
    );

    if (!matchedMaterial) {
      throw new Error(`Product ${retItem.product} was not part of this work entry.`);
    }

    const remaining = matchedMaterial.issuedQuantity - (matchedMaterial.returnedQuantity || 0);
    if (qty > remaining) {
      throw new Error(
        `Cannot return ${qty} of "${matchedMaterial.productNameSnapshot}". Only ${remaining} remaining unreturned.`
      );
    }

    returnItemsValidated.push({
      product: matchedMaterial.product,
      productNameSnapshot: matchedMaterial.productNameSnapshot,
      unitSnapshot: matchedMaterial.unitSnapshot,
      returnedQuantity: qty,
    });

    returnDeltas.push({
      productId: matchedMaterial.product,
      productName: matchedMaterial.productNameSnapshot,
      qty,
    });
  }

  if (returnItemsValidated.length === 0) {
    throw new Error('Please enter a valid return quantity (> 0) for at least one item.');
  }

  const useTx = supportsTransactions();
  const session = useTx ? await mongoose.startSession() : null;
  if (useTx) session.startTransaction();

  const modifiedProducts = [];
  try {
    // 1. Create MaterialReturn record
    const [materialReturn] = await MaterialReturn.create(
      [
        {
          returnNumber,
          workEntry: workEntry._id,
          karigar: karigarId || workEntry.karigar,
          returnDate: returnDate || new Date(),
          notes: notes || '',
          items: returnItemsValidated,
        },
      ],
      { session: session || undefined }
    );

    // 2. Increment stock in Product & create StockTransactions
    for (const delta of returnDeltas) {
      const prod = await Product.findById(delta.productId).session(session || undefined);
      if (!prod) throw new Error(`Product not found: ${delta.productId}`);

      const prevStock = prod.currentStock;
      const newStock = prevStock + delta.qty;

      prod.currentStock = newStock;
      await prod.save({ session: session || undefined });
      modifiedProducts.push({ product: prod, qty: delta.qty });

      await StockTransaction.create(
        [
          {
            product: prod._id,
            type: 'MATERIAL_RETURN',
            changeType: 'ADD',
            quantity: delta.qty,
            previousStock: prevStock,
            updatedStock: newStock,
            workEntry: workEntry._id,
            materialReturn: materialReturn._id,
            reason: `Return #${returnNumber} from Karigar (Work Order: ${workEntry.workOrderNumber})`,
            date: returnDate || new Date(),
          },
        ],
        { session: session || undefined }
      );
    }

    // 3. Update returnedQuantity in WorkEntry materials
    for (const delta of returnDeltas) {
      const mat = workEntry.materials.find(
        (m) => m.product.toString() === delta.productId.toString()
      );
      if (mat) {
        mat.returnedQuantity = (mat.returnedQuantity || 0) + delta.qty;
      }
    }

    // Check if all issued materials are fully accounted for or returned
    const allReturnedOrAccounted = workEntry.materials.every(
      (m) => m.returnedQuantity >= m.issuedQuantity
    );
    if (allReturnedOrAccounted) {
      workEntry.status = 'COMPLETED';
    }

    await workEntry.save({ session: session || undefined });

    if (useTx) {
      await session.commitTransaction();
      session.endSession();
    }

    return await MaterialReturn.findById(materialReturn._id)
      .populate('workEntry', 'workOrderNumber customerName customerAddress')
      .populate('karigar', 'fullName phone')
      .populate('items.product', 'name unit');
  } catch (err) {
    if (useTx && session) {
      await session.abortTransaction();
      session.endSession();
    } else {
      // Rollback stock in non-tx mode
      for (const mod of modifiedProducts) {
        await Product.findByIdAndUpdate(mod.product._id, { $inc: { currentStock: -mod.qty } });
      }
    }
    throw err;
  }
};

/**
 * Safe Cancellation of a Work Entry
 * Reverses issued stock only if no returns have been logged against it.
 */
export const cancelWorkEntry = async (workEntryId, cancelReason) => {
  const workEntry = await WorkEntry.findById(workEntryId);
  if (!workEntry) throw new Error('Work entry not found.');

  if (workEntry.status === 'CANCELLED') {
    throw new Error('This work entry is already cancelled.');
  }

  // Safety check: has any material already been returned?
  const hasReturns = workEntry.materials.some((m) => m.returnedQuantity > 0);
  if (hasReturns) {
    throw new Error(
      'Cannot cancel a work entry that has associated material returns. Reconcile returns first.'
    );
  }

  const useTx = supportsTransactions();
  const session = useTx ? await mongoose.startSession() : null;
  if (useTx) session.startTransaction();

  try {
    // Reverse deductions: add issued quantities back into stock
    for (const mat of workEntry.materials) {
      const prod = await Product.findById(mat.product).session(session || undefined);
      if (prod) {
        const prevStock = prod.currentStock;
        const newStock = prevStock + mat.issuedQuantity;
        prod.currentStock = newStock;
        await prod.save({ session: session || undefined });

        await StockTransaction.create(
          [
            {
              product: prod._id,
              type: 'STOCK_ADJUSTMENT',
              changeType: 'ADD',
              quantity: mat.issuedQuantity,
              previousStock: prevStock,
              updatedStock: newStock,
              workEntry: workEntry._id,
              reason: `Reversal on Cancellation of Work Order ${workEntry.workOrderNumber}: ${cancelReason || 'Cancelled by admin'}`,
              date: new Date(),
            },
          ],
          { session: session || undefined }
        );
      }
    }

    workEntry.status = 'CANCELLED';
    workEntry.notes = workEntry.notes
      ? `${workEntry.notes} | CANCELLED: ${cancelReason || 'Cancelled by admin'}`
      : `CANCELLED: ${cancelReason || 'Cancelled by admin'}`;
    await workEntry.save({ session: session || undefined });

    if (useTx) {
      await session.commitTransaction();
      session.endSession();
    }

    return workEntry;
  } catch (err) {
    if (useTx && session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw err;
  }
};

