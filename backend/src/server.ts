import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.routes';
import { errorHandler } from './middleware/errorHandler';
import { getDbPool } from './config/db';
import { initScheduler } from './jobs/scheduler.job';

const possibleEnvPaths = [
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../.env.production'),
];
for (const p of possibleEnvPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-ID'],
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static uploads serving
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Company Important Date & Task Management API',
    version: '1.0.0',
  });
});

// API Routes
app.use('/api', apiRoutes);

// Static frontend SPA serving (Production)
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);

// Bootstrap
async function bootstrap() {
  try {
    // 1. Verify SQL Server database connectivity
    await getDbPool();
    console.log('[Bootstrap] SQL Server Database Connection Verified.');

    // 2. Start Background Scheduler
    initScheduler();

    // 3. Start HTTP Server
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Company Task Management Portal & API running on port ${PORT}`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`=======================================================`);
    });
  } catch (err: any) {
    console.error('[Bootstrap Error] Failed to start server:', err.message);
    process.exit(1);
  }
}

bootstrap();
