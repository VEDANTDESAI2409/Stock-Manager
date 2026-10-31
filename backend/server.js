import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { provisionAdmin, validateAdminConfig } from './scripts/provisionAdmin.js';

// Route imports
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import karigarRoutes from './routes/karigarRoutes.js';
import workEntryRoutes from './routes/workEntryRoutes.js';
import materialReturnRoutes from './routes/materialReturnRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters before starting the API.');
}
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://stock-manager-two-teal.vercel.app',
  ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173']),
].filter(Boolean);

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/karigars', karigarRoutes);
app.use('/api/work-entries', workEntryRoutes);
app.use('/api/returns', materialReturnRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

// Root sanity endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Tanish Technology API is operational',
    docs: '/api/health',
  });
});

// 404 & Centralized Error Handler
app.use(notFound);
app.use(errorHandler);

// Start server after connecting to database
const startServer = async () => {
  try {
    validateAdminConfig();
    await connectDB();
    await provisionAdmin();
    const server = app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(` Tanish Technology API running on port ${PORT}`);
      console.log(` Health Check: http://localhost:${PORT}/api/health`);
      console.log(`===============================================`);
    });

    const shutdown = () => {
      console.log('\nShutting down gracefully...');
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('Fatal Server Boot Error:', err.message);
    process.exit(1);
  }
};

startServer();

export default app;
