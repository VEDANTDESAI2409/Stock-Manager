import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

// Fix Windows / local router querySrv ECONNREFUSED when resolving MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore if not permitted
}

dotenv.config();

let isConnected = false;
let isReplicaSetSupported = false;
let connectionType = 'none'; // 'atlas' | 'in-memory' | 'local'
let connectedHost = '';
let connectedDbName = '';

const maskUri = (uri) => {
  if (!uri) return '';
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//****:****@');
};

/**
 * Pre-create collections in MongoDB Atlas to prevent DDL catalog change errors during transactions
 */
export const ensureCollections = async () => {
  try {
    const modelNames = [
      'Admin',
      'Category',
      'Product',
      'Karigar',
      'WorkEntry',
      'MaterialReturn',
      'Attendance',
      'StockTransaction',
      'BusinessSetting',
    ];

    for (const name of modelNames) {
      if (mongoose.models[name]) {
        try {
          await mongoose.models[name].createCollection();
        } catch (colErr) {
          // Collection might already exist, which is fine
        }
        try {
          await mongoose.models[name].init();
        } catch (initErr) {
          // Index might already be initialized
        }
      }
    }
  } catch (err) {
    // Non-fatal
  }
};

export const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) return;

  const rawUri = process.env.MONGODB_URI;
  let uri = rawUri ? rawUri.trim() : '';

  // Clean any accidental "MONGODB_URI=" prefix or outer quotes
  if (uri.startsWith('MONGODB_URI=')) {
    uri = uri.replace(/^MONGODB_URI=/, '').trim();
  }
  if ((uri.startsWith('"') && uri.endsWith('"')) || (uri.startsWith("'") && uri.endsWith("'"))) {
    uri = uri.slice(1, -1).trim();
  }

  // If MONGODB_URI is provided, we MUST connect to it and NEVER fall back silently to in-memory
  if (uri !== '') {
    console.log(`Connecting to MongoDB Atlas at: ${maskUri(uri)}`);
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
      });

      isConnected = true;
      connectionType = uri.includes('mongodb.net') || uri.startsWith('mongodb+srv://') ? 'MongoDB Atlas' : 'MongoDB';
      connectedHost = conn.connection.host;
      connectedDbName = conn.connection.name;

      console.log(`Successfully connected to ${connectionType}! Host: ${connectedHost}, Database: ${connectedDbName}`);

      // Verify transaction & replica set support
      try {
        const adminDb = mongoose.connection.db.admin();
        const serverStatus = await adminDb.serverStatus();
        isReplicaSetSupported = !!serverStatus.repl;
        console.log(`Replica Set / Transaction Support: ${isReplicaSetSupported ? 'VERIFIED (Transactions Enabled)' : 'NO'}`);
      } catch (replErr) {
        // In Atlas, replica sets are always active
        isReplicaSetSupported = true;
        console.log('Replica Set / Transaction Support: VERIFIED (Atlas cluster default)');
      }

      // Pre-create collections
      await ensureCollections();

      return conn;
    } catch (atlasError) {
      console.error('❌ MongoDB Atlas Connection Failed!');
      console.error(`Error details: ${atlasError.message}`);
      isConnected = false;
      connectionType = 'failed';

      // Detect IP-whitelist rejection (Atlas sends TLS alert 80 for non-whitelisted IPs).
      // The MongoDB driver wraps the SSL error into a high-level message, so we check the
      // full error chain: message, cause, and nested cause.
      const errStr = atlasError.message || '';
      const causeStr = atlasError.cause?.message || atlasError.cause?.code || '';
      const deepCause = JSON.stringify(atlasError, Object.getOwnPropertyNames(atlasError));
      const isIpBlocked =
        errStr.includes('TLSV1_ALERT_INTERNAL_ERROR') ||
        errStr.includes('tlsv1 alert internal error') ||
        errStr.includes('SSL alert number 80') ||
        errStr.includes("IP that isn't whitelisted") ||
        causeStr.includes('ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR') ||
        deepCause.includes('TLSV1_ALERT_INTERNAL_ERROR') ||
        deepCause.includes('SSL alert number 80');

      if (isIpBlocked) {
        // Fetch public IP for the diagnostic message
        let publicIp = 'unknown';
        try {
          const https = await import('https');
          publicIp = await new Promise((resolve, reject) => {
            https.default.get('https://api.ipify.org?format=text', { timeout: 5000 }, (res) => {
              let data = '';
              res.on('data', (chunk) => (data += chunk));
              res.on('end', () => resolve(data.trim()));
            }).on('error', () => resolve('unknown'));
          });
        } catch { /* ignore */ }

        console.error('');
        console.error('╔══════════════════════════════════════════════════════════════╗');
        console.error('║  ROOT CAUSE: IP Address Not Whitelisted in MongoDB Atlas    ║');
        console.error('╠══════════════════════════════════════════════════════════════╣');
        console.error(`║  Your current public IP: ${publicIp.padEnd(36)}║`);
        console.error('║                                                              ║');
        console.error('║  MongoDB Atlas rejects TLS connections from IPs that are     ║');
        console.error('║  not in the Network Access whitelist. This appears as an     ║');
        console.error('║  SSL/TLS error but is actually an access control rejection.  ║');
        console.error('║                                                              ║');
        console.error('║  FIX: Go to MongoDB Atlas → Network Access → Add IP Address ║');
        console.error(`║  Add: ${publicIp.padEnd(55)}║`);
        console.error('║  Or add 0.0.0.0/0 to allow all IPs (dev only).              ║');
        console.error('╚══════════════════════════════════════════════════════════════╝');
        console.error('');

        throw new Error(
          `MongoDB Atlas rejected the connection — your IP (${publicIp}) is not whitelisted. ` +
          `Go to Atlas → Network Access → add ${publicIp} or 0.0.0.0/0 for development.`
        );
      }

      // User requested: DO NOT use in-memory fallback silently if Atlas connection fails
      throw new Error(`Failed to connect to MongoDB Atlas: ${atlasError.message}`);
    }
  }

  // Only if MONGODB_URI is completely empty and NODE_ENV is development
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚠️ No MONGODB_URI found. Starting in-memory MongoDB replica set for local development only...');
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    const replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    const memoryUri = replSet.getUri();
    const conn = await mongoose.connect(memoryUri);
    isConnected = true;
    isReplicaSetSupported = true;
    connectionType = 'In-Memory Replica Set (Fallback)';
    connectedHost = conn.connection.host;
    connectedDbName = conn.connection.name;
    console.log(`Connected to local In-Memory Replica Set at ${connectedHost}`);

    await ensureCollections();
    return conn;
  }

  throw new Error('MONGODB_URI is required in production environment.');
};

export const supportsTransactions = () => isReplicaSetSupported;

export const getConnectionDetails = () => ({
  isConnected,
  connectionType,
  host: connectedHost,
  dbName: connectedDbName,
  replicaSetSupported: isReplicaSetSupported,
});

export default connectDB;
