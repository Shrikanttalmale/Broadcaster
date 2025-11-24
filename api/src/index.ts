import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { initializeDatabase } from './services/database.service';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '0.1.0',
  });
});

// API Routes (will be added in later phases)
app.get('/api/v1/config', (req: Request, res: Response) => {
  res.json({
    version: process.env.APP_VERSION || '0.1.0',
    appName: process.env.APP_NAME || 'Broadcaster',
  });
});

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
