import { Router, Request, Response } from 'express';
import authMiddleware from '../middleware/auth.middleware';
import { whatsappService } from '../services/whatsapp.service';
import { whatsappWebService } from '../services/whatsapp-web.service';
import { logger } from '../utils/logger';
import QRCode from 'qrcode';

const router = Router();

/**
 * POST /whatsapp/start-session
 * Start a new WhatsApp session and generate QR code
 * Primary: Baileys, Fallback: whatsapp-web.js
 */
router.post('/start-session', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
        code: 'VALIDATION_ERROR',
      });
    }

    const userId = req.user!.id;
    let accountId: string = '';
    let qrCodeData: string | null = null;
    let provider: string = 'baileys';

    logger.info(`Starting WhatsApp session for ${phoneNumber}`);
    
    try {
      // Try Baileys first
      logger.info(`Attempting Baileys connection for ${phoneNumber}`);
      accountId = await whatsappService.startSession(userId, phoneNumber, (qr: string) => {
        logger.info(`QR Code callback received from Baileys for ${phoneNumber}`);
      });

      // Wait for QR code with timeout
      let attempts = 0;
      const maxAttempts = 15; // 15 seconds max for Baileys

      logger.info(`Waiting for Baileys QR code for account ${accountId}...`);

      while (!qrCodeData && attempts < maxAttempts) {
        const qr = whatsappService.getSessionQRCode(accountId);
        if (qr) {
          logger.info(`Baileys QR code received after ${attempts} seconds for ${accountId}`);
          try {
            qrCodeData = await QRCode.toDataURL(qr);
            logger.info(`Baileys QR code converted to image for ${accountId}`);
          } catch (err) {
            logger.error('Error converting Baileys QR to image:', err);
            qrCodeData = qr; // Use raw QR if conversion fails
          }
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;

        if (attempts % 5 === 0) {
          logger.info(`Still waiting for Baileys QR code... (${attempts}s elapsed)`);
        }
      }

      if (qrCodeData) {
        logger.info(`Successfully generated QR code via Baileys for ${phoneNumber}`);
        return res.status(201).json({
          success: true,
          message: 'WhatsApp session started with Baileys',
          data: {
            accountId,
            phoneNumber,
            qrCode: qrCodeData,
            status: 'waiting_for_scan',
            provider: 'baileys',
          },
        });
      }

      logger.warn(`Baileys QR generation timed out after ${attempts} seconds. Attempting fallback to whatsapp-web.js...`);
    } catch (baileyError: any) {
      logger.error('Baileys connection failed:', baileyError?.message || baileyError || 'Unknown error');
    }

    // Fallback to whatsapp-web.js
    try {
      logger.info(`Falling back to whatsapp-web.js for ${phoneNumber}`);
      provider = 'whatsapp-web.js';
      
      accountId = await whatsappWebService.startSession(userId, phoneNumber, (qr: string) => {
        logger.info(`QR Code callback received from whatsapp-web.js for ${phoneNumber}`);
      });

      // Wait for QR code from web service
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max for whatsapp-web.js

      logger.info(`Waiting for whatsapp-web.js QR code for account ${accountId}...`);

      while (!qrCodeData && attempts < maxAttempts) {
        const qr = whatsappWebService.getSessionQRCode(accountId);
        if (qr) {
          logger.info(`whatsapp-web.js QR code received after ${attempts} seconds for ${accountId}`);
          try {
            // whatsapp-web.js may return base64 or raw string
            if (qr.startsWith('data:')) {
              qrCodeData = qr;
            } else {
              qrCodeData = await QRCode.toDataURL(qr);
            }
            logger.info(`whatsapp-web.js QR code ready for ${accountId}`);
          } catch (err) {
            logger.error('Error processing whatsapp-web.js QR:', err);
            qrCodeData = qr; // Use raw if conversion fails
          }
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;

        if (attempts % 10 === 0) {
          logger.info(`Still waiting for whatsapp-web.js QR code... (${attempts}s elapsed)`);
        }
      }

      if (qrCodeData) {
        logger.info(`Successfully generated QR code via whatsapp-web.js for ${phoneNumber}`);
        return res.status(201).json({
          success: true,
          message: 'WhatsApp session started with whatsapp-web.js (fallback)',
          data: {
            accountId,
            phoneNumber,
            qrCode: qrCodeData,
            status: 'waiting_for_scan',
            provider: 'whatsapp-web.js',
          },
        });
      }

      logger.error(`whatsapp-web.js also failed to generate QR code after ${attempts} seconds`);
      
    } catch (webError: any) {
      logger.error('whatsapp-web.js fallback failed:', webError?.message || webError || 'Unknown error');
    }

    // Both providers failed
    logger.error(`Both Baileys and whatsapp-web.js failed to generate QR code for ${phoneNumber}`);
    return res.status(500).json({
      success: false,
      error: 'Baileys failed to generate QR code. Try reconnecting or check if your WhatsApp connection is still active.',
      debugInfo: `Last provider attempted: ${provider}. This usually means the WhatsApp backend lost connection or the QR code expired.`,
      code: 'QR_GENERATION_FAILED',
      provider,
    });

  } catch (error: any) {
    logger.error('Unexpected error starting WhatsApp session:', error?.message || error || 'Unknown error');
    res.status(500).json({
      success: false,
      error: (error?.message || error || 'Failed to start WhatsApp session') as string,
      code: 'SESSION_ERROR',
    });
  }
});

/**
 * GET /whatsapp/sessions
 * Get all WhatsApp sessions for the user
 */
router.get('/sessions', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const db = await import('../services/database.service').then(m => m.getDatabase());

    // Migration: Assign any orphaned WhatsApp accounts to current user
    // This handles the case where accounts were created before the user was logged in
    if (db) {
      const orphaned = await db.get(
        `SELECT COUNT(*) as count FROM whatsapp_accounts WHERE userId NOT IN (SELECT id FROM users)`
      );
      
      if (orphaned && orphaned.count > 0) {
        logger.info(`Found ${orphaned.count} orphaned WhatsApp accounts, assigning to user ${userId}`);
        await db.run(
          `UPDATE whatsapp_accounts SET userId = ? WHERE userId NOT IN (SELECT id FROM users)`,
          [userId]
        );
      }
    }

    const sessions = await whatsappService.getUserSessions(userId);

    res.json({
      success: true,
      data: {
        sessions,
        total: sessions.length,
        connected: sessions.filter((s) => s.connected).length,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_ERROR',
    });
  }
});

/**
 * GET /whatsapp/sessions/:accountId
 * Get session status
 */
router.get('/sessions/:accountId', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const userId = req.user!.id;

    const status = await whatsappService.getSessionStatus(accountId, userId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error('Error fetching session status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_ERROR',
    });
  }
});

/**
 * POST /whatsapp/sessions/:accountId/resume
 * Resume a disconnected session using stored credentials
 */
router.post('/sessions/:accountId/resume', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const userId = req.user!.id;

    logger.info(`Resume request for account ${accountId}`);
    
    await whatsappService.resumeSession(accountId, userId);

    res.json({
      success: true,
      data: {
        accountId,
        message: 'Session resume initiated. If your device is still linked on WhatsApp, connection will be restored within 10 seconds.',
      },
    });
  } catch (error: any) {
    logger.error('Error resuming session:', error?.message || error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to resume session',
      code: 'RESUME_ERROR',
    });
  }
});

/**
 * GET /whatsapp/sessions/:accountId/qr
 * Get QR code for a session (for re-authentication)
 * Supports both Baileys and whatsapp-web.js services
 */
router.get('/sessions/:accountId/qr', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const userId = req.user!.id;

    logger.info(`QR code requested for account ${accountId}`);

    // Try to get QR code with polling (wait up to 30 seconds)
    let qr: string | undefined;
    let attempts = 0;
    const maxAttempts = 30;
    let usedFallback = false;

    while (!qr && attempts < maxAttempts) {
      // Try primary service first
      qr = whatsappService.getSessionQRCode(accountId);
      
      // If not found, try fallback service
      if (!qr && attempts === 0) {
        logger.info(`QR not found in primary service, checking fallback for ${accountId}`);
        qr = whatsappWebService.getSessionQRCode(accountId);
        if (qr) {
          usedFallback = true;
          logger.info(`Found QR in fallback service for ${accountId}`);
        }
      }
      
      if (qr) {
        logger.info(`QR code found after ${attempts} attempts for ${accountId} (fallback: ${usedFallback})`);
        break;
      }

      // Wait 1 second before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;

      if (attempts % 10 === 0) {
        logger.info(`Still waiting for QR code from sessionId ${accountId}... (${attempts}s elapsed)`);
      }
    }

    if (!qr) {
      logger.warn(
        `QR code not available for account ${accountId} after ${attempts} attempts. Session may not be initialized yet.`
      );
      return res.status(404).json({
        success: false,
        error: 'QR code not yet generated. Please try again in a moment.',
        code: 'QR_NOT_AVAILABLE',
        attempts,
      });
    }

    // Generate QR image (handle both base64 strings and raw QR data)
    let qrImage = qr;
    if (!qr.startsWith('data:')) {
      qrImage = await QRCode.toDataURL(qr);
    }

    res.json({
      success: true,
      data: {
        accountId,
        qrCode: qrImage,
        source: usedFallback ? 'whatsapp-web.js' : 'baileys',
      },
    });
  } catch (error: any) {
    logger.error('Error getting QR code:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get QR code',
      code: 'QR_ERROR',
    });
  }
});

/**
 * POST /whatsapp/send-message
 * Send a message via WhatsApp
 * Attempts to send through both services to ensure compatibility
 */
router.post('/send-message', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { accountId, phoneNumber, message } = req.body;

    if (!accountId || !phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'Account ID, phone number, and message are required',
        code: 'VALIDATION_ERROR',
      });
    }

    const userId = req.user!.id;
    let messageId: string | null = null;
    let usedFallback = false;

    // Try primary service first
    try {
      logger.info(`Attempting to send message via Baileys for account ${accountId}`);
      messageId = await whatsappService.sendMessage(accountId, userId, phoneNumber, message);
      logger.info(`Message sent successfully via Baileys: ${messageId}`);
    } catch (baileyError: any) {
      logger.warn(`Baileys send failed for account ${accountId}, trying fallback:`, baileyError.message);
      
      // Try fallback service
      try {
        logger.info(`Attempting to send message via whatsapp-web.js for account ${accountId}`);
        messageId = await whatsappWebService.sendMessage(accountId, userId, phoneNumber, message);
        logger.info(`Message sent successfully via whatsapp-web.js: ${messageId}`);
        usedFallback = true;
      } catch (webError: any) {
        logger.error(`Both services failed to send message for account ${accountId}:`, webError);
        throw webError;
      }
    }

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        messageId,
        accountId,
        phoneNumber,
        status: 'sent',
        service: usedFallback ? 'whatsapp-web.js' : 'baileys',
      },
    });
  } catch (error: any) {
    logger.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'SEND_ERROR',
    });
  }
});

/**
 * DELETE /whatsapp/sessions/:accountId
 * Disconnect a WhatsApp session
 * Handles disconnection for both Baileys and whatsapp-web.js services
 */
router.delete('/sessions/:accountId', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const userId = req.user!.id;

    // Verify ownership - try both services
    let sessionExists = false;
    try {
      await whatsappService.getSessionStatus(accountId, userId);
      sessionExists = true;
      logger.info(`Session ${accountId} found in Baileys service`);
    } catch (baileyError: any) {
      logger.info(`Session not found in Baileys, checking whatsapp-web.js:`, baileyError.message);
      try {
        await whatsappWebService.getSessionStatus(accountId, userId);
        sessionExists = true;
        logger.info(`Session ${accountId} found in whatsapp-web.js service`);
      } catch (webError: any) {
        logger.error(`Session ${accountId} not found in either service`);
        throw webError;
      }
    }

    // Disconnect from both services (one will be active, other will be no-op)
    await Promise.allSettled([
      whatsappService.disconnectSession(accountId),
      whatsappWebService.disconnectSession(accountId),
    ]);

    logger.info(`Successfully disconnected session ${accountId}`);

    res.json({
      success: true,
      message: 'WhatsApp session disconnected successfully',
    });
  } catch (error: any) {
    logger.error('Error disconnecting session:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'DISCONNECT_ERROR',
    });
  }
});

/**
 * GET /whatsapp/debug/db-check
 * Debug endpoint to check database contents
 */
router.get('/debug/db-check', authMiddleware.verifyJWT, async (req: Request, res: Response) => {
  try {
    const db = await import('../services/database.service').then(m => m.getDatabase());
    if (!db) {
      return res.json({ error: 'Database not initialized' });
    }

    const accounts = await db.all('SELECT id, phoneNumber, userId, isActive FROM whatsapp_accounts');
    const users = await db.all('SELECT id, username FROM users');
    
    res.json({
      accounts,
      users,
      accountCount: accounts?.length || 0,
      userCount: users?.length || 0,
    });
  } catch (error: any) {
    logger.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
