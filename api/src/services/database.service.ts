import * as sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import * as path from 'path';
import { logger } from '../utils/logger';

let db: any = null;

export const initializeDatabase = async () => {
  try {
    const dbPath = path.join(process.env.APP_DATA || '.', 'broadcaster.db');

    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    await db.exec('PRAGMA foreign_keys = ON');
    await db.exec('PRAGMA journal_mode = WAL');

    // Initialize schema
    await initializeSchema();

    logger.info(`Database initialized at ${dbPath}`);
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

export const getDatabase = () => db;

const initializeSchema = async () => {
  if (!db) throw new Error('Database not initialized');

  // Check if tables exist
  const tables = await db.all(
    `SELECT name FROM sqlite_master WHERE type='table'`
  );

  if (tables.length === 0) {
    logger.info('Creating database schema...');

    // Users table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'operator')),
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // License table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS licenses (
        id TEXT PRIMARY KEY,
        licenseKey TEXT UNIQUE NOT NULL,
        licenseType TEXT NOT NULL CHECK (licenseType IN ('master', 'distributor', 'user')),
        planId TEXT,
        distributor JSON,
        isActive BOOLEAN DEFAULT 1,
        validFrom DATETIME,
        validUntil DATETIME,
        maxInstallations INTEGER DEFAULT 1,
        features JSON,
        signature TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Plans table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        features JSON NOT NULL,
        price REAL,
        currency TEXT DEFAULT 'INR',
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // WhatsApp Accounts table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS whatsapp_accounts (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        phoneNumber TEXT UNIQUE NOT NULL,
        sessionData JSON,
        isActive BOOLEAN DEFAULT 1,
        lastLogin DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // Campaigns table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        messageTemplate TEXT,
        contactListId TEXT,
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'failed')),
        scheduledFor DATETIME,
        startedAt DATETIME,
        completedAt DATETIME,
        delayMin INTEGER DEFAULT 5000,
        delayMax INTEGER DEFAULT 15000,
        throttlePerMinute INTEGER DEFAULT 60,
        retryAttempts INTEGER DEFAULT 3,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // Messages table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        campaignId TEXT NOT NULL,
        phoneNumber TEXT NOT NULL,
        message TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
        attemptCount INTEGER DEFAULT 0,
        lastError TEXT,
        sentAt DATETIME,
        deliveredAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaignId) REFERENCES campaigns(id)
      )
    `);

    // Contacts table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT,
        phoneNumber TEXT NOT NULL,
        email TEXT,
        tags JSON,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    logger.info('Database schema created successfully');
  }
};
