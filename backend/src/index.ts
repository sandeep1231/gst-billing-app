import express, { Request, Response } from 'express';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import registerRoutes from './routes';
import { InvoiceCounter } from './models/invoiceCounter.model';

dotenv.config();

const app = express();
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

const originEnv = process.env.ORIGIN || 'http://localhost:4200';
const origins = originEnv.split(',').map(s => s.trim());
app.use(cors({ origin: origins, credentials: true }));

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Health endpoint (keep JSON response separate from SPA)
app.get('/health', (req: Request, res: Response) => res.json({ ok: true }));

// register API routes
registerRoutes(app);

// Serve Angular build (single-service deployment)
// In single-service Render deploy with rootDir=backend, only backend/ is retained.
// We copy the built Angular dist into ./dist/public during build.
const publicDist = path.resolve(__dirname, 'public');
app.use(express.static(publicDist));

// SPA fallback for client-side routing
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(publicDist, 'index.html'));
});

const port = process.env.PORT || 4000;

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gst-billing')
  .then(async () => {
    // Sync indexes to drop any legacy unique indexes (e.g., userId+series+fy) and apply current schema
    try {
      await InvoiceCounter.syncIndexes();
    } catch (e) {
      console.warn('InvoiceCounter.syncIndexes warning', e);
    }
    app.listen(port, () => console.log(`Server started on port ${port}`));
  })
  .catch((err: unknown) => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });
