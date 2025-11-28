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
