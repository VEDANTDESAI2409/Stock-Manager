import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Karigar from '../models/Karigar.js';
import WorkEntry from '../models/WorkEntry.js';
import MaterialReturn from '../models/MaterialReturn.js';
import StockTransaction from '../models/StockTransaction.js';
import {
  issueMaterialsForWork,
  recordMaterialReturn,
  cancelWorkEntry,
} from '../services/stockService.js';
import {
  getWorkEntries,
  getWorkEntryById,
  createWorkEntry,
  addPhotosToWorkEntry,
  deleteWorkPhoto,
} from '../controllers/workEntryController.js';
import { getKarigars, getKarigarById } from '../controllers/karigarController.js';
import { getKarigarMaterialReport } from '../controllers/reportController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const callController = async (controller, req) => {
  let statusCode = 200;
  let response;
  await controller(
    req,
    {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        response = body;
        return this;
      },
    },
    (err) => {
      throw err;
    }
  );
  return { statusCode, response };
};

const runSuite = async () => {
  console.log('====================================================');
  console.log('🧪 RUNNING WORK ENTRY SYSTEM UPGRADE TEST SUITE');
  console.log('====================================================\n');

  // Start in-memory replica set for safe, isolated test execution
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  await mongoose.connect(replSet.getUri());
  console.log('✅ Connected to isolated in-memory test database');

  try {
    // Setup test base data
    const cat = await Category.create({ name: 'CCTV Cameras', description: 'Surveillance cameras' });
    const prod1 = await Product.create({
      name: '2MP Dome Camera',
      category: cat._id,
      unit: 'Piece',
      currentStock: 50,
      minStock: 10,
    });
    const prod2 = await Product.create({
      name: 'Cat6 Cable Roll',
      category: cat._id,
      unit: 'Roll',
      currentStock: 20,
      minStock: 5,
    });
    const prod3 = await Product.create({
      name: '8-Channel DVR',
      category: cat._id,
      unit: 'Piece',
      currentStock: 15,
      minStock: 3,
    });

    const karigar1 = await Karigar.create({ fullName: 'Ramesh Patel', phone: '9876543210', status: 'ACTIVE' });
    const karigar2 = await Karigar.create({ fullName: 'Suresh Kumar', phone: '9876543211', status: 'ACTIVE' });
    const karigar3 = await Karigar.create({ fullName: 'Mahesh Sharma', phone: '9876543212', status: 'ACTIVE' });
    const inactiveKarigar = await Karigar.create({ fullName: 'Inactive Tech', phone: '9876543213', status: 'INACTIVE' });

    console.log('\n--- SCENARIO 1: Create Work Entry with One Karigar (Backwards Compatible) ---');
    const entry1 = await issueMaterialsForWork({
      workOrderNumber: 'WO-20261119-0001',
      workDate: new Date(),
      karigar: karigar1._id,
      customerName: 'Hotel Sun City',
      customerPhone: '9825100001',
      customerAddress: 'Ring Road, Surat',
      notes: 'Lobby installation',
      materials: [{ product: prod1._id, issuedQuantity: 4 }],
    });
    assert(entry1 !== null, 'Work entry created with single karigar');
    assert(entry1.karigar._id.toString() === karigar1._id.toString(), 'Primary karigar matches');
    assert(entry1.karigars.length === 1, 'Karigars array populated with 1 technician');
    assert(entry1.karigars[0]._id.toString() === karigar1._id.toString(), 'Karigars[0] matches');

    // Verify stock deduction
    const prod1Check = await Product.findById(prod1._id);
    assert(prod1Check.currentStock === 46, 'Stock deducted correctly (50 - 4 = 46)');

    console.log('\n--- SCENARIO 2: Create Work Entry with Two Karigars ---');
    const entry2 = await issueMaterialsForWork({
      workOrderNumber: 'WO-20261119-0002',
      workDate: new Date(),
      karigars: [karigar1._id, karigar2._id],
      customerName: 'Diamond Mills Ltd',
      customerPhone: '9825100002',
      customerAddress: 'GIDC Pandesara',
      notes: 'Perimeter cabling and cameras',
      materials: [
        { product: prod1._id, issuedQuantity: 6 },
        { product: prod2._id, issuedQuantity: 2 },
      ],
    });
    assert(entry2.karigars.length === 2, 'Work entry has 2 assigned karigars');
    assert(entry2.karigar._id.toString() === karigar1._id.toString(), 'Legacy karigar set to first technician');
    const prod1AfterEntry2 = await Product.findById(prod1._id);
    const prod2AfterEntry2 = await Product.findById(prod2._id);
    assert(prod1AfterEntry2.currentStock === 40, 'Stock deducted only once despite 2 karigars (46 - 6 = 40)');
    assert(prod2AfterEntry2.currentStock === 18, 'Second product stock deducted (20 - 2 = 18)');

    console.log('\n--- SCENARIO 3: Create Work Entry with Three or More Karigars ---');
    const entry3 = await issueMaterialsForWork({
      workOrderNumber: 'WO-20261119-0003',
      workDate: new Date(),
      karigars: [karigar1._id, karigar2._id, karigar3._id],
      customerName: 'Mega Warehouse',
      customerPhone: '9825100003',
      customerAddress: 'Kamrej Highway',
      notes: 'Full complex setup',
      materials: [{ product: prod3._id, issuedQuantity: 2 }],
    });
    assert(entry3.karigars.length === 3, 'Work entry has 3 assigned karigars');
    const prod3AfterEntry3 = await Product.findById(prod3._id);
    assert(prod3AfterEntry3.currentStock === 13, 'Product 3 stock deducted only once (15 - 2 = 13)');

    console.log('\n--- SCENARIO 4: Attempt to Select the Same Karigar Twice ---');
    let duplicateRejected = false;
    try {
      await callController(createWorkEntry, {
        body: {
          workDate: new Date().toISOString(),
          karigars: [karigar1._id.toString(), karigar1._id.toString()],
          customerName: 'Duplicate Test Customer',
          customerAddress: 'Surat',
          materials: [{ product: prod1._id.toString(), issuedQuantity: 1 }],
        },
      });
    } catch (err) {
      // or error status
    }
    const dupRes = await (async () => {
      let code = 200;
      let body = {};
      await createWorkEntry(
        {
          body: {
            workDate: new Date().toISOString(),
            karigars: [karigar1._id.toString(), karigar1._id.toString()],
            customerName: 'Duplicate Test Customer',
            customerAddress: 'Surat',
            materials: [{ product: prod1._id.toString(), issuedQuantity: 1 }],
          },
        },
        {
          status(c) {
            code = c;
            return this;
          },
          json(b) {
            body = b;
            return this;
          },
        },
        () => {}
      );
      return { code, body };
    })();
    assert(dupRes.code === 400, 'Duplicate karigar selection rejected with HTTP 400');
    assert(dupRes.body.message.includes('Duplicate technician'), 'Error message warns about duplicate technician');

    console.log('\n--- SCENARIO 5 & 6: Inactive Karigar Rejection & Single Stock Deduction ---');
    const inactiveRes = await (async () => {
      let code = 200;
      let body = {};
      await createWorkEntry(
        {
          body: {
            workDate: new Date().toISOString(),
            karigars: [karigar1._id.toString(), inactiveKarigar._id.toString()],
            customerName: 'Inactive Test Customer',
            customerAddress: 'Surat',
            materials: [{ product: prod1._id.toString(), issuedQuantity: 1 }],
          },
        },
        {
          status(c) {
            code = c;
            return this;
          },
          json(b) {
            body = b;
            return this;
          },
        },
        () => {}
      );
      return { code, body };
    })();
    assert(inactiveRes.code === 400, 'Inactive karigar assignment rejected with HTTP 400');

    // Verify stock transactions count for entry2 (2 products = 2 transactions, not 2 * 2 = 4)
    const txCount = await StockTransaction.countDocuments({ workEntry: entry2._id });
    assert(txCount === 2, `Exactly 2 stock transactions created for 2 products on multi-karigar order (found: ${txCount})`);

    console.log('\n--- SCENARIO 7 & 8: Work Entry Photo Attachments & Retrieval ---');
    const samplePhotos = [
      {
        url: '/uploads/work-entries/photo-test-1.jpg',
        filename: 'photo-test-1.jpg',
        originalName: 'front_gate_camera.jpg',
        size: 245000,
        mimeType: 'image/jpeg',
      },
      {
        url: '/uploads/work-entries/photo-test-2.png',
        filename: 'photo-test-2.png',
        originalName: 'dvr_rack.png',
        size: 512000,
        mimeType: 'image/png',
      },
    ];

    const entryWithPhotos = await issueMaterialsForWork({
      workOrderNumber: 'WO-20261119-0004',
      workDate: new Date(),
      karigars: [karigar2._id],
      customerName: 'Apex Towers',
      customerPhone: '9825100004',
      customerAddress: 'Varachha, Surat',
      materials: [{ product: prod1._id, issuedQuantity: 2 }],
      photos: samplePhotos,
    });
    assert(entryWithPhotos.photos.length === 2, 'Work entry created with 2 photos');
    assert(entryWithPhotos.photos[0].originalName === 'front_gate_camera.jpg', 'Photo 1 original name preserved');
    assert(entryWithPhotos.photos[1].mimeType === 'image/png', 'Photo 2 mime type preserved');

    // Retrieve via controller getWorkEntryById
    const detailRes = await callController(getWorkEntryById, { params: { id: entryWithPhotos._id.toString() } });
    assert(detailRes.statusCode === 200, 'getWorkEntryById returns HTTP 200');
    assert(detailRes.response.data.workEntry.photos.length === 2, 'Retrieved work entry contains 2 photos');
    assert(detailRes.response.data.workEntry.karigars.length === 1, 'Retrieved work entry contains karigars array');

    console.log('\n--- SCENARIO 9: Add Photos to an Existing Work Entry ---');
    const addPhotosReq = {
      params: { id: entryWithPhotos._id.toString() },
      files: [
        {
          filename: 'photo-test-3.webp',
          originalname: 'completed_installation.webp',
          size: 180000,
          mimetype: 'image/webp',
        },
      ],
    };
    const addPhotoRes = await callController(addPhotosToWorkEntry, addPhotosReq);
    assert(addPhotoRes.statusCode === 200, 'addPhotosToWorkEntry returns HTTP 200');
    assert(addPhotoRes.response.data.photos.length === 3, 'Photo count increased to 3');
    const addedPhoto = addPhotoRes.response.data.photos[2];
    assert(addedPhoto.originalName === 'completed_installation.webp', 'New photo metadata saved');

    console.log('\n--- SCENARIO 10: Delete Photo from Work Entry ---');
    const photoIdToDelete = addedPhoto._id.toString();
    const deletePhotoReq = {
      params: {
        id: entryWithPhotos._id.toString(),
        photoId: photoIdToDelete,
      },
    };
    const deletePhotoRes = await callController(deleteWorkPhoto, deletePhotoReq);
    assert(deletePhotoRes.statusCode === 200, 'deleteWorkPhoto returns HTTP 200');
    assert(deletePhotoRes.response.data.photos.length === 2, 'Photo removed, count back to 2');
    const entryAfterPhotoDelete = await WorkEntry.findById(entryWithPhotos._id);
    assert(entryAfterPhotoDelete !== null, 'Work entry document remains intact after photo deletion');
    assert(entryAfterPhotoDelete.customerName === 'Apex Towers', 'Work entry data preserved');

    console.log('\n--- SCENARIO 11: Karigar-wise Work History & Stats for Multi-Karigar Jobs ---');
    // Karigar 1 was assigned to entry1, entry2, entry3 -> total 3 entries
    // Karigar 2 was assigned to entry2, entry3, entryWithPhotos -> total 3 entries
    // Karigar 3 was assigned to entry3 -> total 1 entry
    const karigarsListRes = await callController(getKarigars, { query: {} });
    assert(karigarsListRes.statusCode === 200, 'getKarigars returns HTTP 200');
    const k1Data = karigarsListRes.response.data.find((k) => k._id.toString() === karigar1._id.toString());
    const k2Data = karigarsListRes.response.data.find((k) => k._id.toString() === karigar2._id.toString());
    const k3Data = karigarsListRes.response.data.find((k) => k._id.toString() === karigar3._id.toString());

    assert(k1Data.totalWorkEntries === 3, `Karigar 1 total work entries is 3 (got: ${k1Data.totalWorkEntries})`);
    assert(k2Data.totalWorkEntries === 3, `Karigar 2 total work entries is 3 (got: ${k2Data.totalWorkEntries})`);
    assert(k3Data.totalWorkEntries === 1, `Karigar 3 total work entries is 1 (got: ${k3Data.totalWorkEntries})`);

    // Check Karigar Detail history for Karigar 2
    const k2DetailRes = await callController(getKarigarById, { params: { id: karigar2._id.toString() } });
    assert(k2DetailRes.statusCode === 200, 'getKarigarById returns HTTP 200');
    assert(k2DetailRes.response.data.workEntries.length === 3, 'Karigar 2 detail history has all 3 jobs');

    console.log('\n--- SCENARIO 12: Material Return on Multi-Karigar Work Entry ---');
    // Return 1 camera from entry2
    const returnRes = await recordMaterialReturn({
      returnNumber: 'RET-20261119-0001',
      workEntryId: entry2._id,
      karigarId: karigar2._id,
      returnDate: new Date(),
      notes: 'Unused spare camera',
      items: [{ product: prod1._id, returnedQuantity: 1 }],
    });
    assert(returnRes !== null, 'Material return processed against multi-karigar work entry');
    const prod1AfterReturn = await Product.findById(prod1._id);
    assert(prod1AfterReturn.currentStock === 39, `Stock increased by 1 on return (was 38, now ${prod1AfterReturn.currentStock})`);

    console.log('\n--- SCENARIO 13: Karigar Material Report for Multi-Karigar Jobs ---');
    const reportRes = await callController(getKarigarMaterialReport, { query: { karigarId: karigar1._id.toString() } });
    assert(reportRes.statusCode === 200, 'getKarigarMaterialReport returns HTTP 200');
    assert(reportRes.response.data.length > 0, 'Report contains summary for Karigar 1');

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('====================================================\n');
  } finally {
    await mongoose.disconnect();
    await replSet.stop();
  }
};

runSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
