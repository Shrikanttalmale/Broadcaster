import { Router, Request, Response } from 'express';
import licenseService, { License, LicenseGenerationOptions } from '../services/license.service';
import authMiddleware from '../middleware/auth.middleware';
import { validateLicense } from '../middleware/license.middleware';

const router = Router();

// In-memory license store (will move to database)
let licenses: Map<string, License> = new Map();

/**
 * GET /licenses
 * List all licenses with RBAC
 */
router.get(
  '/',
  authMiddleware.verifyJWT,
  validateLicense,
  authMiddleware.requirePermission('read', 'licenses'),
  (req: Request, res: Response) => {
    try {
      const { status, type, limit = 50, offset = 0 } = req.query;
      const userRole = req.user?.role!;
      const userLicenseId = req.user?.licenseId!;

      let licenseList = Array.from(licenses.values());

      // Non-master admins can only see their licenses
      if (userRole !== 'master_admin') {
        licenseList = licenseList.filter((l) => l.ownerId === req.user?.id || l.id === userLicenseId);
      }

      // Filter by status
      if (status) {
        licenseList = licenseList.filter((l) => l.status === status);
      }

      // Filter by type
      if (type) {
        licenseList = licenseList.filter((l) => l.licenseType === type);
      }

      // Pagination
      const start = parseInt(offset as string) || 0;
      const limit_num = Math.min(parseInt(limit as string) || 50, 100);
      const paginatedLicenses = licenseList.slice(start, start + limit_num);

      res.json({
        success: true,
        data: {
          licenses: paginatedLicenses,
          total: licenseList.length,
          limit: limit_num,
          offset: start,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'LIST_LICENSES_ERROR',
      });
    }
  }
);

/**
 * GET /licenses/:id
 * Get license details
 */
router.get(
  '/:id',
  authMiddleware.verifyJWT,
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const license = licenses.get(id);

      if (!license) {
        return res.status(404).json({
          success: false,
          error: 'License not found',
          code: 'LICENSE_NOT_FOUND',
        });
      }

      // Check permission
      const userRole = req.user?.role!;
      if (userRole !== 'master_admin' && license.ownerId !== req.user?.id) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to view this license',
          code: 'PERMISSION_DENIED',
        });
      }

      const licenseInfo = licenseService.getLicenseInfo(license);

      res.json({
        success: true,
        data: {
          license,
          info: licenseInfo,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'GET_LICENSE_ERROR',
      });
    }
  }
);

/**
 * POST /licenses
 * Generate new license
 */
router.post(
  '/',
  authMiddleware.verifyJWT,
  authMiddleware.requirePermission('create', 'licenses'),
  (req: Request, res: Response) => {
    try {
      const { licenseType, ownerId, planId, validityDays, features } = req.body;

      // Validation
      if (!licenseType || !validityDays) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: licenseType, validityDays',
          code: 'VALIDATION_ERROR',
        });
      }

      // Validate license type
      const validTypes = ['master', 'distributor', 'user'];
      if (!validTypes.includes(licenseType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid license type. Must be one of: ${validTypes.join(', ')}`,
          code: 'INVALID_LICENSE_TYPE',
        });
      }

      // Only master admin can create master licenses
      if (licenseType === 'master' && req.user?.role !== 'master_admin') {
        return res.status(403).json({
          success: false,
          error: 'Only master admins can create master licenses',
          code: 'PERMISSION_DENIED',
        });
      }

      // Create license
      const options: LicenseGenerationOptions = {
        licenseType: licenseType as any,
        ownerId: ownerId || req.user?.id,
        planId,
        validityDays: Math.min(validityDays, 36500), // Max 100 years
        features,
      };

      const license = licenseService.generateLicense(options);
      licenses.set(license.id, license);

      res.status(201).json({
        success: true,
        message: 'License generated successfully',
        data: {
          license,
          info: licenseService.getLicenseInfo(license),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'CREATE_LICENSE_ERROR',
      });
    }
  }
);

/**
 * POST /licenses/:id/validate
 * Validate a license
 */
router.post(
  '/:id/validate',
  authMiddleware.verifyJWT,
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const license = licenses.get(id);

      if (!license) {
        return res.status(404).json({
          success: false,
          error: 'License not found',
          code: 'LICENSE_NOT_FOUND',
        });
      }

      const validation = licenseService.validateLicense(license);

      res.json({
        success: true,
        data: {
          licenseId: license.id,
          valid: validation.valid,
          reason: validation.reason,
          info: licenseService.getLicenseInfo(license),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'VALIDATE_LICENSE_ERROR',
      });
    }
  }
);

/**
 * PUT /licenses/:id
 * Update license
 */
router.put(
  '/:id',
  authMiddleware.verifyJWT,
  authMiddleware.requirePermission('update', 'licenses'),
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, features } = req.body;
      const license = licenses.get(id);

      if (!license) {
        return res.status(404).json({
          success: false,
          error: 'License not found',
          code: 'LICENSE_NOT_FOUND',
        });
      }

      // Update status
      if (status && ['active', 'inactive', 'expired'].includes(status)) {
        license.status = status;
      }

      // Update features
      if (features && typeof features === 'object') {
        license.features = { ...license.features, ...features };
      }

      res.json({
        success: true,
        message: 'License updated successfully',
        data: {
          license,
          info: licenseService.getLicenseInfo(license),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'UPDATE_LICENSE_ERROR',
      });
    }
  }
);

/**
 * DELETE /licenses/:id
 * Deactivate license
 */
router.delete(
  '/:id',
  authMiddleware.verifyJWT,
  authMiddleware.requirePermission('delete', 'licenses'),
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const license = licenses.get(id);

      if (!license) {
        return res.status(404).json({
          success: false,
          error: 'License not found',
          code: 'LICENSE_NOT_FOUND',
        });
      }

      license.status = 'inactive';

      res.json({
        success: true,
        message: 'License deactivated successfully',
        data: license,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'DELETE_LICENSE_ERROR',
      });
    }
  }
);

/**
 * GET /licenses/:id/features
 * Get enabled features for a license
 */
router.get(
  '/:id/features',
  authMiddleware.verifyJWT,
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const license = licenses.get(id);

      if (!license) {
        return res.status(404).json({
          success: false,
          error: 'License not found',
          code: 'LICENSE_NOT_FOUND',
        });
      }

      const enabledFeatures = Object.entries(license.features)
        .filter(([_, enabled]) => enabled)
        .map(([feature]) => feature);

      res.json({
        success: true,
        data: {
          licenseId: license.id,
          licenseType: license.licenseType,
          allFeatures: license.features,
          enabledFeatures,
          count: enabledFeatures.length,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'GET_FEATURES_ERROR',
      });
    }
  }
);

/**
 * POST /licenses/:id/features/:feature/enable
 * Enable a feature
 */
router.post(
  '/:id/features/:feature/enable',
  authMiddleware.verifyJWT,
  authMiddleware.requirePermission('update', 'licenses'),
  (req: Request, res: Response) => {
    try {
      const { id, feature } = req.params;
      const license = licenses.get(id);

      if (!license) {
        return res.status(404).json({
          success: false,
          error: 'License not found',
          code: 'LICENSE_NOT_FOUND',
        });
      }

      licenseService.enableFeature(license, feature);

      res.json({
        success: true,
        message: `Feature '${feature}' enabled`,
        data: {
          licenseId: license.id,
          feature,
          enabled: true,
          features: license.features,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'ENABLE_FEATURE_ERROR',
      });
    }
  }
);

/**
 * POST /licenses/:id/features/:feature/disable
 * Disable a feature
 */
router.post(
  '/:id/features/:feature/disable',
  authMiddleware.verifyJWT,
  authMiddleware.requirePermission('update', 'licenses'),
  (req: Request, res: Response) => {
    try {
      const { id, feature } = req.params;
      const license = licenses.get(id);

      if (!license) {
        return res.status(404).json({
          success: false,
          error: 'License not found',
          code: 'LICENSE_NOT_FOUND',
        });
      }

      licenseService.disableFeature(license, feature);

      res.json({
        success: true,
        message: `Feature '${feature}' disabled`,
        data: {
          licenseId: license.id,
          feature,
          enabled: false,
          features: license.features,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'DISABLE_FEATURE_ERROR',
      });
    }
  }
);

/**
 * GET /licenses/roles
 * Get all available roles with permissions
 */
router.get('/metadata/roles', (req: Request, res: Response) => {
  try {
    const roles = [
      {
        role: 'master',
        description: 'Master license - Full access',
        features: licenseService['getDefaultFeatures']('master'),
      },
      {
        role: 'distributor',
        description: 'Distributor license - Manage own distribution',
        features: licenseService['getDefaultFeatures']('distributor'),
      },
      {
        role: 'user',
        description: 'User license - Basic features',
        features: licenseService['getDefaultFeatures']('user'),
      },
    ];

    res.json({
      success: true,
      data: { roles },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_ROLES_ERROR',
    });
  }
});

export default router;
