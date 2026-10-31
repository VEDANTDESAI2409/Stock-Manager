import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Admin from '../models/Admin.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Karigar from '../models/Karigar.js';
import WorkEntry from '../models/WorkEntry.js';
import MaterialReturn from '../models/MaterialReturn.js';
import Attendance from '../models/Attendance.js';
import StockTransaction from '../models/StockTransaction.js';
import {
  recordStockIn,
  recordStockOut,
  recordStockAdjustment,
  issueMaterialsForWork,
  recordMaterialReturn,
  cancelWorkEntry,
} from '../services/stockService.js';

let passedTests = 0;
let totalTests = 0;

const assert = (condition, testName) => {
  totalTests++;
  if (condition) {
    console.log(`  PASSED: ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ FAILED: ${testName}`);
    throw new Error(`Assertion failed for: ${testName}`);
  }
};

const runAllTests = async () => {
  console.log('====================================================');
  console.log(' STARTING STOCK MANAGER AUTOMATED INTEGRATION TESTS');
  console.log('====================================================\n');

  try {
    await connectDB();

    // Ensure database has admin and test products if running in clean in-memory instance
    let admin = await Admin.findOne({ email: 'admin@stockmanager.com' }).select('+password');
    if (!admin) {
      console.log('Seeding initial test records for in-memory instance...');
      admin = await Admin.create({
        name: 'Stock Administrator',
        email: 'admin@stockmanager.com',
        password: 'Admin@123456',
      });
      let testKarigar = await Karigar.findOne({ fullName: 'Rahul Sharma' });
      if (!testKarigar) {
        await Karigar.create({
          fullName: 'Rahul Sharma',
          phone: '9876543211',
          status: 'ACTIVE',
        });
      }
      let testProd = await Product.findOne({ name: '2MP HD Dome Camera (IR 20m)' });
      if (!testProd) {
        let cat = await Category.findOne({ name: 'CCTV Camera' });
        if (!cat) {
          cat = await Category.create({ name: 'CCTV Camera' });
        }
        await Product.create({
          name: '2MP HD Dome Camera (IR 20m)',
          category: cat._id,
          unit: 'Piece',
          currentStock: 25,
          minStock: 5,
        });
      }
    }

    // TEST 1: Admin credentials validation
    console.log('--- TEST GROUP 1: AUTHENTICATION & SECURITY ---');
    admin = await Admin.findOne({ email: 'admin@stockmanager.com' }).select('+password');
    assert(admin !== null, 'Admin account exists in database');

    const validPass = await admin.comparePassword('Admin@123456');
    assert(validPass === true, 'Admin password matches bcrypt hash');

    const invalidPass = await admin.comparePassword('WrongPassword123');
    assert(invalidPass === false, 'Invalid password correctly rejected');

    // TEST 2: Stock In Operation
    console.log('\n--- TEST GROUP 2: INVENTORY & STOCK OPERATIONS ---');
    let testProduct = await Product.findOne({ name: '2MP HD Dome Camera (IR 20m)' });
    assert(testProduct !== null, 'Found target test product');

    const stockBeforeIn = testProduct.currentStock;
    await recordStockIn({ productId: testProduct._id, quantity: 10, notes: 'Automated Test Stock In' });
    testProduct = await Product.findById(testProduct._id);
    assert(testProduct.currentStock === stockBeforeIn + 10, 'Stock In adds exact quantity to currentStock');

    const stockInTx = await StockTransaction.findOne({ product: testProduct._id, type: 'STOCK_IN' }).sort({ createdAt: -1 });
    assert(stockInTx && stockInTx.quantity === 10, 'StockTransaction properly records STOCK_IN with audit trail');

    // TEST 3: Stock Out & Negative Stock Prevention
    const stockBeforeOut = testProduct.currentStock;
    await recordStockOut({ productId: testProduct._id, quantity: 5, reason: 'Damaged during transit' });
    testProduct = await Product.findById(testProduct._id);
    assert(testProduct.currentStock === stockBeforeOut - 5, 'Manual Stock Out deducts exact quantity');

    let preventedNegative = false;
    try {
      await recordStockOut({ productId: testProduct._id, quantity: 999999, reason: 'Exceeding inventory' });
    } catch (e) {
      preventedNegative = true;
    }
    assert(preventedNegative === true, 'STRICT RULE: Negative stock is strictly prevented on Stock Out');

    // TEST 4: Controlled Stock Adjustment
    const adjustmentQty = testProduct.currentStock + 3;
    await recordStockAdjustment({
      productId: testProduct._id,
      newQuantity: adjustmentQty,
      reason: 'Physical inventory audit correction',
    });
    testProduct = await Product.findById(testProduct._id);
    assert(testProduct.currentStock === adjustmentQty, 'Controlled Stock Adjustment correctly updates stock');

    // TEST 5: Work Entry & Material Issue
    console.log('\n--- TEST GROUP 3: WORK ENTRY & MATERIAL ISSUE ---');
    const activeKarigar = await Karigar.findOne({ status: 'ACTIVE' });
    assert(activeKarigar !== null, 'Found active technician for test');

    const stockBeforeWork = testProduct.currentStock;
    const workOrderNumber = `WO-TEST-${Date.now().toString().slice(-4)}`;

    const newWork = await issueMaterialsForWork({
      workOrderNumber,
      workDate: new Date(),
      karigar: activeKarigar._id,
      customerName: 'Test Tech Hub Office',
      customerPhone: '9988776655',
      customerAddress: 'Ring Road, Surat',
      notes: 'Automated Work Order Test',
      materials: [{ product: testProduct._id, issuedQuantity: 4 }],
    });

    testProduct = await Product.findById(testProduct._id);
    assert(newWork !== null, 'Work Order created successfully');
    assert(testProduct.currentStock === stockBeforeWork - 4, 'Stock automatically deducted on material issue');

    // Verify cannot issue more than available
    let preventedExcessIssue = false;
    try {
      await issueMaterialsForWork({
        workOrderNumber: `${workOrderNumber}-FAIL`,
        workDate: new Date(),
        karigar: activeKarigar._id,
        customerName: 'Test Excess Order',
        customerAddress: 'Surat',
        materials: [{ product: testProduct._id, issuedQuantity: 999999 }],
      });
    } catch {
      preventedExcessIssue = true;
    }
    assert(preventedExcessIssue === true, 'Insufficient stock prevents creating work entry');

    // TEST 6: Material Return & Return Validation
    console.log('\n--- TEST GROUP 4: MATERIAL RETURN & SAFEGUARDS ---');
    const returnNumber = `RET-TEST-${Date.now().toString().slice(-4)}`;
    const stockBeforeReturn = testProduct.currentStock;

    // Try returning more than issued (should fail)
    let preventedExcessReturn = false;
    try {
      await recordMaterialReturn({
        returnNumber: `${returnNumber}-FAIL`,
        workEntryId: newWork._id,
        karigarId: activeKarigar._id,
        items: [{ product: testProduct._id, returnedQuantity: 10 }], // only 4 issued
      });
    } catch {
      preventedExcessReturn = true;
    }
    assert(preventedExcessReturn === true, 'Cannot return quantity greater than remaining issued quantity');

    // Return valid partial quantity (2 out of 4)
    const validReturn = await recordMaterialReturn({
      returnNumber,
      workEntryId: newWork._id,
      karigarId: activeKarigar._id,
      returnDate: new Date(),
      notes: 'Customer needed fewer cameras',
      items: [{ product: testProduct._id, returnedQuantity: 2 }],
    });

    assert(validReturn !== null, 'Material Return logged successfully');
    testProduct = await Product.findById(testProduct._id);
    assert(testProduct.currentStock === stockBeforeReturn + 2, 'Stock automatically incremented on material return');

    const updatedWork = await WorkEntry.findById(newWork._id);
    assert(updatedWork.materials[0].returnedQuantity === 2, 'Work entry returnedQuantity updated to 2');

    // TEST 7: Daily Attendance & Unique Date Check
    console.log('\n--- TEST GROUP 5: ATTENDANCE RULES ---');
    const testDate = '2026-11-01';
    await Attendance.findOneAndUpdate(
      { karigar: activeKarigar._id, date: testDate },
      { status: 'PRESENT', notes: 'Automated test attendance' },
      { upsert: true, new: true }
    );

    const att1 = await Attendance.findOne({ karigar: activeKarigar._id, date: testDate });
    assert(att1 && att1.status === 'PRESENT', 'Attendance successfully marked as PRESENT');

    // Update to HALF_DAY
    await Attendance.findOneAndUpdate(
      { karigar: activeKarigar._id, date: testDate },
      { status: 'HALF_DAY', notes: 'Updated to half day' },
      { upsert: true, new: true }
    );

    const attCount = await Attendance.countDocuments({ karigar: activeKarigar._id, date: testDate });
    assert(attCount === 1, 'Only one attendance record allowed per Karigar per date (no duplicates)');

    const att2 = await Attendance.findOne({ karigar: activeKarigar._id, date: testDate });
    assert(att2.status === 'HALF_DAY', 'Attendance successfully updated without duplication');

    // Clean up test records
    await Attendance.deleteOne({ _id: att1._id });
    await MaterialReturn.deleteOne({ _id: validReturn._id });
    await WorkEntry.deleteOne({ _id: newWork._id });

    console.log('\n====================================================');
    console.log(` ALL TESTS PASSED: ${passedTests}/${totalTests} tests succeeded.`);
    console.log('====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test suite failed:', err);
    process.exit(1);
  }
};

runAllTests();
