import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { initializeDatabase } from './services/database.service';
import { errorHandler } from './middleware/error.middleware';
import authMiddleware from './middleware/auth.middleware';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import licenseRoutes from './routes/license.routes';
import contactsRoutes from './routes/contacts.routes';
import templatesRoutes from './routes/templates.routes';
import campaignsRoutes from './routes/campaigns.routes';
import broadcastRoutes from './routes/broadcast.routes';
import whatsappRoutes from './routes/whatsapp.routes';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(authMiddleware.attachRequestContext);
app.use(authMiddleware.logAccess);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '0.1.0',
  });
});

// API Routes - Phase 2
app.get('/api/v1/config', (req: Request, res: Response) => {
  res.json({
    version: process.env.APP_VERSION || '0.2.0',
    appName: process.env.APP_NAME || 'Broadcaster',
    phase: 'Phase 2 - License & RBAC',
  });
});

// Authentication routes (public)
app.use('/api/v1/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api/v1/users', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/licenses', licenseRoutes);
app.use('/api/v1/contacts', contactsRoutes);
app.use('/api/v1/templates', templatesRoutes);
app.use('/api/v1/campaigns', campaignsRoutes);
app.use('/api/v1/broadcast', broadcastRoutes);
app.use('/api/v1/whatsapp', whatsappRoutes);

// Error handler
app.use(errorHandler);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize and start server
const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
