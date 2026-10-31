import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { provisionAdmin, validateAdminConfig } from './provisionAdmin.js';

dotenv.config();

const resetCollections = [
  'categories',
  'products',
  'stocktransactions',
  'karigars',
  'workentries',
  'materialreturns',
  'attendances',
];

const preservedCollections = ['admins', 'businesssettings'];
const confirmationValue = 'TANISH_TECHNOLOGY_CLEAR_BUSINESS_DATA';

const countCollection = async (name) => {
  const exists = await mongoose.connection.db.listCollections({ name }).hasNext();
  return exists ? mongoose.connection.db.collection(name).countDocuments({}) : 0;
};

const printReport = (title, rows) => {
  console.log(`\n${title}`);
  rows.forEach(({ name, count }) => console.log(`  ${name}: ${count}`));
  console.log(`  Total: ${rows.reduce((total, row) => total + row.count, 0)}`);
};

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI must be configured for a database count/reset run.');
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  const resetCounts = await Promise.all(
    resetCollections.map(async (name) => ({ name, count: await countCollection(name) }))
  );
  const preservedCounts = await Promise.all(
    preservedCollections.map(async (name) => ({ name, count: await countCollection(name) }))
  );

  console.log('Tanish Technology business-data reset report');
  printReport('Collections included in the reset allowlist:', resetCounts);
  printReport('Collections preserved:', preservedCounts);

  if (!process.argv.includes('--execute')) {
    console.log('\nDRY RUN ONLY: no records were deleted.');
    return;
  }

  if (process.env.RESET_CONFIRMATION !== confirmationValue) {
    throw new Error('Reset blocked. Explicit approval and the required confirmation value are needed.');
  }

  validateAdminConfig();
  await provisionAdmin();

  const session = await mongoose.startSession();
  const deletedCounts = [];
  try {
    await session.withTransaction(async () => {
      for (const name of resetCollections) {
        const result = await mongoose.connection.db
          .collection(name)
          .deleteMany({}, { session });
        deletedCounts.push({ name, count: result.deletedCount });
      }
    });
  } finally {
    await session.endSession();
  }

  printReport('Business records cleared:', deletedCounts);
}

try {
  await run();
} catch (error) {
  console.error(`Business-data reset stopped: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}