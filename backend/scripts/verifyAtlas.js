import mongoose from 'mongoose';
import connectDB, { getConnectionDetails, supportsTransactions, ensureCollections } from '../config/db.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Karigar from '../models/Karigar.js';
import WorkEntry from '../models/WorkEntry.js';
import MaterialReturn from '../models/MaterialReturn.js';
import Attendance from '../models/Attendance.js';
import {
  issueMaterialsForWork,
  recordMaterialReturn,
} from '../services/stockService.js';

const runVerification = async () => {
  console.log('========================================================');
  console.log(' STARTING MONGODB ATLAS INTEGRATION VERIFICATION');
  console.log('========================================================\n');

  try {
    // 1. Connect
    console.log('[STEP 1] Testing Connection...');
    await connectDB();
    await ensureCollections();

    const details = getConnectionDetails();
    console.log(`- Connected to: ${details.connectionType}`);
    console.log(`- Database Host: ${details.host}`);
    console.log(`- Database Name: ${details.dbName}`);

    if (details.connectionType !== 'MongoDB Atlas') {
      throw new Error(`Expected connection to MongoDB Atlas, but connected to: ${details.connectionType}`);
    }
    console.log('✔ STEP 1 PASSED: Successfully connected to MongoDB Atlas (No in-memory fallback).');

    // 2. Verify Transaction Support
    console.log('\n[STEP 2] Verifying Replica Set & Multi-Document Transaction Support...');
    const session = await mongoose.startSession();
    session.startTransaction();

    let testCat = await Category.findOne({ name: 'CCTV Camera' }).session(session);
    if (!testCat) {
      testCat = (await Category.create([{ name: 'CCTV Camera', description: 'Surveillance Cameras' }], { session }))[0];
    }
    await session.commitTransaction();
    session.endSession();

    console.log('✔ STEP 2 PASSED: MongoDB Atlas Session Transactions are fully functional.');

    // 3. Create a unique test product in MongoDB Atlas
    console.log('\n[STEP 3] Creating Test Product in MongoDB Atlas...');
    const uniqueSku = `TEST-CAM-${Date.now().toString().slice(-6)}`;
    const testProductName = `Atlas Verification 4K IP Camera (${uniqueSku})`;

    const createdProduct = await Product.create({
      name: testProductName,
      category: testCat._id,
      unit: 'Piece',
      currentStock: 10,
      minStock: 2,
      description: 'MongoDB Atlas integration test item',
    });

    console.log(`- Product Created with ID: ${createdProduct._id}`);
    console.log(`- Product Name: ${createdProduct.name}`);
    console.log(`- Current Stock: ${createdProduct.currentStock} ${createdProduct.unit}`);

    // Verify it exists in Atlas
    const fetchedProduct = await Product.findById(createdProduct._id);
    if (!fetchedProduct || fetchedProduct.name !== testProductName) {
      throw new Error('Test product could not be verified in MongoDB Atlas.');
    }
    console.log('✔ STEP 3 PASSED: Product confirmed saved in MongoDB Atlas.');

    // 4. Test Stock Issue & Atomic Deduction
    console.log('\n[STEP 4] Testing Stock Issue & Transactional Deduction on Atlas...');
    let technician = await Karigar.findOne({ status: 'ACTIVE' });
    if (!technician) {
      technician = await Karigar.create({
        fullName: 'Atlas Test Karigar',
        phone: '9900011223',
        status: 'ACTIVE',
      });
    }

    const workOrderNumber = `WO-ATLAS-${Date.now().toString().slice(-4)}`;
    const workEntry = await issueMaterialsForWork({
      workOrderNumber,
      workDate: new Date(),
      karigar: technician._id,
      customerName: 'Atlas Verification Customer',
      customerAddress: 'Surat City Complex',
      notes: 'Atlas stock deduction test',
      materials: [{ product: fetchedProduct._id, issuedQuantity: 4 }],
    });

    const postIssueProduct = await Product.findById(fetchedProduct._id);
    console.log(`- Initial Stock: 10 Piece`);
    console.log(`- Issued to Technician: 4 Piece`);
    console.log(`- Stock After Issue: ${postIssueProduct.currentStock} Piece`);

    if (postIssueProduct.currentStock !== 6) {
      throw new Error(`Expected stock to be 6, but got ${postIssueProduct.currentStock}`);
    }
    console.log('✔ STEP 4 PASSED: Stock issue and atomic deduction verified on Atlas.');

    // 5. Test Material Return & Stock Restoration
    console.log('\n[STEP 5] Testing Material Return & Stock Restoration on Atlas...');
    const returnNumber = `RET-ATLAS-${Date.now().toString().slice(-4)}`;
    const returnRecord = await recordMaterialReturn({
      returnNumber,
      workEntryId: workEntry._id,
      karigarId: technician._id,
      returnDate: new Date(),
      notes: 'Atlas return test - returning 1 unused piece',
      items: [{ product: fetchedProduct._id, returnedQuantity: 1 }],
    });

    const postReturnProduct = await Product.findById(fetchedProduct._id);
    console.log(`- Returned to Stock: 1 Piece`);
    console.log(`- Stock After Return: ${postReturnProduct.currentStock} Piece`);

    if (postReturnProduct.currentStock !== 7) {
      throw new Error(`Expected stock to be 7, but got ${postReturnProduct.currentStock}`);
    }
    console.log('✔ STEP 5 PASSED: Material return and stock restoration verified on Atlas.');

    // 6. Test Daily Attendance Persistence
    console.log('\n[STEP 6] Testing Daily Attendance Persistence on Atlas...');
    const testDate = '2026-10-31';
    await Attendance.findOneAndUpdate(
      { karigar: technician._id, date: testDate },
      { status: 'PRESENT', notes: 'Atlas verified attendance' },
      { upsert: true, new: true }
    );

    const attRecord = await Attendance.findOne({ karigar: technician._id, date: testDate });
    if (!attRecord || attRecord.status !== 'PRESENT') {
      throw new Error('Attendance record failed to persist on Atlas.');
    }
    console.log(`- Attendance for ${technician.fullName} on ${testDate}: ${attRecord.status}`);
    console.log('✔ STEP 6 PASSED: Attendance record verified on Atlas.');

    // 7. Verify Data Persists Across Disconnect & Reconnect
    console.log('\n[STEP 7] Simulating Server Restart (Disconnect & Reconnect to Atlas)...');
    await mongoose.disconnect();
    console.log('- Disconnected from MongoDB Atlas.');

    // Reconnect
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('- Reconnected to MongoDB Atlas.');

    const persistentProduct = await Product.findById(fetchedProduct._id);
    const persistentWork = await WorkEntry.findById(workEntry._id);
    const persistentReturn = await MaterialReturn.findById(returnRecord._id);
    const persistentAtt = await Attendance.findById(attRecord._id);

    if (!persistentProduct) throw new Error('Product not found after reconnect!');
    if (!persistentWork) throw new Error('Work Entry not found after reconnect!');
    if (!persistentReturn) throw new Error('Material Return not found after reconnect!');
    if (!persistentAtt) throw new Error('Attendance record not found after reconnect!');

    console.log(`✔ STEP 7 PASSED: Complete data persistence confirmed on Atlas across restart!`);
    console.log(`  - Product "${persistentProduct.name}" exists with stock: ${persistentProduct.currentStock}`);
    console.log(`  - Work Order "${persistentWork.workOrderNumber}" exists`);
    console.log(`  - Return "${persistentReturn.returnNumber}" exists`);
    console.log(`  - Attendance Record exists`);

    console.log('\n========================================================');
    console.log(' ALL ATLAS TESTS COMPLETED WITH 100% SUCCESS!');
    console.log('========================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Atlas Verification Failed:', err.message);
    process.exit(1);
  }
};

runVerification();
