import { getDatabase } from './database.service';
import { logger } from '../utils/logger';
import { templatesService } from './templates.service';
import { whatsappService } from './whatsapp.service';
import { v4 as uuidv4 } from 'uuid';

interface MessageQueueItem {
  messageId: string;
  campaignId: string;
  contactId: string;
  phoneNumber: string;
  message: string;
  accountId: string;
  retryCount: number;
  maxRetries: number;
  scheduledTime: number; // timestamp
}

interface AccountUsage {
  accountId: string;
  messagesSent: number;
  lastReset: number;
}

class BroadcastService {
  private messageQueue: MessageQueueItem[] = [];
  private accountUsage: Map<string, AccountUsage> = new Map();
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  /**
   * Add campaign to queue for broadcasting
   */
  async queueCampaignMessages(
    userId: string,
    campaignId: string,
    accountIds: string[], // WhatsApp account IDs to use
    templateId: string,
    delayMin: number = 5000,
    delayMax: number = 15000,
    throttlePerMinute: number = 60,
    retryAttempts: number = 3
  ): Promise<{ queued: number; scheduled: number }> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      // Get pending messages for this campaign
      const pendingMessages = await db.all(
        `SELECT id as messageId, phoneNumber, message FROM messages
         WHERE campaignId = ? AND status = 'pending'
         LIMIT 1000`,
        [campaignId]
      );

      if (pendingMessages.length === 0) {
        logger.warn(`No pending messages for campaign ${campaignId}`);
        return { queued: 0, scheduled: 0 };
      }

      // Get template
      const template = await templatesService.getTemplate(userId, templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      let scheduledTime = Date.now();
      const delayRange = delayMax - delayMin;
      let accountIndex = 0;

      for (const msg of pendingMessages) {
        // Parse contact data from message field
        let contactData: any = { phoneNumber: msg.phoneNumber };
        try {
          if (msg.message && typeof msg.message === 'string' && msg.message.startsWith('{')) {
            contactData = JSON.parse(msg.message);
          }
        } catch (e) {
          // If message is not JSON, just use phoneNumber
          contactData.message = msg.message;
        }

        // Rotate through available accounts
        const accountId = accountIds[accountIndex % accountIds.length];
        accountIndex++;

        // Add random delay between min and max
        const randomDelay = Math.floor(Math.random() * delayRange) + delayMin;
        scheduledTime += randomDelay;

        // Render template with contact data
        const renderedMessage = templatesService.renderTemplate(template.body, contactData);

        // Add to queue
        this.messageQueue.push({
          messageId: msg.messageId,
          campaignId,
          contactId: contactData.id || '', // ID might not be needed
          phoneNumber: msg.phoneNumber,
          message: renderedMessage,
          accountId,
          retryCount: 0,
          maxRetries: retryAttempts,
          scheduledTime,
        });

        // Update message as queued in database
        await db.run(
          `UPDATE messages SET status = 'queued' WHERE id = ?`,
          [msg.messageId]
        );
      }

      logger.info(`Queued ${pendingMessages.length} messages for campaign ${campaignId}`);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.startProcessing();
      }

      return { queued: pendingMessages.length, scheduled: this.messageQueue.length };
    } catch (error: any) {
      logger.error('Error queuing campaign messages:', error);
      throw error;
    }
  }

  /**
   * Start processing message queue
   */
  private startProcessing(): void {
    if (this.isProcessing) {
      logger.debug('Message processing already running');
      return;
    }

    this.isProcessing = true;
    logger.info('Starting message queue processor');

    // Process messages every 500ms
    this.processingInterval = setInterval(async () => {
      await this.processBatch();
    }, 500);
  }

  /**
   * Stop processing message queue
   */
  public stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
    logger.info('Stopped message queue processor');
  }

  /**
   * Process a batch of messages
   */
  private async processBatch(): Promise<void> {
    const db = getDatabase();
    if (!db || this.messageQueue.length === 0) return;

    const now = Date.now();

    // Find messages that are ready to send
    const readyMessages = this.messageQueue.filter((m) => m.scheduledTime <= now);

    if (readyMessages.length === 0) return;

    // Group by account for rate limiting
    const messagesByAccount = new Map<string, MessageQueueItem[]>();
    for (const msg of readyMessages) {
      if (!messagesByAccount.has(msg.accountId)) {
        messagesByAccount.set(msg.accountId, []);
      }
      messagesByAccount.get(msg.accountId)!.push(msg);
    }

    // Process messages respecting rate limits
    for (const [accountId, messages] of messagesByAccount.entries()) {
      const usage = this.getAccountUsage(accountId);

      // Check if account has reached rate limit for this minute
      const now = Date.now();
      const timeWindow = 60000; // 1 minute
      if (now - usage.lastReset > timeWindow) {
        // Reset counter
        usage.messagesSent = 0;
        usage.lastReset = now;
      }

      // Send messages up to throttle limit
      const canSend = Math.min(messages.length, 20 - usage.messagesSent); // Max 20 per batch

      for (let i = 0; i < canSend; i++) {
        const msg = messages[i];

        try {
          // Send message via WhatsApp
          const result = await whatsappService.sendMessage(
            msg.accountId,
            '', // userId will be derived from account
            msg.phoneNumber,
            msg.message
          );

          if (result) {
            // Update message as sent
            await db.run(
              `UPDATE messages SET status = 'sent', sentAt = ?, attemptCount = attemptCount + 1, updatedAt = ?
               WHERE id = ?`,
              [new Date().toISOString(), new Date().toISOString(), msg.messageId]
            );

            // Update campaign sent count
            await db.run(
              `UPDATE campaigns SET sentCount = sentCount + 1 WHERE id = ?`,
              [msg.campaignId]
            );

            usage.messagesSent++;

            logger.info(`Message sent: ${msg.phoneNumber} (${msg.messageId})`);

            // Remove from queue
            const index = this.messageQueue.indexOf(msg);
            if (index > -1) {
              this.messageQueue.splice(index, 1);
            }
          }
        } catch (error: any) {
          logger.error(`Error sending message ${msg.messageId}:`, error);

          if (msg.retryCount < msg.maxRetries) {
            // Retry later with exponential backoff
            msg.retryCount++;
            msg.scheduledTime = now + Math.pow(2, msg.retryCount) * 5000; // 5s, 10s, 20s, etc.
            logger.info(`Message queued for retry: ${msg.messageId} (attempt ${msg.retryCount})`);
          } else {
            // Mark as failed
            try {
              await db.run(
                `UPDATE messages SET status = 'failed', lastError = ?, attemptCount = attemptCount + 1, updatedAt = ?
                 WHERE id = ?`,
                [error.message, new Date().toISOString(), msg.messageId]
              );

              // Update campaign failed count
              await db.run(
                `UPDATE campaigns SET failedCount = failedCount + 1 WHERE id = ?`,
                [msg.campaignId]
              );

              logger.error(`Message failed after ${msg.maxRetries} attempts: ${msg.messageId}`);

              // Remove from queue
              const index = this.messageQueue.indexOf(msg);
              if (index > -1) {
                this.messageQueue.splice(index, 1);
              }
            } catch (dbError) {
              logger.error('Error updating failed message:', dbError);
            }
          }
        }
      }
    }

    // Log queue status
    if (this.messageQueue.length > 0) {
      const nextSend = Math.min(...this.messageQueue.map((m) => m.scheduledTime));
      const waitTime = Math.max(0, nextSend - now);
      logger.debug(
        `Message queue: ${this.messageQueue.length} pending, next send in ${(waitTime / 1000).toFixed(1)}s`
      );
    }
  }

  /**
   * Get account usage for rate limiting
   */
  private getAccountUsage(accountId: string): AccountUsage {
    if (!this.accountUsage.has(accountId)) {
      this.accountUsage.set(accountId, {
        accountId,
        messagesSent: 0,
        lastReset: Date.now(),
      });
    }
    return this.accountUsage.get(accountId)!;
  }

  /**
   * Send direct message
   */
  async sendDirectMessage(
    userId: string,
    accountId: string,
    contactId: string,
    message: string
  ): Promise<string> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      // Get contact
      const contact = await db.get(
        `SELECT * FROM contacts WHERE id = ? AND userId = ?`,
        [contactId, userId]
      );

      if (!contact) {
        throw new Error('Contact not found');
      }

      // Send message
      const result = await whatsappService.sendMessage(
        accountId,
        userId,
        contact.phoneNumber,
        message
      );

      if (!result) {
        throw new Error('Failed to send message');
      }

      // Log message (direct messages don't belong to a campaign)
      const messageId = uuidv4();
      const now = new Date();

      await db.run(
        `INSERT INTO messages (id, phoneNumber, message, status, attemptCount, sentAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          messageId,
          contact.phoneNumber,
          message,
          'sent',
          1,
          now.toISOString(),
          now.toISOString(),
          now.toISOString(),
        ]
      );

      logger.info(`Direct message sent: ${contact.phoneNumber}`);
      return messageId;
    } catch (error: any) {
      logger.error('Error sending direct message:', error);
      throw error;
    }
  }

  /**
   * Get message status
   */
  async getMessageStatus(userId: string, messageId: string): Promise<any> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const message = await db.get(
        `SELECT * FROM messages WHERE id = ?`,
        [messageId]
      );

      if (!message) {
        throw new Error('Message not found');
      }

      return {
        id: message.id,
        phoneNumber: message.phoneNumber,
        status: message.status,
        attemptCount: message.attemptCount,
        lastError: message.lastError,
        sentAt: message.sentAt,
        deliveredAt: message.deliveredAt,
        createdAt: message.createdAt,
      };
    } catch (error: any) {
      logger.error('Error getting message status:', error);
      throw error;
    }
  }

  /**
   * Get campaign progress
   */
  async getCampaignProgress(userId: string, campaignId: string): Promise<any> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      // Verify campaign belongs to user
      const campaign = await db.get(
        `SELECT * FROM campaigns WHERE id = ? AND userId = ?`,
        [campaignId, userId]
      );

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Get detailed stats
      const stats = await db.get(
        `SELECT 
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          COUNT(*) as total
         FROM messages WHERE campaignId = ?`,
        [campaignId]
      );

      const successRate = stats.total > 0
        ? ((stats.sent + stats.delivered + stats.read) / stats.total * 100).toFixed(2)
        : 0;

      const queuedInMemory = this.messageQueue.filter((m) => m.campaignId === campaignId).length;

      return {
        campaignId,
        status: campaign.status,
        total: stats.total,
        pending: stats.pending,
        queued: stats.queued,
        queuedInMemory,
        sent: stats.sent,
        delivered: stats.delivered,
        read: stats.read,
        failed: stats.failed,
        successRate: parseFloat(String(successRate)),
      };
    } catch (error: any) {
      logger.error('Error getting campaign progress:', error);
      throw error;
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(): any {
    return {
      totalQueued: this.messageQueue.length,
      isProcessing: this.isProcessing,
      accountsInUse: this.accountUsage.size,
    };
  }

  /**
   * Clear queue (for testing/manual reset)
   */
  clearQueue(): void {
    this.messageQueue = [];
    logger.warn('Message queue cleared');
  }
}

export const broadcastService = new BroadcastService();
