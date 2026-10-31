import express from 'express';
import mongoose from 'mongoose';
import { getConnectionDetails } from '../config/db.js';

const router = express.Router();

router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const isHealthy = dbState === 1;
  const details = getConnectionDetails();

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'Stock Manager API',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatusMap[dbState] || 'unknown',
      type: details.connectionType,
      host: details.host,
      databaseName: details.dbName,
      replicaSetSupported: details.replicaSetSupported,
      transactionsEnabled: details.replicaSetSupported,
    },
  });
});

export default router;
