import { Router, Request, Response } from 'express';
import authMiddleware from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { templatesService } from '../services/templates.service';

const router = Router();

/**
 * POST /templates
 * Create a new message template
 */
router.post('/', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { name, subject, body, category } = req.body;

    if (!name || !body) {
      return res.status(400).json({
        success: false,
        error: 'Name and body are required',
        code: 'VALIDATION_ERROR',
      });
    }

    const template = await templatesService.createTemplate(
      req.user!.id,
      name,
      body,
      subject,
      category
    );

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: { template },
    });
  } catch (error: any) {
    logger.error('Error creating template:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'CREATE_ERROR',
    });
  }
});

/**
 * GET /templates
 * Get all templates for the user
 */
router.get('/', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { search, category, page = '1', limit = '50' } = req.query;

    const result = await templatesService.getTemplates(
      req.user!.id,
      search as string,
      category as string,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_ERROR',
    });
  }
});

/**
 * GET /templates/:id
 * Get a single template
 */
router.get('/:id', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await templatesService.getTemplate(req.user!.id, id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
        code: 'NOT_FOUND',
      });
    }

    res.json({
      success: true,
      data: { template },
    });
  } catch (error: any) {
    logger.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_ERROR',
    });
  }
});

/**
 * PUT /templates/:id
 * Update a template
 */
router.put('/:id', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, subject, body, category } = req.body;

    const template = await templatesService.updateTemplate(
      req.user!.id,
      id,
      name,
      body,
      subject,
      category
    );

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: { template },
    });
  } catch (error: any) {
    logger.error('Error updating template:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'UPDATE_ERROR',
    });
  }
});

/**
 * DELETE /templates/:id
 * Delete a template (soft delete)
 */
router.delete('/:id', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await templatesService.deleteTemplate(req.user!.id, id);

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting template:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'DELETE_ERROR',
    });
  }
});

/**
 * POST /templates/:id/preview
 * Preview template with sample variables
 */
router.post('/:id/preview', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { variables } = req.body;

    const template = await templatesService.getTemplate(req.user!.id, id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
        code: 'NOT_FOUND',
      });
    }

    const preview = templatesService.previewTemplate(template.body, variables);

    res.json({
      success: true,
      data: { preview },
    });
  } catch (error: any) {
    logger.error('Error previewing template:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'PREVIEW_ERROR',
    });
  }
});

/**
 * POST /templates/:id/duplicate
 * Duplicate a template
 */
router.post('/:id/duplicate', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const template = await templatesService.duplicateTemplate(req.user!.id, id, name);

    res.status(201).json({
      success: true,
      message: 'Template duplicated successfully',
      data: { template },
    });
  } catch (error: any) {
    logger.error('Error duplicating template:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'DUPLICATE_ERROR',
    });
  }
});

export default router;
