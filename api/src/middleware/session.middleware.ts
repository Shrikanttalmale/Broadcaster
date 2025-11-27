import { Request, Response, NextFunction } from 'express';
import * as sessionService from '../services/session.service';
import { logger } from '../utils/logger';

/**
 * Session Validation Middleware
 * Verifies that the session is still active and valid
 * Prevents use of tokens from logged-out or invalidated sessions
 */

export const validateSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get session info from JWT context (set by auth middleware)
    const user = (req as any).user;
    const sessionId = (req as any).sessionId;

    if (!user || !sessionId) {
      // No session info, but that's okay for public routes
      return next();
    }

    // Verify session is valid
    const isValid = await sessionService.isSessionValid(sessionId, (req as any).refreshToken || '');

    if (!isValid) {
      logger.warn(`Invalid or expired session: ${sessionId} for user ${user.email}`);
      return res.status(401).json({
        success: false,
        error: 'Session expired or invalidated. Please login again.',
        code: 'SESSION_INVALID',
      });
    }

    // Update session activity timestamp
    await sessionService.updateSessionActivity(sessionId);

    next();
  } catch (error: any) {
    logger.error('Session validation error:', error);
    // Don't block on session validation errors, just log them
    next();
  }
};

/**
 * Check if user has only one active session (per license)
 * If user logs in from a new device, old sessions are automatically invalidated
 */
export const checkSingleActiveSession = async (userId: string, licenseKey: string) => {
  try {
    const activeSessions = await sessionService.getUserActiveSessions(userId);

    // Filter for this specific license
    const licenseActiveSessions = activeSessions.filter(s => s.licenseKey === licenseKey);

    return licenseActiveSessions.length === 1;
  } catch (error: any) {
    logger.error('Error checking active sessions:', error);
    return false;
  }
};

export default { validateSession, checkSingleActiveSession };
