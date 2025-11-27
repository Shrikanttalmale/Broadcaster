import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import authMiddleware from '../middleware/auth.middleware';
import { validateLicense } from '../middleware/license.middleware';
import rBACService from '../services/rbac.service';

const router = Router();

// In-memory user store (will be moved to database)
interface User {
  id: string;
  email: string;
  name: string;
  role: 'master_admin' | 'distributor' | 'manager' | 'operator';
  licenseId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

let users: Map<string, User> = new Map();

/**
 * GET /users
 * List all users (with RBAC filtering)
 */
router.get(
  '/',
  authMiddleware.verifyJWT,
  validateLicense,
  authMiddleware.requirePermission('read', 'users'),
  (req: Request, res: Response) => {
    try {
      const { role, licenseId, limit = 50, offset = 0 } = req.query;

      let userList = Array.from(users.values());

      // Filter by role if provided
      if (role) {
        userList = userList.filter((u) => u.role === role);
      }

      // Filter by license ID if provided
      if (licenseId) {
        userList = userList.filter((u) => u.licenseId === licenseId);
      }

      // Apply pagination
      const start = parseInt(offset as string) || 0;
      const limit_num = Math.min(parseInt(limit as string) || 50, 100);
      const paginatedUsers = userList.slice(start, start + limit_num);

      res.json({
        success: true,
        data: {
          users: paginatedUsers,
          total: userList.length,
          limit: limit_num,
          offset: start,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'LIST_USERS_ERROR',
      });
    }
  }
);

/**
 * GET /users/:id
 * Get user details
 */
router.get(
  '/:id',
  authMiddleware.verifyJWT,
  authMiddleware.requirePermission('read', 'users'),
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Find user by ID
      let targetUser: User | undefined;
      for (const user of users.values()) {
        if (user.id === id) {
          targetUser = user;
          break;
        }
      }

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      res.json({
        success: true,
        data: targetUser,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'GET_USER_ERROR',
      });
    }
  }
);

/**
 * POST /users
 * Create new user
 */
router.post(
  '/',
  authMiddleware.verifyJWT,
  authMiddleware.requirePermission('create', 'users'),
  (req: Request, res: Response) => {
    try {
      const { email, name, role, licenseId } = req.body;
      const creatorId = req.user?.id!;
      const creatorRole = req.user?.role!;

      // Validation
      if (!email || !name || !role) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: email, name, role',
          code: 'VALIDATION_ERROR',
        });
      }

      // Check if creator can assign this role
      if (!rBACService.canAssignRole(creatorRole, role)) {
        return res.status(403).json({
          success: false,
          error: 'You cannot assign this role',
          code: 'CANNOT_ASSIGN_ROLE',
        });
      }

      // Check if user already exists
      for (const user of users.values()) {
        if (user.email === email) {
          return res.status(409).json({
            success: false,
            error: 'User with this email already exists',
            code: 'USER_EXISTS',
          });
        }
      }

      // Create user
      const newUser: User = {
        id: uuidv4(),
        email,
        name,
        role,
        licenseId: licenseId || req.user?.licenseId!,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: creatorId,
      };

      users.set(newUser.id, newUser);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: newUser,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'CREATE_USER_ERROR',
      });
    }
  }
);

/**
 * PUT /users/:id
 * Update user
 */
router.put(
  '/:id',
  authMiddleware.verifyJWT,
  authMiddleware.requirePermission('update', 'users'),
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, licenseId, isActive } = req.body;

      // Find user
      let targetUser: User | undefined;
      for (const user of users.values()) {
        if (user.id === id) {
          targetUser = user;
          break;
        }
      }

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      // Update allowed fields
      if (name) {
        targetUser.name = name;
      }

      if (licenseId && req.user?.role === 'master_admin') {
        targetUser.licenseId = licenseId;
      }

      if (isActive !== undefined && req.user?.role === 'master_admin') {
        targetUser.isActive = isActive;
      }

      targetUser.updatedAt = new Date();

      res.json({
        success: true,
        message: 'User updated successfully',
        data: targetUser,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'UPDATE_USER_ERROR',
      });
    }
  }
);

/**
 * DELETE /users/:id
 * Deactivate/delete user
 */
router.delete(
  '/:id',
  authMiddleware.verifyJWT,
  authMiddleware.requirePermission('delete', 'users'),
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleterId = req.user?.id!;
      const deleterRole = req.user?.role!;

      // Find user
      let targetUser: User | undefined;
      for (const user of users.values()) {
        if (user.id === id) {
          targetUser = user;
          break;
        }
      }

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      // Check if deleter can delete this user
      if (!rBACService.canDeleteUser(deleterRole, targetUser.role)) {
        return res.status(403).json({
          success: false,
          error: 'You cannot delete this user',
          code: 'CANNOT_DELETE_USER',
        });
      }

      // Deactivate instead of deleting
      targetUser.isActive = false;
      targetUser.updatedAt = new Date();

      res.json({
        success: true,
        message: 'User deactivated successfully',
        data: targetUser,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'DELETE_USER_ERROR',
      });
    }
  }
);

/**
 * PUT /users/:id/role
 * Change user role
 */
router.put(
  '/:id/role',
  authMiddleware.verifyJWT,
  authMiddleware.requirePermission('manage', 'roles'),
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const changerRole = req.user?.role!;

      if (!role) {
        return res.status(400).json({
          success: false,
          error: 'Role is required',
          code: 'MISSING_ROLE',
        });
      }

      // Find user
      let targetUser: User | undefined;
      for (const user of users.values()) {
        if (user.id === id) {
          targetUser = user;
          break;
        }
      }

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      // Check if role change is allowed
      if (!rBACService.canAssignRole(changerRole, role)) {
        return res.status(403).json({
          success: false,
          error: 'You cannot assign this role',
          code: 'CANNOT_ASSIGN_ROLE',
        });
      }

      const oldRole = targetUser.role;
      targetUser.role = role;
      targetUser.updatedAt = new Date();

      res.json({
        success: true,
        message: 'User role changed successfully',
        data: {
          userId: targetUser.id,
          oldRole,
          newRole: role,
          user: targetUser,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'CHANGE_ROLE_ERROR',
      });
    }
  }
);

/**
 * PUT /users/:id/license
 * Assign license to user
 */
router.put(
  '/:id/license',
  authMiddleware.verifyJWT,
  authMiddleware.requirePermission('manage', 'permissions'),
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { licenseId } = req.body;

      if (!licenseId) {
        return res.status(400).json({
          success: false,
          error: 'License ID is required',
          code: 'MISSING_LICENSE_ID',
        });
      }

      // Find user
      let targetUser: User | undefined;
      for (const user of users.values()) {
        if (user.id === id) {
          targetUser = user;
          break;
        }
      }

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      const oldLicenseId = targetUser.licenseId;
      targetUser.licenseId = licenseId;
      targetUser.updatedAt = new Date();

      res.json({
        success: true,
        message: 'User license assigned successfully',
        data: {
          userId: targetUser.id,
          oldLicenseId,
          newLicenseId: licenseId,
          user: targetUser,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'ASSIGN_LICENSE_ERROR',
      });
    }
  }
);

/**
 * GET /users/:id/permissions
 * Get user permissions
 */
router.get(
  '/:id/permissions',
  authMiddleware.verifyJWT,
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Find user
      let targetUser: User | undefined;
      for (const user of users.values()) {
        if (user.id === id) {
          targetUser = user;
          break;
        }
      }

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      const permissions = rBACService.getPermissionsForRole(targetUser.role);

      res.json({
        success: true,
        data: {
          userId: targetUser.id,
          role: targetUser.role,
          permissions,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'GET_PERMISSIONS_ERROR',
      });
    }
  }
);

export default router;
