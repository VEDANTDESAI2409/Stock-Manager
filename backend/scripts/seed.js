import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Admin from '../models/Admin.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Karigar from '../models/Karigar.js';
import WorkEntry from '../models/WorkEntry.js';
import MaterialReturn from '../models/MaterialReturn.js';
import Attendance from '../models/Attendance.js';
import StockTransaction from '../models/StockTransaction.js';
import BusinessSetting from '../models/BusinessSetting.js';

dotenv.config();

export const seedDatabase = async () => {
  try {
    console.log('--- Checking / Seeding Initial Data ---');

    // 1. Seed Admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@stockmanager.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const adminName = process.env.ADMIN_NAME || 'Stock Administrator';

    let admin = await Admin.findOne({ email: adminEmail });
    if (!admin) {
      admin = await Admin.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
      });
      console.log(` Admin account seeded: ${adminEmail} (password: ${adminPassword})`);
    }

    // 2. Seed Business Settings
    let settings = await BusinessSetting.findOne();
    if (!settings) {
      settings = await BusinessSetting.create({
        businessName: 'VisionSafe CCTV & Security Solutions',
        contactNumber: '+91 98250 12345',
        email: 'info@visionsafecctv.com',
        address: '204, Tech Plaza, Ring Road, Surat, Gujarat 395002',
      });
      console.log(' Business settings seeded');
    }

    // 3. Seed Categories
    const categoriesData = [
      { name: 'CCTV Camera', description: 'Dome, Bullet, PTZ, and IP Security Cameras' },
      { name: 'DVR', description: 'Digital Video Recorders (4CH, 8CH, 16CH, 32CH)' },
      { name: 'NVR', description: 'Network Video Recorders for IP surveillance' },
      { name: 'Hard Disk', description: 'Surveillance-rated 24/7 internal hard drives' },
      { name: 'Cable', description: 'Coaxial 3+1 CCTV cables, CAT6 LAN cables' },
      { name: 'Connector', description: 'BNC connectors, DC pins, RJ45 jacks' },
      { name: 'Power Supply', description: '12V Centralized power supply units and SMPS' },
      { name: 'Other Accessories', description: 'Junction boxes, HDMI cables, PoE splitters, racks' },
    ];

    const categoryMap = new Map();
    for (const cat of categoriesData) {
      let existing = await Category.findOne({ name: cat.name });
      if (!existing) {
        existing = await Category.create(cat);
      }
      categoryMap.set(cat.name, existing._id);
    }

    // 4. Seed Products
    const productsData = [
      {
        name: '2MP HD Dome Camera (IR 20m)',
        category: categoryMap.get('CCTV Camera'),
        unit: 'Piece',
        currentStock: 38,
        minStock: 10,
        description: 'Indoor 1080p night vision dome camera',
      },
      {
        name: '5MP HD Bullet Camera (Outdoor IP67)',
        category: categoryMap.get('CCTV Camera'),
        unit: 'Piece',
        currentStock: 24,
        minStock: 8,
        description: 'Weatherproof high-definition outdoor bullet camera',
      },
      {
        name: '4 Channel HD DVR (H.265+)',
        category: categoryMap.get('DVR'),
        unit: 'Piece',
        currentStock: 9,
        minStock: 4,
        description: '4 Channel standalone digital video recorder',
      },
      {
        name: '8 Channel HD DVR (Audio Support)',
        category: categoryMap.get('DVR'),
        unit: 'Piece',
        currentStock: 6,
        minStock: 3,
        description: '8 Channel video and audio recorder with mobile view',
      },
      {
        name: '16 Channel 4K NVR',
        category: categoryMap.get('NVR'),
        unit: 'Piece',
        currentStock: 4,
        minStock: 2,
        description: '16 Channel IP camera network recorder',
      },
      {
        name: '1TB Surveillance Hard Disk (WD Purple)',
        category: categoryMap.get('Hard Disk'),
        unit: 'Piece',
        currentStock: 15,
        minStock: 5,
        description: '24/7 reliable surveillance storage drive',
      },
      {
        name: '2TB Surveillance Hard Disk (Seagate SkyHawk)',
        category: categoryMap.get('Hard Disk'),
        unit: 'Piece',
        currentStock: 8,
        minStock: 4,
        description: 'High capacity 2TB surveillance hard drive',
      },
      {
        name: '3+1 CCTV Copper Cable (90 Meter)',
        category: categoryMap.get('Cable'),
        unit: 'Roll',
        currentStock: 22,
        minStock: 6,
        description: 'Pure copper 90-meter coil for CCTV transmission',
      },
      {
        name: 'CAT6 UTP Network Cable (305 Meter)',
        category: categoryMap.get('Cable'),
        unit: 'Box',
        currentStock: 8,
        minStock: 3,
        description: 'High speed Gigabit network ethernet cable reel',
      },
      {
        name: 'BNC Full Copper Connector (Pack of 10)',
        category: categoryMap.get('Connector'),
        unit: 'Packet',
        currentStock: 42,
        minStock: 15,
        description: 'Screw type brass BNC video connectors',
      },
      {
        name: 'DC Power Pin Connector (Pack of 10)',
        category: categoryMap.get('Connector'),
        unit: 'Packet',
        currentStock: 48,
        minStock: 15,
        description: 'Male 12V DC power connectors',
      },
      {
        name: '12V 5A Centralized SMPS Power Supply',
        category: categoryMap.get('Power Supply'),
        unit: 'Piece',
        currentStock: 14,
        minStock: 5,
        description: '4-Camera metallic SMPS with surge protection',
      },
      {
        name: '12V 10A Centralized SMPS Power Supply',
        category: categoryMap.get('Power Supply'),
        unit: 'Piece',
        currentStock: 3, // LOW STOCK ALERT
        minStock: 5,
        description: '8-Camera metallic SMPS power unit',
      },
      {
        name: '4-Port PoE Switch (Fast Ethernet)',
        category: categoryMap.get('Other Accessories'),
        unit: 'Piece',
        currentStock: 2, // LOW STOCK ALERT
        minStock: 4,
        description: 'PoE Switch for IP camera installations',
      },
      {
        name: 'Waterproof Camera Junction Box (4x4)',
        category: categoryMap.get('Other Accessories'),
        unit: 'Piece',
        currentStock: 65,
        minStock: 20,
        description: 'Weatherproof base box for camera mounting',
      },
    ];

    const productMap = new Map();
    for (const prod of productsData) {
      let existing = await Product.findOne({ name: prod.name });
      if (!existing) {
        existing = await Product.create(prod);
        await StockTransaction.create({
          product: existing._id,
          type: 'STOCK_IN',
          changeType: 'ADD',
          quantity: prod.currentStock,
          previousStock: 0,
          updatedStock: prod.currentStock,
          reason: 'Initial Seeding Stock Balance',
          date: new Date(),
        });
      }
      productMap.set(prod.name, existing);
    }

    // 5. Seed Karigars
    const karigarsData = [
      { fullName: 'Rahul Sharma', phone: '9876543211', address: 'Varachha, Surat', status: 'ACTIVE' },
      { fullName: 'Mukesh Patel', phone: '9876543212', address: 'Katargam, Surat', status: 'ACTIVE' },
      { fullName: 'Amit Verma', phone: '9876543213', address: 'Adajan, Surat', status: 'ACTIVE' },
      { fullName: 'Suresh Yadav', phone: '9876543214', address: 'Udhna, Surat', status: 'ACTIVE' },
      { fullName: 'Dinesh Kumar', phone: '9876543215', address: 'Vesu, Surat', status: 'INACTIVE', notes: 'Temporarily on leave' },
    ];

    const karigarMap = new Map();
    for (const k of karigarsData) {
      let existing = await Karigar.findOne({ fullName: k.fullName });
      if (!existing) {
        existing = await Karigar.create(k);
      }
      karigarMap.set(k.fullName, existing);
    }

    // 6. Seed Sample Work Entry and Return (if none exist)
    const existingWork = await WorkEntry.countDocuments();
    if (existingWork === 0) {
      const rahul = karigarMap.get('Rahul Sharma');
      const domeCam = productMap.get('2MP HD Dome Camera (IR 20m)');
      const dvr4 = productMap.get('4 Channel HD DVR (H.265+)');
      const cableRoll = productMap.get('3+1 CCTV Copper Cable (90 Meter)');
      const bnc = productMap.get('BNC Full Copper Connector (Pack of 10)');

      const workDate = new Date();
      workDate.setDate(workDate.getDate() - 2);

      const work1 = await WorkEntry.create({
        workOrderNumber: 'WO-20261029-0001',
        workDate,
        karigar: rahul._id,
        customerName: 'XYZ Diamond Workshop',
        customerPhone: '9898011223',
        customerAddress: 'Plot 45, Mini Bazar, Varachha, Surat',
        notes: 'Full installation of 4 cameras and 1 DVR',
        status: 'ACTIVE',
        materials: [
          {
            product: domeCam._id,
            productNameSnapshot: domeCam.name,
            unitSnapshot: domeCam.unit,
            issuedQuantity: 4,
            returnedQuantity: 1,
          },
          {
            product: dvr4._id,
            productNameSnapshot: dvr4.name,
            unitSnapshot: dvr4.unit,
            issuedQuantity: 1,
            returnedQuantity: 0,
          },
          {
            product: cableRoll._id,
            productNameSnapshot: cableRoll.name,
            unitSnapshot: cableRoll.unit,
            issuedQuantity: 2,
            returnedQuantity: 1,
          },
          {
            product: bnc._id,
            productNameSnapshot: bnc.name,
            unitSnapshot: bnc.unit,
            issuedQuantity: 1,
            returnedQuantity: 0,
          },
        ],
      });

      const returnDate = new Date();
      returnDate.setDate(returnDate.getDate() - 1);

      await MaterialReturn.create({
        returnNumber: 'RET-20261030-0001',
        workEntry: work1._id,
        karigar: rahul._id,
        returnDate,
        notes: 'Customer needed only 3 cameras; 1 dome camera and 1 cable roll returned unused.',
        items: [
          {
            product: domeCam._id,
            productNameSnapshot: domeCam.name,
            unitSnapshot: domeCam.unit,
            returnedQuantity: 1,
          },
          {
            product: cableRoll._id,
            productNameSnapshot: cableRoll.name,
            unitSnapshot: cableRoll.unit,
            returnedQuantity: 1,
          },
        ],
      });

      const mukesh = karigarMap.get('Mukesh Patel');
      const bulletCam = productMap.get('5MP HD Bullet Camera (Outdoor IP67)');
      const hdd = productMap.get('1TB Surveillance Hard Disk (WD Purple)');

      await WorkEntry.create({
        workOrderNumber: 'WO-20261030-0002',
        workDate: new Date(),
        karigar: mukesh._id,
        customerName: 'Shree Krishna Textile Showroom',
        customerPhone: '9825123456',
        customerAddress: 'Ring Road Market, Surat',
        notes: 'Outdoor surveillance perimeter installation',
        status: 'ACTIVE',
        materials: [
          {
            product: bulletCam._id,
            productNameSnapshot: bulletCam.name,
            unitSnapshot: bulletCam.unit,
            issuedQuantity: 4,
            returnedQuantity: 0,
          },
          {
            product: hdd._id,
            productNameSnapshot: hdd.name,
            unitSnapshot: hdd.unit,
            issuedQuantity: 1,
            returnedQuantity: 0,
          },
        ],
      });
    }

    // 7. Seed Attendance
    const todayStr = new Date().toISOString().slice(0, 10);
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toISOString().slice(0, 10);

    const activeKarigars = await Karigar.find({ status: 'ACTIVE' });

    for (const [idx, k] of activeKarigars.entries()) {
      await Attendance.findOneAndUpdate(
        { karigar: k._id, date: yestStr },
        { status: idx === 3 ? 'ABSENT' : idx === 2 ? 'HALF_DAY' : 'PRESENT', notes: '' },
        { upsert: true }
      );

      await Attendance.findOneAndUpdate(
        { karigar: k._id, date: todayStr },
        { status: idx === 1 ? 'HALF_DAY' : 'PRESENT', notes: '' },
        { upsert: true }
      );
    }

    console.log('--- Initial Data Ready ---');
  } catch (err) {
    console.error('Seeding Error:', err);
  }
};

// If run directly from CLI
if (process.argv[1]?.endsWith('seed.js')) {
  connectDB().then(async () => {
    await seedDatabase();
    process.exit(0);
  });
}

export default seedDatabase;
