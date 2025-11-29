import { getDatabase } from './database.service';
import { logger } from '../utils/logger';
import { templatesService } from './templates.service';
import { v4 as uuidv4 } from 'uuid';

export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  description?: string;
  messageTemplate: string;
  status: CampaignStatus;
  scheduledFor?: Date;
  startedAt?: Date;
  completedAt?: Date;
  totalContacts: number;
  sentCount: number;
  failedCount: number;
  delayMin: number;
  delayMax: number;
  throttlePerMinute: number;
  retryAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}

class CampaignsService {
  /**
   * Validate campaign name
   */
  private validateName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length < 2) {
      return { valid: false, error: 'Campaign name must be at least 2 characters' };
    }
    if (name.length > 100) {
      return { valid: false, error: 'Campaign name must not exceed 100 characters' };
    }
    return { valid: true };
  }

  /**
   * Create a new campaign
   */
  async createCampaign(
    userId: string,
    name: string,
    templateId: string,
    description?: string,
    scheduledFor?: Date,
    delayMin: number = 5000,
    delayMax: number = 15000,
    throttlePerMinute: number = 60,
    retryAttempts: number = 3
  ): Promise<Campaign> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // Validate name
    const nameValidation = this.validateName(name);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error);
    }

    try {
      // Verify template exists and belongs to user
      const template = await templatesService.getTemplate(userId, templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Validate scheduling parameters
      if (scheduledFor && new Date(scheduledFor) < new Date()) {
        throw new Error('Scheduled time must be in the future');
      }

      // Validate delay parameters
      if (delayMin < 0 || delayMax < 0) {
        throw new Error('Delay parameters must be positive');
      }
      if (delayMin > delayMax) {
        throw new Error('Minimum delay must be less than or equal to maximum delay');
      }

      if (throttlePerMinute < 1 || throttlePerMinute > 1000) {
        throw new Error('Throttle must be between 1 and 1000 messages per minute');
      }

      if (retryAttempts < 0 || retryAttempts > 10) {
        throw new Error('Retry attempts must be between 0 and 10');
      }

      const campaignId = uuidv4();
      const now = new Date();
      const status: CampaignStatus = scheduledFor ? 'scheduled' : 'draft';

      await db.run(
        `INSERT INTO campaigns (id, userId, name, description, messageTemplate, status, scheduledFor, delayMin, delayMax, throttlePerMinute, retryAttempts, totalContacts, sentCount, failedCount, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          campaignId,
          userId,
          name.trim(),
          description || null,
          templateId,
          status,
          scheduledFor ? new Date(scheduledFor).toISOString() : null,
          delayMin,
          delayMax,
          throttlePerMinute,
          retryAttempts,
          0,
          0,
          0,
          now.toISOString(),
          now.toISOString(),
        ]
      );

      logger.info(`Campaign created: ${campaignId} for user ${userId}`);

      return {
        id: campaignId,
        userId,
        name,
        description,
        messageTemplate: templateId,
        status,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        totalContacts: 0,
        sentCount: 0,
        failedCount: 0,
        delayMin,
        delayMax,
        throttlePerMinute,
        retryAttempts,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error: any) {
      logger.error('Error creating campaign:', error);
      throw error;
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(userId: string, campaignId: string): Promise<Campaign | null> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const campaign = await db.get(
        `SELECT * FROM campaigns WHERE id = ? AND userId = ?`,
        [campaignId, userId]
      );

      if (!campaign) {
        return null;
      }

      return {
        ...campaign,
        scheduledFor: campaign.scheduledFor ? new Date(campaign.scheduledFor) : undefined,
        startedAt: campaign.startedAt ? new Date(campaign.startedAt) : undefined,
        completedAt: campaign.completedAt ? new Date(campaign.completedAt) : undefined,
        createdAt: new Date(campaign.createdAt),
        updatedAt: new Date(campaign.updatedAt),
      };
    } catch (error: any) {
      logger.error('Error getting campaign:', error);
      throw error;
    }
  }

  /**
   * Get all campaigns for a user
   */
  async getCampaigns(
    userId: string,
    status?: CampaignStatus,
    search?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ campaigns: Campaign[]; total: number; pages: number }> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const offset = (page - 1) * limit;
      let query = `SELECT * FROM campaigns WHERE userId = ?`;
      const params: any[] = [userId];

      if (status) {
        query += ` AND status = ?`;
        params.push(status);
      }

      if (search) {
        query += ` AND name LIKE ?`;
        params.push(`%${search}%`);
      }

      // Get total count
      const countResult = await db.get(
        query.replace('SELECT *', 'SELECT COUNT(*) as count'),
        params
      );
      const total = countResult?.count || 0;

      // Get paginated results
      const campaigns = await db.all(
        query + ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        campaigns: campaigns.map((c: any) => ({
          ...c,
          scheduledFor: c.scheduledFor ? new Date(c.scheduledFor) : undefined,
          startedAt: c.startedAt ? new Date(c.startedAt) : undefined,
          completedAt: c.completedAt ? new Date(c.completedAt) : undefined,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        })),
        total,
        pages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      logger.error('Error getting campaigns:', error);
      throw error;
    }
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    userId: string,
    campaignId: string,
    name?: string,
    description?: string,
    status?: CampaignStatus,
    scheduledFor?: Date
  ): Promise<Campaign> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const campaign = await this.getCampaign(userId, campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (name) {
        const validation = this.validateName(name);
        if (!validation.valid) throw new Error(validation.error);
      }

      const newName = name || campaign.name;
      const newDescription = description !== undefined ? description : campaign.description;
      const newStatus = status || campaign.status;
      const newScheduledFor = scheduledFor !== undefined ? scheduledFor : campaign.scheduledFor;

      const now = new Date();

      await db.run(
        `UPDATE campaigns SET name = ?, description = ?, status = ?, scheduledFor = ?, updatedAt = ?
         WHERE id = ? AND userId = ?`,
        [
          newName,
          newDescription || null,
          newStatus,
          newScheduledFor ? new Date(newScheduledFor).toISOString() : null,
          now.toISOString(),
          campaignId,
          userId,
        ]
      );

      logger.info(`Campaign updated: ${campaignId}`);

      return {
        ...campaign,
        name: newName,
        description: newDescription,
        status: newStatus,
        scheduledFor: newScheduledFor,
        updatedAt: now,
      };
    } catch (error: any) {
      logger.error('Error updating campaign:', error);
      throw error;
    }
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(userId: string, campaignId: string): Promise<void> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const result = await db.run(
        `DELETE FROM campaigns WHERE id = ? AND userId = ?`,
        [campaignId, userId]
      );

      if (result.changes === 0) {
        throw new Error('Campaign not found');
      }

      // Also delete associated messages
      await db.run(`DELETE FROM messages WHERE campaignId = ?`, [campaignId]);

      logger.info(`Campaign deleted: ${campaignId}`);
    } catch (error: any) {
      logger.error('Error deleting campaign:', error);
      throw error;
    }
  }

  /**
   * Add contacts to campaign
   */
  async addContacts(userId: string, campaignId: string, contactIds: string[]): Promise<number> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const campaign = await this.getCampaign(userId, campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        throw new Error('Contact IDs array is required');
      }

      // Verify all contacts belong to the user and get their details
      const placeholders = contactIds.map(() => '?').join(',');
      const validContacts = await db.all(
        `SELECT id, phoneNumber, name, email FROM contacts WHERE id IN (${placeholders}) AND userId = ?`,
        [...contactIds, userId]
      );

      if (validContacts.length !== contactIds.length) {
        throw new Error('One or more contacts not found');
      }

      // Add contacts as messages with pending status
      const now = new Date();
      let addedCount = 0;

      for (const contact of validContacts) {
        const messageId = uuidv4();
        // Store contact data as JSON in message for template rendering
        const contactData = JSON.stringify({
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phoneNumber: contact.phoneNumber,
        });
        
        await db.run(
          `INSERT INTO messages (id, campaignId, phoneNumber, message, status, attemptCount, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [messageId, campaignId, contact.phoneNumber, contactData, 'pending', 0, now.toISOString(), now.toISOString()]
        );
        addedCount++;
      }

      // Update campaign total contacts
      const totalContacts = campaign.totalContacts + addedCount;
      await db.run(
        `UPDATE campaigns SET totalContacts = ?, updatedAt = ? WHERE id = ?`,
        [totalContacts, now.toISOString(), campaignId]
      );

      logger.info(`Added ${addedCount} contacts to campaign ${campaignId}`);
      return addedCount;
    } catch (error: any) {
      logger.error('Error adding contacts to campaign:', error);
      throw error;
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(userId: string, campaignId: string): Promise<any> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      // Verify campaign belongs to user
      const campaign = await this.getCampaign(userId, campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Get message stats
      const stats = await db.get(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
         FROM messages WHERE campaignId = ?`,
        [campaignId]
      );

      const successRate = stats.total > 0 
        ? ((stats.sent + stats.delivered + stats.read) / stats.total * 100).toFixed(2)
        : 0;

      return {
        campaignId,
        ...stats,
        successRate: parseFloat(String(successRate)),
      };
    } catch (error: any) {
      logger.error('Error getting campaign stats:', error);
      throw error;
    }
  }

  /**
   * Start campaign (change status to running)
   */
  async startCampaign(userId: string, campaignId: string): Promise<Campaign> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const campaign = await this.getCampaign(userId, campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status === 'running') {
        throw new Error('Campaign is already running');
      }

      const now = new Date();

      await db.run(
        `UPDATE campaigns SET status = ?, startedAt = ?, updatedAt = ?
         WHERE id = ? AND userId = ?`,
        ['running', now.toISOString(), now.toISOString(), campaignId, userId]
      );

      logger.info(`Campaign started: ${campaignId}`);

      return await this.getCampaign(userId, campaignId) as Campaign;
    } catch (error: any) {
      logger.error('Error starting campaign:', error);
      throw error;
    }
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(userId: string, campaignId: string): Promise<Campaign> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const campaign = await this.getCampaign(userId, campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const now = new Date();

      await db.run(
        `UPDATE campaigns SET status = ?, updatedAt = ?
         WHERE id = ? AND userId = ?`,
        ['paused', now.toISOString(), campaignId, userId]
      );

      logger.info(`Campaign paused: ${campaignId}`);

      return await this.getCampaign(userId, campaignId) as Campaign;
    } catch (error: any) {
      logger.error('Error pausing campaign:', error);
      throw error;
    }
  }
}

export const campaignsService = new CampaignsService();
