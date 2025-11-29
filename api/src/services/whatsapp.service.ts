import {
  makeWASocket,
  AuthenticationCreds,
  AuthenticationState,
  BufferJSON,
  initAuthCreds,
  proto,
  SignalDataTypeMap,
  SignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { logger } from '../utils/logger';
import { getDatabase } from './database.service';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

interface WASession {
  id: string;
  userId: string;
  phoneNumber: string;
  socket: any;
  qrCode?: string;
  connected: boolean;
  createdAt: Date;
  lastActivity: Date;
}

interface WhatsAppMessage {
  to: string;
  message: string;
}

class WhatsAppService {
  private sessions: Map<string, WASession> = new Map();
  private sessionsDir = path.join(process.cwd(), 'data', 'whatsapp_sessions');

  constructor() {
    // Ensure sessions directory exists
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * Initialize WhatsApp service - called once on server startup
   * Does NOT restore all sessions - that's done lazily
   */
  async initialize(): Promise<void> {
    try {
      // Initialize whatsapp-web service (restores saved sessions on-demand)
      try {
        const { whatsappWebService } = await import('./whatsapp-web.service');
        await (whatsappWebService as any).initialize?.();
      } catch (err) {
        logger.warn('Could not initialize whatsapp-web service:', err);
      }

      logger.info('WhatsApp service initialized (lazy session loading enabled)');
      // Sessions will be loaded on-demand when user accesses them
    } catch (error: any) {
      logger.error('Error initializing WhatsApp service:', error);
    }
  }

  /**
   * Get or restore a session lazily (on-demand)
   * Only reconnects when user actually tries to use the account
   * Much more scalable than loading all sessions at startup
   */
  private async ensureSessionRestored(accountId: string, userId: string): Promise<WASession | null> {
    try {
      // Check if already in memory
      const inMemorySession = this.sessions.get(accountId);
      if (inMemorySession?.connected) {
        return inMemorySession;
      }

      // If not in memory or disconnected, try to restore
      const db = getDatabase();
      if (!db) return null;

      const account = await db.get(
        `SELECT * FROM whatsapp_accounts WHERE id = ? AND userId = ?`,
        [accountId, userId]
      );

      if (!account) {
        return null; // Account doesn't exist
      }

      logger.info(`Lazy loading session for account ${accountId}...`);
      
      // Try to restore from Baileys first
      if (account.sessionData) {
        try {
          await this.resumeSession(accountId, userId);
          const restored = this.sessions.get(accountId);
          if (restored?.connected) {
            return restored;
          }
        } catch (error: any) {
          logger.warn(`Failed to restore Baileys session ${accountId}: ${error.message}`);
        }
      }

      // Try to restore from whatsapp-web.js
      try {
        const { whatsappWebService } = await import('./whatsapp-web.service');
        const phoneNumber = account.phoneNumber;
        const restored = await (whatsappWebService as any).restoreSession?.(accountId, userId, phoneNumber);
        if (restored) {
          logger.info(`Successfully restored WhatsApp Web session for ${phoneNumber}`);
          const webSession = (whatsappWebService as any).sessions?.get(accountId);
          if (webSession) {
            return { ...webSession, connected: true } as any;
          }
        }
      } catch (error: any) {
        logger.warn(`Failed to restore whatsapp-web session ${accountId}: ${error.message}`);
      }

      return null;
    } catch (error: any) {
      logger.error('Error ensuring session restored:', error);
      return null;
    }
  }

  private async createAuthState(userId: string, accountId: string): Promise<any> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // Get existing session data from database
    const account = await db.get(
      `SELECT sessionData FROM whatsapp_accounts WHERE id = ? AND userId = ?`,
      [accountId, userId]
    );

    let auth: AuthenticationState;
    let sessionData: any = null;

    // Only restore session if it exists AND is not null
    if (account?.sessionData) {
      try {
        sessionData = JSON.parse(account.sessionData);
        logger.info(`Restoring session for account ${accountId}`);
      } catch (err) {
        logger.warn(`Failed to parse session data for ${accountId}, creating fresh credentials`);
        sessionData = null;
      }
    }

    // If no valid session data, create fresh credentials
    if (!sessionData) {
      logger.info(`Creating fresh credentials for account ${accountId}`);
      const creds = initAuthCreds();
      auth = {
        creds,
        keys: {
          get: () => ({}),
          set: () => {},
        } as any,
      };
    } else {
      // Use existing session data
      auth = {
        creds: sessionData.creds,
        keys: {
          get: (type: any, jids: any[]) => {
            const data: Record<string, any> = {};
            jids.forEach((jid) => {
              const key = `${type}.${jid}`;
              data[jid] = sessionData.keys?.[key];
            });
            return data;
          },
          set: (data: any) => {
            // Store keys in sessionData
            Object.entries(data).forEach(([jid, value]: [string, any]) => {
              const type = Object.keys(value || {})[0];
              if (type) {
                const key = `${type}.${jid}`;
                if (!sessionData.keys) sessionData.keys = {};
                sessionData.keys[key] = (value as any)[type];
              }
            });
          },
        } as any,
      };
    }

    // Ensure creds exist
    if (!auth.creds) {
      auth.creds = initAuthCreds();
    }

    const saveCreds = async () => {
      const creds = auth.creds;
      const keys = auth.keys;

      // Save to database
      await db.run(
        `UPDATE whatsapp_accounts 
         SET sessionData = ?, updatedAt = ? 
         WHERE id = ?`,
        [JSON.stringify({ creds, keys }), new Date().toISOString(), accountId]
      );
    };

    return {
      creds: auth.creds,
      keys: auth.keys,
      saveCreds,
    } as any;
  }

  /**
   * Start WhatsApp session and generate QR code
   */
  async startSession(userId: string, phoneNumber: string, onQRCode?: (qr: string) => void): Promise<string> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      // First, ensure user exists in database (create minimal record if needed)
      const existingUser = await db.get(
        `SELECT id FROM users WHERE id = ?`,
        [userId]
      );

      if (!existingUser) {
        // Create minimal user record if it doesn't exist
        const now = new Date().toISOString();
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
            now,
            now,
          ]
        );
      }

      const accountId = uuidv4();
      const now = new Date();

      // First, check if this phone number exists for ANY user
      const anyExistingAccount = await db.get(
        `SELECT id, userId FROM whatsapp_accounts WHERE phoneNumber = ?`,
        [phoneNumber]
      );

      let accountToUse = accountId;

      if (anyExistingAccount) {
        // If it exists for the same user, reuse it but clear the session data
        if (anyExistingAccount.userId === userId) {
          accountToUse = anyExistingAccount.id;
          // Clear old session data to force fresh QR generation
          await db.run(
            `UPDATE whatsapp_accounts SET sessionData = NULL, isActive = 0, updatedAt = ? WHERE id = ?`,
            [now.toISOString(), accountToUse]
          );
          // Also remove from memory
          this.sessions.delete(accountToUse);
        } else {
          // If it exists for a different user, delete it first (old session cleanup)
          await db.run(
            `DELETE FROM whatsapp_accounts WHERE id = ?`,
            [anyExistingAccount.id]
          );
          
          // Now create new account
          await db.run(
            `INSERT INTO whatsapp_accounts (id, userId, phoneNumber, isActive, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [accountId, userId, phoneNumber, 1, now.toISOString(), now.toISOString()]
          );
        }
      } else {
        // Create new account
        await db.run(
          `INSERT INTO whatsapp_accounts (id, userId, phoneNumber, isActive, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [accountId, userId, phoneNumber, 1, now.toISOString(), now.toISOString()]
        );
      }

      // Create authentication state
      const auth = await this.createAuthState(userId, accountToUse);

      // Store session FIRST (before socket creation)
      this.sessions.set(accountToUse, {
        id: accountToUse,
        userId,
        phoneNumber,
        socket: null,
        connected: false,
        createdAt: now,
        lastActivity: now,
      });

      // Create socket
      const socket = makeWASocket({
        auth,
        printQRInTerminal: false,
        logger: {
          level: 'fatal',
          error: (msg: string) => logger.error('Baileys:', msg),
          warn: (msg: string) => logger.warn('Baileys:', msg),
          info: (msg: string) => logger.info('Baileys:', msg),
          debug: () => {},
          trace: () => {},
          child: () => ({
            level: 'fatal',
            error: (msg: string) => logger.error('Baileys:', msg),
            warn: (msg: string) => logger.warn('Baileys:', msg),
            info: (msg: string) => logger.info('Baileys:', msg),
            debug: () => {},
            trace: () => {},
          } as any),
        } as any,
        version: [2, 2413, 8],
        browser: ['Broadcaster', 'Desktop', '1.0.0'],
      });

      // Handle QR code
      socket.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          logger.info(`QR Code generated for ${phoneNumber} - accountId: ${accountToUse}`);
          if (onQRCode) {
            onQRCode(qr);
          }

          // Store QR code temporarily
          const session = this.sessions.get(accountToUse);
          if (session) {
            session.qrCode = qr;
            logger.info(`QR Code stored in session for ${accountToUse}`);
          }
        }

        // Only mark as connected when connection === 'open' (not on any connection update)
        // This prevents premature "connected" status before QR is actually scanned
        if (connection === 'open') {
          logger.info(`WhatsApp properly connected for ${phoneNumber}`);

          // Get phone info
          const phoneInfo = socket.user?.id?.replace(/:.*/, '') || phoneNumber;

          // Update session
          await db.run(
            `UPDATE whatsapp_accounts 
             SET isActive = 1, lastLogin = ? 
             WHERE id = ?`,
            [now.toISOString(), accountToUse]
          );

          const session = this.sessions.get(accountToUse);
          if (session) {
            session.connected = true;
            session.phoneNumber = phoneInfo;
            session.lastActivity = new Date();
            logger.info(`Session marked as connected for ${accountToUse}`);
          }
        }

        if (connection === 'close') {
          logger.warn(`Connection closed for ${accountToUse}`);
          const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== 401;

          // Mark as disconnected immediately
          const session = this.sessions.get(accountToUse);
          if (session) {
            session.connected = false;
            logger.info(`Session marked as disconnected for ${accountToUse}`);
          }

          if (shouldReconnect) {
            logger.info(`Auto-reconnecting ${phoneNumber}...`);
            // Wait before reconnecting
            setTimeout(async () => {
              try {
                await this.resumeSession(userId, accountToUse);
              } catch (err) {
                logger.error(`Failed to auto-reconnect ${phoneNumber}:`, err);
              }
            }, 3000);
          } else {
            logger.warn(`Not reconnecting ${phoneNumber} - logged out`);
            await this.disconnectSession(accountToUse);
          }
        }
      });

      // Handle incoming messages
      socket.ev.on('messages.upsert', async (m: any) => {
        logger.info(`Message received: ${m.messages[0]?.key?.remoteJid}`);
      });

      // Update session with socket
      const sessionToUpdate = this.sessions.get(accountToUse);
      if (sessionToUpdate) {
        sessionToUpdate.socket = socket;
      }

      return accountToUse;
    } catch (error: any) {
      logger.error('Error starting WhatsApp session:', error);
      throw error;
    }
  }

  /**
   * Resume an existing session using stored credentials
   * This is useful when the connection drops but credentials are still valid
   */
  async resumeSession(accountId: string, userId: string): Promise<string> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      logger.info(`Attempting to resume session ${accountId}`);

      // Verify account ownership
      const account = await db.get(
        `SELECT * FROM whatsapp_accounts WHERE id = ? AND userId = ?`,
        [accountId, userId]
      );

      if (!account) {
        throw new Error('WhatsApp account not found');
      }

      if (!account.sessionData) {
        throw new Error('No stored credentials for this account. Please scan QR code again.');
      }

      // Create authentication state from stored data
      const auth = await this.createAuthState(userId, accountId);

      const socket = makeWASocket({
        auth,
        printQRInTerminal: false,
        logger: {
          level: 'fatal',
          error: (msg: string) => logger.error('Baileys Resume:', msg),
          warn: (msg: string) => logger.warn('Baileys Resume:', msg),
          info: (msg: string) => logger.info('Baileys Resume:', msg),
          debug: () => {},
          trace: () => {},
          child: () => ({
            error: () => {},
            warn: () => {},
            info: () => {},
            debug: () => {},
            trace: () => {},
          }),
        } as any,
      });

      // Handle connection events
      socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        logger.info(`Resume: Connection update: connection=${connection}, qr=${!!qr}`);

        if (connection === 'open') {
          logger.info(`Session resumed and connected: ${accountId}`);
          const phoneInfo = socket.user?.id?.replace(/:.*/, '') || account.phoneNumber;

          // Update session
          await db.run(
            `UPDATE whatsapp_accounts 
             SET isActive = 1, lastLogin = ? 
             WHERE id = ?`,
            [new Date().toISOString(), accountId]
          );

          const session = this.sessions.get(accountId);
          if (session) {
            session.connected = true;
            session.phoneNumber = phoneInfo;
            session.lastActivity = new Date();
            logger.info(`Session marked as connected after resume: ${accountId}`);
          }
        }

        if (connection === 'close') {
          logger.warn(`Resume: Connection closed for ${accountId}`);
          const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== 401;
          if (!shouldReconnect) {
            logger.info(`Not reconnecting - logged out`);
            await this.disconnectSession(accountId);
          }
        }
      });

      socket.ev.on('creds.update', async () => {
        logger.info(`Resume: Credentials updated for ${accountId}`);
        // Credentials are auto-saved in createAuthState.saveCreds
      });

      socket.ev.on('messages.upsert', async (m: any) => {
        logger.info(`Resume: Message received for ${accountId}`);
      });

      // Store socket
      const session = this.sessions.get(accountId);
      if (session) {
        session.socket = socket;
      } else {
        this.sessions.set(accountId, {
          id: accountId,
          userId,
          phoneNumber: account.phoneNumber,
          socket,
          connected: false,
          createdAt: new Date(),
          lastActivity: new Date(),
        });
      }

      logger.info(`Session resume in progress for ${accountId}`);
      return accountId;
    } catch (error: any) {
      logger.error('Error resuming session:', error);
      throw error;
    }
  }

  /**
   * Send message via WhatsApp
   */
  async sendMessage(accountId: string, userId: string, phoneNumber: string, message: string): Promise<string> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      // Validate account ownership
      const account = await db.get(
        `SELECT * FROM whatsapp_accounts WHERE id = ? AND userId = ?`,
        [accountId, userId]
      );

      if (!account) {
        throw new Error('WhatsApp account not found');
      }

      // Try to ensure session is restored (lazy load if needed)
      const session = await this.ensureSessionRestored(accountId, userId);
      if (!session || !session.connected) {
        throw new Error('WhatsApp account not connected. Please scan QR code or try Resume button.');
      }

      // Format phone number for WhatsApp (add country code if needed)
      const jid = phoneNumber.replace(/\D/g, '');
      const formattedJid = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;

      // Send message
      const response = await session.socket.sendMessage(formattedJid, { text: message });

      session.lastActivity = new Date();

      logger.info(`Message sent to ${phoneNumber}`);
      return response.key.id;
    } catch (error: any) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send media message
   */
  async sendMediaMessage(
    accountId: string,
    userId: string,
    phoneNumber: string,
    mediaType: 'image' | 'video' | 'document',
    mediaBuffer: Buffer,
    caption?: string
  ): Promise<string> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const session = this.sessions.get(accountId);
      if (!session || !session.connected) {
        throw new Error('WhatsApp account not connected');
      }

      // Validate account ownership
      const account = await db.get(
        `SELECT * FROM whatsapp_accounts WHERE id = ? AND userId = ?`,
        [accountId, userId]
      );

      if (!account) {
        throw new Error('WhatsApp account not found');
      }

      const jid = phoneNumber.replace(/\D/g, '');
      const formattedJid = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;

      const messageContent: any = {};

      if (mediaType === 'image') {
        messageContent.image = mediaBuffer;
      } else if (mediaType === 'video') {
        messageContent.video = mediaBuffer;
      } else if (mediaType === 'document') {
        messageContent.document = mediaBuffer;
      }

      if (caption) {
        messageContent.caption = caption;
      }

      const response = await session.socket.sendMessage(formattedJid, messageContent);

      session.lastActivity = new Date();

      logger.info(`Media message sent to ${phoneNumber}`);
      return response.key.id;
    } catch (error: any) {
      logger.error('Error sending media message:', error);
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

      // Check BOTH Baileys and whatsapp-web.js services
      let session = this.sessions.get(accountId);
      let isConnected = session ? session.connected : false;
      
      // If not connected in Baileys, check whatsapp-web.js
      if (!isConnected) {
        try {
          // Import the whatsapp-web service to check its session status
          const { whatsappWebService } = await import('./whatsapp-web.service');
          const webSession = (whatsappWebService as any).sessions?.get(accountId);
          if (webSession?.connected) {
            isConnected = true;
            logger.info(`Session ${accountId} is connected via whatsapp-web.js`);
          }
        } catch (err) {
          // Ignore import errors
        }
      }

      // Log connection status details
      logger.info(`Session status for ${accountId}: 
        - Baileys in memory: ${session ? 'YES' : 'NO'}
        - Baileys connected: ${session ? session.connected : 'N/A'}
        - Final connected: ${isConnected}
        - DB isActive: ${account.isActive}`);

      return {
        id: account.id,
        phoneNumber: account.phoneNumber,
        connected: isConnected,
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
   * Does NOT trigger lazy loading - just shows current in-memory status
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
        let isConnected = session ? session.connected : false;
        
        // If not connected in Baileys, check whatsapp-web.js
        if (!isConnected) {
          try {
            const { whatsappWebService } = require('./whatsapp-web.service');
            const webSession = (whatsappWebService as any).sessions?.get(account.id);
            if (webSession?.connected) {
              isConnected = true;
            }
          } catch (err) {
            // Ignore import errors
          }
        }
        
        return {
          id: account.id,
          phoneNumber: account.phoneNumber,
          connected: isConnected,
          isActive: Boolean(account.isActive), // Has stored credentials
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
      if (session) {
        await session.socket?.end?.();
        this.sessions.delete(accountId);

        const db = getDatabase();
        if (db) {
          await db.run(
            `UPDATE whatsapp_accounts SET isActive = 0, updatedAt = ? WHERE id = ?`,
            [new Date().toISOString(), accountId]
          );
        }

        logger.info(`Session ${accountId} disconnected`);
      }
    } catch (error: any) {
      logger.error('Error disconnecting session:', error);
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

export const whatsappService = new WhatsAppService();
