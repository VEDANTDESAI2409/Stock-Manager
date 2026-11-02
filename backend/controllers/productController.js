import Product from '../models/Product.js';
import StockTransaction from '../models/StockTransaction.js';
import WorkEntry from '../models/WorkEntry.js';
import {
  recordStockIn,
  recordStockOut,
  recordStockAdjustment,
} from '../services/stockService.js';

/**
 * @desc    Get all products with filtering, searching, and low stock flags
 * @route   GET /api/products
 * @access  Private
 */
export const getProducts = async (req, res, next) => {
  try {
    const { search, category, lowStock, page = 1, limit = 50, all } = req.query;

    const query = { isActive: true };

    if (category && category !== 'ALL') {
      query.category = category;
    }

    if (search && search.trim() !== '') {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    if (lowStock === 'true' || lowStock === true) {
      query.$expr = { $lte: ['$currentStock', '$minStock'] };
    }

    const totalPromise = all === 'true' ? Promise.resolve(null) : Product.countDocuments(query);
    let productsQuery = Product.find(query)
      .populate('category', 'name')
      .sort({ name: 1 });

    if (all !== 'true') {
      const skip = (Number(page) - 1) * Number(limit);
      productsQuery = productsQuery.skip(skip).limit(Number(limit));
    }

    const [products, totalResult] = await Promise.all([productsQuery, totalPromise]);
    const total = totalResult ?? products.length;

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      data: products,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single product by ID with transaction history
 * @route   GET /api/products/:id
 * @access  Private
 */
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Get recent transactions for this product
    const transactions = await StockTransaction.find({ product: product._id })
      .populate('workEntry', 'workOrderNumber customerName')
      .populate('materialReturn', 'returnNumber')
      .sort({ date: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: {
        product,
        transactions,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Private
 */
export const createProduct = async (req, res, next) => {
  try {
    const { name, modelNumber, category, unit, initialStock = 0, minStock = 5, description } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: 'Product name and category are required.',
      });
    }

    const initStockNum = Math.max(0, Number(initialStock) || 0);
    const minStockNum = Math.max(0, Number(minStock) || 0);

    const product = await Product.create({
      name: name.trim(),
      modelNumber,
      category,
      unit: unit || 'Piece',
      currentStock: initStockNum,
      minStock: minStockNum,
      description: description ? description.trim() : '',
    });

    // Record initial stock transaction if stock > 0
    if (initStockNum > 0) {
      await StockTransaction.create({
        product: product._id,
        type: 'STOCK_IN',
        changeType: 'ADD',
        quantity: initStockNum,
        previousStock: 0,
        updatedStock: initStockNum,
        reason: 'Initial Opening Stock Entry',
        date: new Date(),
      });
    }

    const populated = await Product.findById(product._id).populate('category', 'name');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update product metadata (Name, Model Number, Category, Unit, Min Stock, Description)
 * @route   PUT /api/products/:id
 * @access  Private
 */
export const updateProduct = async (req, res, next) => {
  try {
    const { name, modelNumber, category, unit, minStock, description } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (name) product.name = name.trim();
    if (modelNumber !== undefined) product.modelNumber = modelNumber;
    if (category) product.category = category;
    if (unit) product.unit = unit;
    if (minStock !== undefined) product.minStock = Math.max(0, Number(minStock) || 0);
    if (description !== undefined) product.description = description.trim();

    await product.save();

    const populated = await Product.findById(product._id).populate('category', 'name');

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete Product with safeguards
 * @route   DELETE /api/products/:id
 * @access  Private
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Safeguard 1: Current stock must be 0
    if (product.currentStock > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete "${product.name}" because it still has ${product.currentStock} ${product.unit} in stock. Adjust or issue stock to 0 before deleting.`,
      });
    }

    // Safeguard 2: Check if referenced in active work entries
    const activeWork = await WorkEntry.findOne({
      'materials.product': product._id,
      status: 'ACTIVE',
    });

    if (activeWork) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete product. It is referenced in active work order "${activeWork.workOrderNumber}".`,
      });
    }

    // Soft delete to protect historical integrity
    product.isActive = false;
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product removed successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Stock In (Receiving new products)
 * @route   POST /api/products/stock-in
 * @access  Private
 */
export const stockIn = async (req, res, next) => {
  try {
    const { productId, quantity, notes, date } = req.body;
    const result = await recordStockIn({ productId, quantity, notes, date });

    res.status(200).json({
      success: true,
      message: `Successfully added ${quantity} to ${result.product.name} stock.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Manual Stock Out
 * @route   POST /api/products/stock-out
 * @access  Private
 */
export const stockOut = async (req, res, next) => {
  try {
    const { productId, quantity, reason, date } = req.body;
    const result = await recordStockOut({ productId, quantity, reason, date });

    res.status(200).json({
      success: true,
      message: `Successfully removed ${quantity} from ${result.product.name} stock.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Controlled Stock Adjustment
 * @route   POST /api/products/stock-adjust
 * @access  Private
 */
export const stockAdjustment = async (req, res, next) => {
  try {
    const { productId, newQuantity, reason, date } = req.body;
    const result = await recordStockAdjustment({ productId, newQuantity, reason, date });

    res.status(200).json({
      success: true,
      message: `Stock for ${result.product.name} successfully adjusted to ${newQuantity}.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
