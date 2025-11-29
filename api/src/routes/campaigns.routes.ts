import { Router, Request, Response } from 'express';
import authMiddleware from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { campaignsService } from '../services/campaigns.service';
import { broadcastService } from '../services/broadcast.service';
import { getDatabase } from '../services/database.service';

const router = Router();

/**
 * POST /campaigns
 * Create a new campaign
 */
router.post('/', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      templateId,
      scheduledFor,
      delayMin = 5000,
      delayMax = 15000,
      throttlePerMinute = 60,
      retryAttempts = 3,
    } = req.body;

    const campaign = await campaignsService.createCampaign(
      req.user!.id,
      name,
      templateId,
      description,
      scheduledFor ? new Date(scheduledFor) : undefined,
      delayMin,
      delayMax,
      throttlePerMinute,
      retryAttempts
    );

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: { campaign },
    });
  } catch (error: any) {
    logger.error('Error creating campaign:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'CREATE_ERROR',
    });
  }
});

/**
 * GET /campaigns
 * Get all campaigns for the user
 */
router.get('/', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { status, search, page = '1', limit = '50' } = req.query;

    const result = await campaignsService.getCampaigns(
      req.user!.id,
      status as any,
      search as string,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_ERROR',
    });
  }
});

/**
 * GET /campaigns/:id
 * Get a single campaign
 */
router.get('/:id', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const campaign = await campaignsService.getCampaign(req.user!.id, id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        code: 'NOT_FOUND',
      });
    }

    res.json({
      success: true,
      data: { campaign },
    });
  } catch (error: any) {
    logger.error('Error fetching campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_ERROR',
    });
  }
});

/**
 * PUT /campaigns/:id
 * Update a campaign
 */
router.put('/:id', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, status, scheduledFor } = req.body;

    const campaign = await campaignsService.updateCampaign(
      req.user!.id,
      id,
      name,
      description,
      status,
      scheduledFor ? new Date(scheduledFor) : undefined
    );

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: { campaign },
    });
  } catch (error: any) {
    logger.error('Error updating campaign:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'UPDATE_ERROR',
    });
  }
});

/**
 * DELETE /campaigns/:id
 * Delete a campaign
 */
router.delete('/:id', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await campaignsService.deleteCampaign(req.user!.id, id);

    res.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting campaign:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'DELETE_ERROR',
    });
  }
});

/**
 * POST /campaigns/:id/add-contacts
 * Add contacts to a campaign
 */
router.post('/:id/add-contacts', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { contactIds } = req.body;

    const count = await campaignsService.addContacts(req.user!.id, id, contactIds);

    res.json({
      success: true,
      message: `${count} contacts added to campaign`,
      data: { campaignId: id, contactsAdded: count },
    });
  } catch (error: any) {
    logger.error('Error adding contacts to campaign:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'ADD_CONTACTS_ERROR',
    });
  }
});

/**
 * POST /campaigns/:id/start
 * Start a campaign
 */
router.post('/:id/start', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const campaign = await campaignsService.startCampaign(req.user!.id, id);

    // Queue messages for broadcasting
    const db = getDatabase();
    if (db) {
      const accounts = await db.all(
        `SELECT id FROM whatsapp_accounts WHERE userId = ? AND isActive = 1 LIMIT 5`,
        [req.user!.id]
      );

      if (accounts.length > 0) {
        const accountIds = accounts.map((a) => a.id);
        await broadcastService.queueCampaignMessages(
          req.user!.id,
          id,
          accountIds,
          campaign.messageTemplate,
          campaign.delayMin,
          campaign.delayMax,
          campaign.throttlePerMinute,
          campaign.retryAttempts
        );
      }
    }

    res.json({
      success: true,
      message: 'Campaign started',
      data: { campaign },
    });
  } catch (error: any) {
    logger.error('Error starting campaign:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'START_ERROR',
    });
  }
});

/**
 * POST /campaigns/:id/pause
 * Pause a campaign
 */
router.post('/:id/pause', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const campaign = await campaignsService.pauseCampaign(req.user!.id, id);

    res.json({
      success: true,
      message: 'Campaign paused',
      data: { campaign },
    });
  } catch (error: any) {
    logger.error('Error pausing campaign:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'PAUSE_ERROR',
    });
  }
});

/**
 * GET /campaigns/:id/stats
 * Get campaign statistics
 */
router.get('/:id/stats', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const stats = await campaignsService.getCampaignStats(req.user!.id, id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error getting campaign stats:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'STATS_ERROR',
    });
  }
});

/**
 * GET /campaigns/:id/progress
 * Get campaign progress
 */
router.get('/:id/progress', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const progress = await broadcastService.getCampaignProgress(req.user!.id, id);

    res.json({
      success: true,
      data: progress,
    });
  } catch (error: any) {
    logger.error('Error getting campaign progress:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'PROGRESS_ERROR',
    });
  }
});

export default router;
