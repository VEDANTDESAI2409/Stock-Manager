import Product from '../models/Product.js';
import Karigar from '../models/Karigar.js';
import WorkEntry from '../models/WorkEntry.js';
import MaterialReturn from '../models/MaterialReturn.js';
import Attendance from '../models/Attendance.js';
import StockTransaction from '../models/StockTransaction.js';

/**
 * @desc    Get complete Dashboard overview statistics
 * @route   GET /api/reports/dashboard
 * @access  Private
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [allProducts, totalKarigars, todayAttendances, recentWorkEntries, recentReturns, recentActivity] =
      await Promise.all([
        Product.find({ isActive: true })
          .populate('category', 'name'),
        Karigar.countDocuments({ status: 'ACTIVE' }),
        Attendance.find({ date: today }).select('status').lean(),
        WorkEntry.find()
          .populate('karigar', 'fullName phone')
          .populate('materials.product', 'name unit')
          .sort({ workDate: -1, createdAt: -1 })
          .limit(5),
        MaterialReturn.find()
          .populate('karigar', 'fullName')
          .populate('workEntry', 'workOrderNumber customerName')
          .populate('items.product', 'name unit')
          .sort({ returnDate: -1, createdAt: -1 })
          .limit(5),
        WorkEntry.aggregate([
          { $match: { workDate: { $gte: sevenDaysAgo }, status: { $ne: 'CANCELLED' } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$workDate' } },
              workCount: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    // Product summary and category chart
    const totalProducts = allProducts.length;
    const lowStockProductsList = allProducts.filter((p) => p.currentStock <= p.minStock);
    const lowStockCount = lowStockProductsList.length;

    const presentToday = todayAttendances.filter((a) => a.status === 'PRESENT').length;
    const absentToday = todayAttendances.filter((a) => a.status === 'ABSENT').length;
    const halfDayToday = todayAttendances.filter((a) => a.status === 'HALF_DAY').length;

    const categoryAgg = {};
    allProducts.forEach((p) => {
      const catName = p.category ? p.category.name : 'Uncategorized';
      if (!categoryAgg[catName]) {
        categoryAgg[catName] = { name: catName, productCount: 0, totalStock: 0 };
      }
      categoryAgg[catName].productCount++;
      categoryAgg[catName].totalStock += p.currentStock;
    });
    const categoryStockChart = Object.values(categoryAgg);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalProducts,
          lowStockProducts: lowStockCount,
          totalKarigars,
          presentToday,
          absentToday,
          halfDayToday,
        },
        lowStockAlerts: lowStockProductsList.slice(0, 8),
        recentWorkEntries,
        recentReturns,
        categoryStockChart,
        recentActivity,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get Stock History / Audit Log Report
 * @route   GET /api/reports/stock-history
 * @access  Private
 */
export const getStockHistory = async (req, res, next) => {
  try {
    const { productId, type, startDate, endDate, page = 1, limit = 100 } = req.query;
    const query = {};

    if (productId && productId !== 'ALL') {
      query.product = productId;
    }

    if (type && type !== 'ALL') {
      query.type = type;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const total = await StockTransaction.countDocuments(query);
    const skip = (Number(page) - 1) * Number(limit);

    const transactions = await StockTransaction.find(query)
      .populate('product', 'name unit category')
      .populate('workEntry', 'workOrderNumber customerName')
      .populate('materialReturn', 'returnNumber')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      data: transactions,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Karigar-wise Material Issued & Returned History Report
 * @route   GET /api/reports/karigar-materials
 * @access  Private
 */
export const getKarigarMaterialReport = async (req, res, next) => {
  try {
    const { karigarId, startDate, endDate } = req.query;
    const workQuery = { status: { $ne: 'CANCELLED' } };

    if (karigarId && karigarId !== 'ALL') {
      workQuery.karigar = karigarId;
    }

    if (startDate || endDate) {
      workQuery.workDate = {};
      if (startDate) workQuery.workDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        workQuery.workDate.$lte = end;
      }
    }

    const entries = await WorkEntry.find(workQuery)
      .populate('karigar', 'fullName phone status')
      .populate('materials.product', 'name unit')
      .sort({ workDate: -1 });

    // Aggregate by Karigar & Product
    const summary = {};
    entries.forEach((w) => {
      const kId = w.karigar ? w.karigar._id.toString() : 'Unknown';
      const kName = w.karigar ? w.karigar.fullName : 'Unknown';

      if (!summary[kId]) {
        summary[kId] = {
          karigarId: kId,
          karigarName: kName,
          phone: w.karigar ? w.karigar.phone : '',
          totalWorks: 0,
          materials: {},
        };
      }

      summary[kId].totalWorks++;

      w.materials.forEach((m) => {
        const prodName = m.productNameSnapshot || (m.product && m.product.name) || 'Product';
        const unit = m.unitSnapshot || (m.product && m.product.unit) || 'Piece';
        const key = `${prodName} (${unit})`;

        if (!summary[kId].materials[key]) {
          summary[kId].materials[key] = {
            productName: prodName,
            unit,
            issued: 0,
            returned: 0,
            pending: 0,
          };
        }

        summary[kId].materials[key].issued += m.issuedQuantity;
        summary[kId].materials[key].returned += m.returnedQuantity || 0;
        summary[kId].materials[key].pending = Math.max(
          0,
          summary[kId].materials[key].issued - summary[kId].materials[key].returned
        );
      });
    });

    const formatted = Object.values(summary).map((item) => ({
      ...item,
      materialList: Object.values(item.materials),
    }));

    res.status(200).json({
      success: true,
      data: formatted,
      entries,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Customer-wise Work History Report
 * @route   GET /api/reports/customer-work
 * @access  Private
 */
export const getCustomerWorkReport = async (req, res, next) => {
  try {
    const { search, startDate, endDate } = req.query;
    const query = {};

    if (search && search.trim() !== '') {
      query.$or = [
        { customerName: { $regex: search.trim(), $options: 'i' } },
        { customerAddress: { $regex: search.trim(), $options: 'i' } },
        { workOrderNumber: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      query.workDate = {};
      if (startDate) query.workDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.workDate.$lte = end;
      }
    }

    const records = await WorkEntry.find(query)
      .populate('karigar', 'fullName phone')
      .populate('materials.product', 'name unit')
      .sort({ workDate: -1 });

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (err) {
    next(err);
  }
};

