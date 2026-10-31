import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Admin from '../models/Admin.js';
import BusinessSetting from '../models/BusinessSetting.js';

dotenv.config();

export const validateAdminConfig = () => {
  const jwtSecret = process.env.JWT_SECRET;
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('A valid ADMIN_EMAIL must be configured.');
  }
  if (!password || password.length < 12) {
    throw new Error('ADMIN_PASSWORD must be configured with at least 12 characters.');
  }

  return {
    email,
    password,
    name: process.env.ADMIN_NAME?.trim() || 'Tanish Technology',
  };
};

export const provisionAdmin = async () => {
  const { email, password, name } = validateAdminConfig();
  let admin = await Admin.findOne({ email }).select('+password');

  if (!admin) {
    try {
      admin = await Admin.create({ name, email, password });
    } catch (error) {
      if (error.code !== 11000) throw error;
      admin = await Admin.findOne({ email }).select('+password');
      if (!admin) throw error;
      admin.name = name;
      admin.password = password;
      await admin.save();
    }
  } else {
    admin.name = name;
    admin.password = password;
    await admin.save();
  }

  let settings = await BusinessSetting.findOne();
  if (!settings) settings = new BusinessSetting();
  settings.businessName = 'Tanish Technology';
  await settings.save();

  console.log('Configured administrator and business identity are ready.');
  return admin;
};

if (process.argv[1]?.endsWith('provisionAdmin.js')) {
  try {
    validateAdminConfig();
    await connectDB();
    await provisionAdmin();
  } catch (error) {
    console.error(`Administrator provisioning failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}