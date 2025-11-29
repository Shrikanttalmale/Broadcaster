import { Client, MessageMedia, Events } from 'whatsapp-web.js';
import { logger } from '../utils/logger';
import { getDatabase } from './database.service';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

interface WASessionWeb {
  id: string;
  userId: string;
  phoneNumber: string;
  client: Client | null;
  qrCode?: string;
  connected: boolean;
  createdAt: Date;
  lastActivity: Date;
}

class WhatsAppWebService {
  private sessions: Map<string, WASessionWeb> = new Map();
  private sessionsDir = path.join(process.cwd(), 'data', 'whatsapp_sessions_web');

  constructor() {
    // Ensure sessions directory exists
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * Start WhatsApp session using whatsapp-web.js
   */
  async startSession(userId: string, phoneNumber: string, onQRCode?: (qr: string) => void): Promise<string> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const accountId = uuidv4();
      const now = new Date();
      const sessionPath = path.join(this.sessionsDir, `session_${accountId}`);

      // Ensure user exists
      const existingUser = await db.get(
        `SELECT id FROM users WHERE id = ?`,
        [userId]
      );

      if (!existingUser) {
        const isoNow = now.toISOString();
        await db.run(
          `INSERT OR IGNORE INTO users (id, username, passwordHash, email, role, isActive, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            `user_${userId.substring(0, 8)}`,
            'temp_hash',
            `user_${userId.substring(0, 8)}@broadcaster.local`,
            'operator',
            1,
            isoNow,
            isoNow,
          ]
        );
      }

      // Check for existing account
      const anyExistingAccount = await db.get(
        `SELECT id, userId FROM whatsapp_accounts WHERE phoneNumber = ?`,
        [phoneNumber]
      );

      let accountToUse = accountId;

      if (anyExistingAccount) {
        if (anyExistingAccount.userId === userId) {
          accountToUse = anyExistingAccount.id;
          await db.run(
            `UPDATE whatsapp_accounts SET isActive = 0, updatedAt = ? WHERE id = ?`,
            [now.toISOString(), accountToUse]
          );
          this.sessions.delete(accountToUse);
        } else {
          await db.run(
            `DELETE FROM whatsapp_accounts WHERE id = ?`,
            [anyExistingAccount.id]
          );

          await db.run(
            `INSERT INTO whatsapp_accounts (id, userId, phoneNumber, isActive, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [accountId, userId, phoneNumber, 1, now.toISOString(), now.toISOString()]
          );
        }
      } else {
        await db.run(
          `INSERT INTO whatsapp_accounts (id, userId, phoneNumber, isActive, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [accountId, userId, phoneNumber, 1, now.toISOString(), now.toISOString()]
        );
      }

      // Store session record
      this.sessions.set(accountToUse, {
        id: accountToUse,
        userId,
        phoneNumber,
        client: null,
        connected: false,
        createdAt: now,
        lastActivity: now,
      });

      // Create client with session persistence
      const client = new Client({
        session: undefined, // Will use session storage from sessionPath
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      });

      // Handle QR code
      client.on(Events.QR_RECEIVED, (qr: string) => {
        logger.info(`WhatsApp Web QR Code received for ${phoneNumber}`);
        if (onQRCode) {
          onQRCode(qr);
        }

        const session = this.sessions.get(accountToUse);
        if (session) {
          session.qrCode = qr;
          logger.info(`QR Code stored in session for ${accountToUse}`);
        }
      });

      // Handle successful authentication
      client.on(Events.AUTHENTICATED, async () => {
        logger.info(`WhatsApp Web authenticated for ${phoneNumber}`);
        
        const session = this.sessions.get(accountToUse);
        if (session) {
          session.connected = true;
          session.lastActivity = new Date();
        }

        // Update database
        await db.run(
          `UPDATE whatsapp_accounts 
           SET isActive = 1, lastLogin = ? 
           WHERE id = ?`,
          [new Date().toISOString(), accountToUse]
        );
      });

      // Handle disconnection
      client.on(Events.DISCONNECTED, async () => {
        logger.warn(`WhatsApp Web disconnected for ${phoneNumber}`);
        const session = this.sessions.get(accountToUse);
        if (session) {
          session.connected = false;
        }
      });

      // Handle errors
      client.on('error' as any, (error: any) => {
        logger.error(`WhatsApp Web client error for ${phoneNumber}:`, error);
      });

      // Handle incoming messages
      client.on(Events.MESSAGE_RECEIVED, (msg: any) => {
        logger.info(`Message received on WhatsApp Web: ${msg.from}`);
      });

      // Initialize client
      await client.initialize();

      // Update session with client
      const sessionToUpdate = this.sessions.get(accountToUse);
      if (sessionToUpdate) {
        sessionToUpdate.client = client;
      }

      logger.info(`WhatsApp Web session started for ${accountToUse}`);
      return accountToUse;
    } catch (error: any) {
      logger.error('Error starting WhatsApp Web session:', error);
      throw error;
    }
  }

  /**
   * Send message via WhatsApp Web
   */
  async sendMessage(accountId: string, userId: string, phoneNumber: string, message: string): Promise<string> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const session = this.sessions.get(accountId);
      if (!session || !session.client || !session.connected) {
        throw new Error('WhatsApp Web account not connected');
      }

      // Validate account ownership
      const account = await db.get(
        `SELECT * FROM whatsapp_accounts WHERE id = ? AND userId = ?`,
        [accountId, userId]
      );

      if (!account) {
        throw new Error('WhatsApp account not found');
      }

      // Format phone number
      const jid = phoneNumber.replace(/\D/g, '');
      const formattedJid = jid.includes('@') ? jid : `${jid}@c.us`;

      // Send message
      const chatId = await session.client!.getNumberId(formattedJid);
      if (!chatId) {
        throw new Error('Could not find or create chat');
      }

      const response = await session.client!.sendMessage(chatId._serialized, message);

      session.lastActivity = new Date();

      logger.info(`Message sent via WhatsApp Web to ${phoneNumber}`);
      return response.id._serialized;
    } catch (error: any) {
      logger.error('Error sending WhatsApp Web message:', error);
      throw error;
    }
  }

  /**
   * Get session status
   */
  async getSessionStatus(accountId: string, userId: string): Promise<any> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const account = await db.get(
        `SELECT * FROM whatsapp_accounts WHERE id = ? AND userId = ?`,
        [accountId, userId]
      );

      if (!account) {
        throw new Error('Account not found');
      }

      const session = this.sessions.get(accountId);

      return {
        id: account.id,
        phoneNumber: account.phoneNumber,
        connected: session ? session.connected : false,
        isActive: Boolean(account.isActive),
        lastLogin: account.lastLogin,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      };
    } catch (error: any) {
      logger.error('Error getting session status:', error);
      throw error;
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<any[]> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const accounts = await db.all(
        `SELECT * FROM whatsapp_accounts WHERE userId = ? ORDER BY createdAt DESC`,
        [userId]
      );

      return accounts.map((account: any) => {
        const session = this.sessions.get(account.id);
        return {
          id: account.id,
          phoneNumber: account.phoneNumber,
          connected: session ? session.connected : false,
          isActive: Boolean(account.isActive),
          lastLogin: account.lastLogin,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        };
      });
    } catch (error: any) {
      logger.error('Error getting user sessions:', error);
      throw error;
    }
  }

  /**
   * Initialize whatsapp-web service - restore saved sessions from disk
   */
  async initialize(): Promise<void> {
    const db = getDatabase();
    if (!db) return; // Database not ready yet

    try {
      logger.info('WhatsApp Web service initializing...');

      // Get all active accounts from database
      const accounts = await db.all(
        `SELECT id, userId, phoneNumber FROM whatsapp_accounts WHERE isActive = 1`
      );

      logger.info(`Found ${accounts.length} active WhatsApp accounts to restore`);

      // Try to restore each account's session from disk
      for (const account of accounts) {
        try {
          const sessionPath = path.join(this.sessionsDir, `session_${account.id}`);
          
          // Check if session files exist
          if (fs.existsSync(sessionPath)) {
            logger.info(`Session files found for ${account.phoneNumber}, will restore on-demand`);
            // We don't immediately restore here to avoid blocking startup
            // Sessions will be restored on-demand when user accesses them
          }
        } catch (err) {
          logger.warn(`Could not check session for ${account.phoneNumber}:`, err);
        }
      }

      logger.info('WhatsApp Web service initialized (on-demand session restoration enabled)');
    } catch (error: any) {
      logger.warn('Error initializing WhatsApp Web service:', error);
      // Don't throw - service should start even if initialization has issues
    }
  }

  /**
   * Restore a saved session from disk
   */
  async restoreSession(accountId: string, userId: string, phoneNumber: string): Promise<boolean> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const sessionPath = path.join(this.sessionsDir, `session_${accountId}`);

      // Check if saved session exists
      if (!fs.existsSync(sessionPath)) {
        logger.info(`No saved session found for ${phoneNumber}, need to scan QR code`);
        return false;
      }

      logger.info(`Attempting to restore WhatsApp Web session for ${phoneNumber}...`);

      // Create and initialize client
      const client = new Client({
        authStrategy: new (require('whatsapp-web.js').LocalAuth)({
          clientId: `${accountId}`,
          dataPath: this.sessionsDir,
        }),
        puppeteer: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ],
        },
      });

      // Setup event handlers before initializing
      client.on(Events.AUTHENTICATED, async () => {
        logger.info(`WhatsApp Web authenticated (restored) for ${phoneNumber}`);
        
        const session: WASessionWeb = {
          id: accountId,
          userId,
          phoneNumber,
          client,
          connected: true,
          createdAt: new Date(),
          lastActivity: new Date(),
        };

        this.sessions.set(accountId, session);

        // Update database
        await db.run(
          `UPDATE whatsapp_accounts 
           SET isActive = 1, lastLogin = ? 
           WHERE id = ?`,
          [new Date().toISOString(), accountId]
        );
      });

      client.on(Events.DISCONNECTED, async () => {
        logger.warn(`WhatsApp Web session ${accountId} disconnected`);
        this.sessions.delete(accountId);
        await db.run(
          `UPDATE whatsapp_accounts SET isActive = 0, updatedAt = ? WHERE id = ?`,
          [new Date().toISOString(), accountId]
        );
      });

      client.on(Events.MESSAGE_RECEIVED, (message: any) => {
        logger.info(`Message received on restored session: ${message.from}`);
      });

      // Initialize client
      await Promise.race([
        client.initialize(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Client initialization timeout')), 30000)
        ),
      ]);

      return true;
    } catch (error: any) {
      logger.warn(`Could not restore session for ${phoneNumber}:`, error.message);
      return false;
    }
  }

  /**
   * Disconnect session
   */
  async disconnectSession(accountId: string): Promise<void> {
    try {
      const session = this.sessions.get(accountId);
      if (session && session.client) {
        await session.client.destroy();
        this.sessions.delete(accountId);

        const db = getDatabase();
        if (db) {
          await db.run(
            `UPDATE whatsapp_accounts SET isActive = 0, updatedAt = ? WHERE id = ?`,
            [new Date().toISOString(), accountId]
          );
        }

        logger.info(`WhatsApp Web session ${accountId} disconnected`);
      }
    } catch (error: any) {
      logger.error('Error disconnecting WhatsApp Web session:', error);
      throw error;
    }
  }

  /**
   * Get QR code for a session
   */
  getSessionQRCode(accountId: string): string | undefined {
    const session = this.sessions.get(accountId);
    return session?.qrCode;
  }
}

export const whatsappWebService = new WhatsAppWebService();
