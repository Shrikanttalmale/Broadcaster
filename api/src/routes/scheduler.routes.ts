import { Router, Request, Response } from 'express';
import authMiddleware from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { schedulerService } from '../services/scheduler.service';

const router = Router();

/**
 * POST /scheduler/schedules
 * Create a new schedule for a campaign
 */
router.post('/schedules', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { campaignId, cronExpression, timezone = 'Asia/Kolkata' } = req.body;

    if (!campaignId || !cronExpression) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID and cron expression are required',
        code: 'VALIDATION_ERROR',
      });
    }

    const schedule = await schedulerService.createSchedule(
      req.user!.id,
      campaignId,
      cronExpression,
      timezone
    );

    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: { schedule },
    });
  } catch (error: any) {
    logger.error('Error creating schedule:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'CREATE_ERROR',
    });
  }
});

/**
 * GET /scheduler/schedules
 * Get all schedules for the user
 */
router.get('/schedules', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50' } = req.query;

    const result = await schedulerService.getSchedules(
      req.user!.id,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error fetching schedules:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_ERROR',
    });
  }
});

/**
 * GET /scheduler/schedules/:id
 * Get a single schedule
 */
router.get('/schedules/:id', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const schedule = await schedulerService.getSchedule(req.user!.id, id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found',
        code: 'NOT_FOUND',
      });
    }

    res.json({
      success: true,
      data: { schedule },
    });
  } catch (error: any) {
    logger.error('Error fetching schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_ERROR',
    });
  }
});

/**
 * PUT /scheduler/schedules/:id
 * Update a schedule
 */
router.put('/schedules/:id', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cronExpression, isActive } = req.body;

    const schedule = await schedulerService.updateSchedule(
      req.user!.id,
      id,
      cronExpression,
      isActive
    );

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: { schedule },
    });
  } catch (error: any) {
    logger.error('Error updating schedule:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'UPDATE_ERROR',
    });
  }
});

/**
 * DELETE /scheduler/schedules/:id
 * Delete a schedule
 */
router.delete('/schedules/:id', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await schedulerService.deleteSchedule(req.user!.id, id);

    res.json({
      success: true,
      message: 'Schedule deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting schedule:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'DELETE_ERROR',
    });
  }
});

/**
 * GET /scheduler/stats
 * Get scheduler statistics
 */
router.get('/stats', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const stats = await schedulerService.getStats(req.user!.id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error getting scheduler stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'STATS_ERROR',
    });
  }
});

export default router;
