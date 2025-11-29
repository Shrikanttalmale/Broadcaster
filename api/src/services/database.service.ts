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

  logger.info('Creating/verifying database schema...');

  // Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'operator')),
      licenseKey TEXT,
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
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
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
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
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
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
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
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Templates table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        subject TEXT,
        body TEXT NOT NULL,
        variables JSON,
        category TEXT,
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if contacts table needs migration (add category column if missing)
  try {
    const contactColumns = await db.all(`PRAGMA table_info(contacts)`);
    const hasCategory = contactColumns.some((col: any) => col.name === 'category');
    if (!hasCategory) {
      logger.info('Adding category column to contacts table...');
      await db.exec(`ALTER TABLE contacts ADD COLUMN category TEXT`);
      logger.info('Category column added successfully');
    }
  } catch (error: any) {
    logger.warn('Could not migrate contacts table:', error.message);
  }

  // Sessions table (for tracking active sessions per user/license)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      licenseKey TEXT NOT NULL,
      refreshToken TEXT UNIQUE NOT NULL,
      deviceInfo TEXT,
      ipAddress TEXT,
      userAgent TEXT,
      isActive BOOLEAN DEFAULT 1,
      loginAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      lastActivityAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      expiresAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (licenseKey) REFERENCES licenses(licenseKey)
    )
  `);

  logger.info('Database schema verified successfully');
  
  // Always seed default license (will check if it exists first)
  await seedDefaultLicense();
};

const seedDefaultLicense = async () => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    // Check if license already exists
    const existingLicense = await db.get(
      `SELECT licenseKey FROM licenses WHERE licenseKey = ?`,
      ['master-license-1']
    );
    
    if (!existingLicense) {
      const now = new Date();
      const validUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
      
      await db.run(
        `INSERT INTO licenses (id, licenseKey, licenseType, isActive, validFrom, validUntil, maxInstallations, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'lic-master-1',
          'master-license-1',
          'master',
          1,
          now.toISOString(),
          validUntil.toISOString(),
          999,
          now.toISOString(),
          now.toISOString(),
        ]
      );
      
      logger.info('Default master license created: master-license-1');
    }
  } catch (error: any) {
    logger.error('Error seeding default license:', error);
  }
};