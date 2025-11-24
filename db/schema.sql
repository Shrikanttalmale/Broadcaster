-- Database Schema for Broadcaster
-- WhatsApp Bulk Marketing Application

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'operator')),
  isActive BOOLEAN DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Licenses Table
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
);

CREATE INDEX idx_licenses_licenseKey ON licenses(licenseKey);
CREATE INDEX idx_licenses_licenseType ON licenses(licenseType);

-- Plans Table
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
);

-- WhatsApp Accounts Table
CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  phoneNumber TEXT UNIQUE NOT NULL,
  sessionData JSON,
  isActive BOOLEAN DEFAULT 1,
  lastLogin DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_wa_accounts_userId ON whatsapp_accounts(userId);
CREATE INDEX idx_wa_accounts_phoneNumber ON whatsapp_accounts(phoneNumber);

-- Campaigns Table
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
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_campaigns_userId ON campaigns(userId);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_scheduledFor ON campaigns(scheduledFor);

-- Messages Table
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
  FOREIGN KEY (campaignId) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_campaignId ON messages(campaignId);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_phoneNumber ON messages(phoneNumber);

-- Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT,
  phoneNumber TEXT NOT NULL,
  email TEXT,
  tags JSON,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_contacts_userId ON contacts(userId);
CREATE INDEX idx_contacts_phoneNumber ON contacts(phoneNumber);

-- Campaign Templates Table
CREATE TABLE IF NOT EXISTS message_templates (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables JSON,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_templates_userId ON message_templates(userId);

-- Analytics/Logs Table
CREATE TABLE IF NOT EXISTS campaign_analytics (
  id TEXT PRIMARY KEY,
  campaignId TEXT NOT NULL,
  totalContacts INTEGER,
  totalSent INTEGER DEFAULT 0,
  totalDelivered INTEGER DEFAULT 0,
  totalFailed INTEGER DEFAULT 0,
  totalRead INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaignId) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX idx_analytics_campaignId ON campaign_analytics(campaignId);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSON,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Enable foreign keys
PRAGMA foreign_keys = ON;
