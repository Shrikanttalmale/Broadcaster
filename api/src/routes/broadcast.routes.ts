import { Router, Request, Response } from 'express';
import authMiddleware from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { broadcastService } from '../services/broadcast.service';

const router = Router();

/**
 * POST /broadcast/queue-campaign
 * Queue a campaign for broadcasting
 */
router.post('/queue-campaign', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const {
      campaignId,
      accountIds,
      templateId,
      delayMin = 5000,
      delayMax = 15000,
      throttlePerMinute = 60,
      retryAttempts = 3,
    } = req.body;

    if (!campaignId || !Array.isArray(accountIds) || accountIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID and account IDs are required',
        code: 'VALIDATION_ERROR',
      });
    }

    const result = await broadcastService.queueCampaignMessages(
      req.user!.id,
      campaignId,
      accountIds,
      templateId,
      delayMin,
      delayMax,
      throttlePerMinute,
      retryAttempts
    );

    res.json({
      success: true,
      message: 'Campaign messages queued for broadcasting',
      data: result,
    });
  } catch (error: any) {
    logger.error('Error queuing campaign:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'QUEUE_ERROR',
    });
  }
});

/**
 * POST /broadcast/send-direct
 * Send a direct message to a contact
 */
router.post('/send-direct', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { accountId, contactId, message } = req.body;

    if (!accountId || !contactId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Account ID, contact ID, and message are required',
        code: 'VALIDATION_ERROR',
      });
    }

    const messageId = await broadcastService.sendDirectMessage(
      req.user!.id,
      accountId,
      contactId,
      message
    );

    res.json({
      success: true,
      message: 'Direct message sent',
      data: { messageId },
    });
  } catch (error: any) {
    logger.error('Error sending direct message:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'SEND_ERROR',
    });
  }
});

/**
 * GET /broadcast/campaign/:campaignId/progress
 * Get campaign broadcasting progress
 */
router.get('/campaign/:campaignId/progress', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    const progress = await broadcastService.getCampaignProgress(req.user!.id, campaignId);

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

/**
 * GET /broadcast/message/:messageId/status
 * Get message status
 */
router.get('/message/:messageId/status', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    const status = await broadcastService.getMessageStatus(req.user!.id, messageId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error('Error getting message status:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'STATUS_ERROR',
    });
  }
});

/**
 * GET /broadcast/queue-status
 * Get queue status
 */
router.get('/queue-status', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const status = broadcastService.getQueueStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error('Error getting queue status:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'STATUS_ERROR',
    });
  }
});

export default router;
