import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let isConnected = false;
let isReplicaSetSupported = false;

export const connectDB = async () => {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;

  try {
    if (uri && uri.trim() !== '') {
      console.log('Connecting to MongoDB Atlas / configured URI...');
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
      });
      isConnected = true;
      console.log(`MongoDB connected: ${conn.connection.host}`);
      
      // Check if connected cluster is a replica set (Atlas is always a replica set)
      try {
        const adminDb = mongoose.connection.db.admin();
        const serverStatus = await adminDb.serverStatus();
        isReplicaSetSupported = !!serverStatus.repl;
        console.log(`Replica set / Transaction support: ${isReplicaSetSupported ? 'YES' : 'NO'}`);
      } catch {
        isReplicaSetSupported = true; // Atlas default
      }
      return;
    }

    // Fallback: If no MONGODB_URI is provided, start MongoMemoryReplSet so transactions work out of the box
    console.log('No MONGODB_URI found in environment. Starting in-memory MongoDB replica set for development...');
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    const replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    const memoryUri = replSet.getUri();
    const conn = await mongoose.connect(memoryUri);
    isConnected = true;
    isReplicaSetSupported = true;
    console.log(`In-memory MongoDB Replica Set connected: ${conn.connection.host}`);
    console.log('NOTE: To connect your permanent MongoDB Atlas database, add MONGODB_URI to backend/.env');
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    // If Atlas connection fails (e.g. invalid credentials or network blocked), try in-memory fallback in dev mode
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('Attempting in-memory MongoDB fallback...');
        const { MongoMemoryReplSet } = await import('mongodb-memory-server');
        const replSet = await MongoMemoryReplSet.create({
          replSet: { count: 1, storageEngine: 'wiredTiger' },
        });
        const memoryUri = replSet.getUri();
        await mongoose.connect(memoryUri);
        isConnected = true;
        isReplicaSetSupported = true;
        console.log('Connected to fallback in-memory MongoDB replica set.');
      } catch (fallbackErr) {
        console.error('Fallback in-memory MongoDB failed:', fallbackErr.message);
        throw error;
      }
    } else {
      throw error;
    }
  }
};

export const supportsTransactions = () => isReplicaSetSupported;

export default connectDB;
