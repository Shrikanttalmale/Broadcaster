import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../services/database.service';
import { logger } from '../utils/logger';

/**
 * License Middleware
 * Validates that the authenticated user has an active, non-expired license
 * Applied to all protected routes to ensure only licensed users can access
 */

export const validateLicense = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user from JWT context (set by auth middleware)
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // If user doesn't have a license, deny access
    if (!user.licenseId) {
      logger.warn(`User ${user.email} attempted to access protected resource without license`);
      return res.status(403).json({
        success: false,
        error: 'User does not have an active license',
        code: 'NO_LICENSE',
      });
    }

    // Get database and validate license
    const db = getDatabase();
    if (!db) {
      logger.error('Database not initialized for license validation');
      return res.status(500).json({
        success: false,
        error: 'Service unavailable',
        code: 'SERVICE_ERROR',
      });
    }

    // Query license from database
    const license = await db.get(
      `SELECT * FROM licenses 
       WHERE licenseKey = ? 
       AND isActive = 1 
       AND validUntil > datetime('now')
       LIMIT 1`,
      [user.licenseId]
    );

    if (!license) {
      logger.warn(
        `Invalid license for user ${user.email}: license ${user.licenseId} not found or expired`
      );
      return res.status(403).json({
        success: false,
        error: 'User license is invalid, expired, or inactive',
        code: 'INVALID_LICENSE',
      });
    }

    // Attach license info to request for downstream use
    (req as any).license = license;
    (req as any).licenseType = license.licenseType;

    // Log successful license validation
    logger.debug(
      `License validated for user ${user.email}: ${license.licenseType} license`
    );

    next();
  } catch (error: any) {
    logger.error('License validation error:', error);
    res.status(500).json({
      success: false,
      error: 'License validation failed',
      code: 'LICENSE_VALIDATION_ERROR',
    });
  }
};

/**
 * Check if user has a specific license type
 * Usage: app.use(requireLicenseType('distributor')) for routes requiring distributor license
 */
export const requireLicenseType = (requiredType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const licenseType = (req as any).licenseType;

      if (!licenseType) {
        return res.status(401).json({
          success: false,
          error: 'License information not available',
          code: 'LICENSE_INFO_MISSING',
        });
      }

      // Check license type hierarchy (master > distributor > user)
      const typeHierarchy: Record<string, number> = {
        master: 3,
        distributor: 2,
        user: 1,
      };

      const userLevel = typeHierarchy[licenseType] || 0;
      const requiredLevel = typeHierarchy[requiredType] || 0;

      if (userLevel < requiredLevel) {
        logger.warn(
          `User ${(req as any).user?.email} lacks required license type ${requiredType}`
        );
        return res.status(403).json({
          success: false,
          error: `This operation requires a ${requiredType} license`,
          code: 'INSUFFICIENT_LICENSE_TYPE',
        });
      }

      next();
    } catch (error: any) {
      logger.error('License type validation error:', error);
      res.status(500).json({
        success: false,
        error: 'License type validation failed',
        code: 'LICENSE_TYPE_ERROR',
      });
    }
  };
};

export default { validateLicense, requireLicenseType };
