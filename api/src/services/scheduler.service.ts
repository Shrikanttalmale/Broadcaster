import { getDatabase } from './database.service';
import { logger } from '../utils/logger';
import { campaignsService } from './campaigns.service';
import { broadcastService } from './broadcast.service';
import { v4 as uuidv4 } from 'uuid';
import * as cron from 'node-cron';

interface Schedule {
  id: string;
  campaignId: string;
  userId: string;
  cronExpression: string;
  timezone: string;
  isActive: boolean;
  lastExecuted?: Date;
  nextExecution?: Date;
  executionCount: number;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CronTask {
  campaignId: string;
  task: cron.ScheduledTask;
}

class SchedulerService {
  private scheduledTasks: Map<string, CronTask> = new Map();
  private executionLog: Map<string, Date[]> = new Map(); // Track execution times for rate limiting

  /**
   * Create a schedule for a campaign
   */
  async createSchedule(
    userId: string,
    campaignId: string,
    cronExpression: string,
    timezone: string = 'Asia/Kolkata'
  ): Promise<Schedule> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      // Validate cron expression
      const validation = this.validateCronExpression(cronExpression);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Verify campaign exists
      const campaign = await campaignsService.getCampaign(userId, campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const scheduleId = uuidv4();
      const now = new Date();

      await db.run(
        `CREATE TABLE IF NOT EXISTS schedules (
          id TEXT PRIMARY KEY,
          campaignId TEXT NOT NULL,
          userId TEXT NOT NULL,
          cronExpression TEXT NOT NULL,
          timezone TEXT DEFAULT 'Asia/Kolkata',
          isActive BOOLEAN DEFAULT 1,
          lastExecuted DATETIME,
          nextExecution DATETIME,
          executionCount INTEGER DEFAULT 0,
          failureCount INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      );

      // Calculate next execution time
      const nextExecution = this.calculateNextExecution(cronExpression, timezone);

      await db.run(
        `INSERT INTO schedules (id, campaignId, userId, cronExpression, timezone, isActive, nextExecution, executionCount, failureCount, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          scheduleId,
          campaignId,
          userId,
          cronExpression,
          timezone,
          1,
          nextExecution.toISOString(),
          0,
          0,
          now.toISOString(),
          now.toISOString(),
        ]
      );

      logger.info(`Schedule created: ${scheduleId} for campaign ${campaignId}`);

      // Start the scheduled task
      await this.startSchedule(userId, scheduleId);

      return {
        id: scheduleId,
        campaignId,
        userId,
        cronExpression,
        timezone,
        isActive: true,
        nextExecution,
        executionCount: 0,
        failureCount: 0,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error: any) {
      logger.error('Error creating schedule:', error);
      throw error;
    }
  }

  /**
   * Validate cron expression
   */
  private validateCronExpression(expression: string): { valid: boolean; error?: string } {
    try {
      // Check if it's a valid cron expression
      cron.validate(expression);
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: `Invalid cron expression: ${error.message}` };
    }
  }

  /**
   * Calculate next execution time (simplified - use current time + offset)
   */
  private calculateNextExecution(cronExpression: string, timezone: string): Date {
    try {
      // For simplicity, return 1 minute from now as next execution
      // In production, use node-cron or cron-parser for accurate calculation
      const next = new Date();
      next.setMinutes(next.getMinutes() + 1);
      return next;
    } catch (error: any) {
      logger.error('Error calculating next execution:', error);
      return new Date(Date.now() + 60000);
    }
  }

  /**
   * Start a schedule
   */
  async startSchedule(userId: string, scheduleId: string): Promise<void> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const schedule = await db.get(
        `SELECT * FROM schedules WHERE id = ? AND userId = ?`,
        [scheduleId, userId]
      );

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      if (!schedule.isActive) {
        throw new Error('Schedule is not active');
      }

      // Stop existing task if any
      if (this.scheduledTasks.has(scheduleId)) {
        this.stopSchedule(scheduleId);
      }

      try {
        // Create and start cron task
        const task = cron.schedule(schedule.cronExpression, async () => {
          await this.executeSchedule(userId, scheduleId);
        });

        // Store the task
        this.scheduledTasks.set(scheduleId, {
          campaignId: schedule.campaignId,
          task,
        });

        logger.info(`Schedule started: ${scheduleId} (${schedule.cronExpression})`);
      } catch (error: any) {
        logger.error(`Failed to create cron task for ${scheduleId}:`, error);
        throw new Error(`Invalid cron expression: ${error.message}`);
      }
    } catch (error: any) {
      logger.error('Error starting schedule:', error);
      throw error;
    }
  }

  /**
   * Execute a scheduled campaign
   */
  private async executeSchedule(userId: string, scheduleId: string): Promise<void> {
    const db = getDatabase();
    if (!db) {
      logger.error('Database not initialized for schedule execution');
      return;
    }

    try {
      const schedule = await db.get(
        `SELECT * FROM schedules WHERE id = ? AND userId = ?`,
        [scheduleId, userId]
      );

      if (!schedule) {
        logger.error(`Schedule not found: ${scheduleId}`);
        return;
      }

      logger.info(`Executing schedule: ${scheduleId} for campaign ${schedule.campaignId}`);

      try {
        // Get campaign details
        const campaign = await campaignsService.getCampaign(userId, schedule.campaignId);
        if (!campaign) {
          throw new Error('Campaign not found');
        }

        // Get available WhatsApp accounts
        const accounts = await db.all(
          `SELECT id FROM whatsapp_accounts WHERE userId = ? AND isActive = 1 LIMIT 5`,
          [userId]
        );

        if (accounts.length === 0) {
          throw new Error('No active WhatsApp accounts available');
        }

        const accountIds = accounts.map((a) => a.id);

        // Queue messages for this campaign
        const result = await broadcastService.queueCampaignMessages(
          userId,
          schedule.campaignId,
          accountIds,
          campaign.messageTemplate,
          campaign.delayMin,
          campaign.delayMax,
          campaign.throttlePerMinute,
          campaign.retryAttempts
        );

        // Update schedule execution info
        const now = new Date();
        const nextExecution = this.calculateNextExecution(schedule.cronExpression, schedule.timezone);

        await db.run(
          `UPDATE schedules SET lastExecuted = ?, nextExecution = ?, executionCount = executionCount + 1, updatedAt = ?
           WHERE id = ?`,
          [now.toISOString(), nextExecution.toISOString(), now.toISOString(), scheduleId]
        );

        // Update campaign status to running
        await campaignsService.updateCampaign(userId, schedule.campaignId, undefined, undefined, 'running');

        logger.info(
          `Schedule executed successfully: ${scheduleId} (queued ${result.queued} messages)`
        );
      } catch (error: any) {
        logger.error(`Schedule execution failed: ${scheduleId}:`, error);

        // Update failure count
        await db.run(
          `UPDATE schedules SET failureCount = failureCount + 1, updatedAt = ?
           WHERE id = ?`,
          [new Date().toISOString(), scheduleId]
        );
      }
    } catch (error: any) {
      logger.error('Error in executeSchedule:', error);
    }
  }

  /**
   * Stop a schedule
   */
  stopSchedule(scheduleId: string): void {
    const cronTask = this.scheduledTasks.get(scheduleId);
    if (cronTask) {
      cronTask.task.stop();
      this.scheduledTasks.delete(scheduleId);
      logger.info(`Schedule stopped: ${scheduleId}`);
    }
  }

  /**
   * Get schedule by ID
   */
  async getSchedule(userId: string, scheduleId: string): Promise<Schedule | null> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const schedule = await db.get(
        `SELECT * FROM schedules WHERE id = ? AND userId = ?`,
        [scheduleId, userId]
      );

      if (!schedule) {
        return null;
      }

      return {
        ...schedule,
        isActive: Boolean(schedule.isActive),
        lastExecuted: schedule.lastExecuted ? new Date(schedule.lastExecuted) : undefined,
        nextExecution: schedule.nextExecution ? new Date(schedule.nextExecution) : undefined,
        createdAt: new Date(schedule.createdAt),
        updatedAt: new Date(schedule.updatedAt),
      };
    } catch (error: any) {
      logger.error('Error getting schedule:', error);
      throw error;
    }
  }

  /**
   * Get all schedules for a user
   */
  async getSchedules(
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ schedules: Schedule[]; total: number; pages: number }> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await db.get(
        `SELECT COUNT(*) as count FROM schedules WHERE userId = ?`,
        [userId]
      );
      const total = countResult?.count || 0;

      // Get paginated results
      const schedules = await db.all(
        `SELECT * FROM schedules WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      return {
        schedules: schedules.map((s: any) => ({
          ...s,
          isActive: Boolean(s.isActive),
          lastExecuted: s.lastExecuted ? new Date(s.lastExecuted) : undefined,
          nextExecution: s.nextExecution ? new Date(s.nextExecution) : undefined,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        })),
        total,
        pages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      logger.error('Error getting schedules:', error);
      throw error;
    }
  }

  /**
   * Update schedule
   */
  async updateSchedule(
    userId: string,
    scheduleId: string,
    cronExpression?: string,
    isActive?: boolean
  ): Promise<Schedule> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const schedule = await this.getSchedule(userId, scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      const newCronExpression = cronExpression || schedule.cronExpression;
      const newIsActive = isActive !== undefined ? isActive : schedule.isActive;

      // Validate new cron expression if provided
      if (cronExpression) {
        const validation = this.validateCronExpression(cronExpression);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }

      const now = new Date();
      const nextExecution = this.calculateNextExecution(newCronExpression, schedule.timezone);

      await db.run(
        `UPDATE schedules SET cronExpression = ?, isActive = ?, nextExecution = ?, updatedAt = ?
         WHERE id = ? AND userId = ?`,
        [
          newCronExpression,
          newIsActive ? 1 : 0,
          nextExecution.toISOString(),
          now.toISOString(),
          scheduleId,
          userId,
        ]
      );

      // Stop existing task
      if (this.scheduledTasks.has(scheduleId)) {
        this.stopSchedule(scheduleId);
      }

      // Start if active
      if (newIsActive) {
        await this.startSchedule(userId, scheduleId);
      }

      logger.info(`Schedule updated: ${scheduleId}`);

      return await this.getSchedule(userId, scheduleId) as Schedule;
    } catch (error: any) {
      logger.error('Error updating schedule:', error);
      throw error;
    }
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(userId: string, scheduleId: string): Promise<void> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      // Stop the task
      this.stopSchedule(scheduleId);

      const result = await db.run(
        `DELETE FROM schedules WHERE id = ? AND userId = ?`,
        [scheduleId, userId]
      );

      if (result.changes === 0) {
        throw new Error('Schedule not found');
      }

      logger.info(`Schedule deleted: ${scheduleId}`);
    } catch (error: any) {
      logger.error('Error deleting schedule:', error);
      throw error;
    }
  }

  /**
   * Get scheduler statistics
   */
  async getStats(userId: string): Promise<any> {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    try {
      const stats = await db.get(
        `SELECT 
          COUNT(*) as totalSchedules,
          SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as activeSchedules,
          SUM(executionCount) as totalExecutions,
          SUM(failureCount) as totalFailures
         FROM schedules WHERE userId = ?`,
        [userId]
      );

      return {
        totalSchedules: stats.totalSchedules || 0,
        activeSchedules: stats.activeSchedules || 0,
        totalExecutions: stats.totalExecutions || 0,
        totalFailures: stats.totalFailures || 0,
        tasksRunning: this.scheduledTasks.size,
      };
    } catch (error: any) {
      logger.error('Error getting scheduler stats:', error);
      throw error;
    }
  }

  /**
   * Stop all schedules (for graceful shutdown)
   */
  stopAll(): void {
    for (const [scheduleId] of this.scheduledTasks) {
      this.stopSchedule(scheduleId);
    }
    logger.info('All schedules stopped');
  }
}

export const schedulerService = new SchedulerService();
