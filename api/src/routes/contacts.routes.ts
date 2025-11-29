import { Router, Request, Response } from 'express';
import authMiddleware from '../middleware/auth.middleware';
import { contactsService } from '../services/contacts.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /contacts/bulk-import
 * Import contacts from CSV/JSON array
 */
router.post('/bulk-import', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { contacts, skipDuplicates = true, updateIfExists = false, defaultCountry = 'IN' } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Contacts array is required and must not be empty',
        code: 'VALIDATION_ERROR',
      });
    }

    const result = await contactsService.bulkImportContacts(req.user!.id, contacts, {
      skipDuplicates,
      updateIfExists,
      defaultCountry,
    });

    res.json({
      success: true,
      message: `Import completed: ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed`,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error importing contacts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'IMPORT_ERROR',
    });
  }
});

/**
 * DELETE /contacts/bulk-delete
 * Bulk delete contacts
 */
router.delete('/bulk-delete', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Contact IDs array is required',
        code: 'VALIDATION_ERROR',
      });
    }

    const deleted = await contactsService.bulkDeleteContacts(ids, req.user!.id);

    res.json({
      success: true,
      message: `${deleted} contacts deleted successfully`,
      data: { deleted },
    });
  } catch (error: any) {
    logger.error('Error bulk deleting contacts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'DELETE_ERROR',
    });
  }
});

/**
 * GET /contacts/statistics
 * Get contact statistics
 */
router.get('/statistics', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const stats = await contactsService.getStatistics(req.user!.id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error getting statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'STATS_ERROR',
    });
  }
});

/**
 * POST /contacts
 * Create a new contact
 */
router.post('/', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { name, phoneNumber, email, category, tags } = req.body;

    const contact = await contactsService.createContact(req.user!.id, {
      name,
      phoneNumber,
      email,
      category,
      tags,
    });

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: contact,
    });
  } catch (error: any) {
    logger.error('Error creating contact:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'VALIDATION_ERROR',
    });
  }
});

/**
 * GET /contacts
 * Get all contacts for the user with search/filter
 */
router.get('/', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const tags = req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]) : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await contactsService.searchContacts(req.user!.id, {
      search,
      category,
      tags: tags as string[] | undefined,
      page,
      limit,
    });

    res.json({
      success: true,
      data: {
        contacts: result.contacts,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          pages: result.pages,
        },
      },
    });
  } catch (error: any) {
    logger.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_ERROR',
    });
  }
});

/**
 * GET /contacts/:id
 * Get a single contact
 */
router.get('/:id', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const contact = await contactsService.getContact(id, req.user!.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
        code: 'NOT_FOUND',
      });
    }

    res.json({
      success: true,
      data: contact,
    });
  } catch (error: any) {
    logger.error('Error fetching contact:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_ERROR',
    });
  }
});

/**
 * PUT /contacts/:id
 * Update a contact
 */
router.put('/:id', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phoneNumber, email, category, tags } = req.body;

    const contact = await contactsService.updateContact(id, req.user!.id, {
      name,
      phoneNumber,
      email,
      category,
      tags,
    });

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: contact,
    });
  } catch (error: any) {
    logger.error('Error updating contact:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'VALIDATION_ERROR',
    });
  }
});

/**
 * DELETE /contacts/:id
 * Delete a contact
 */
router.delete('/:id', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await contactsService.deleteContact(id, req.user!.id);

    res.json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting contact:', error);
    const status = error.message === 'Contact not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error.message,
      code: 'DELETE_ERROR',
    });
  }
});

export default router;
