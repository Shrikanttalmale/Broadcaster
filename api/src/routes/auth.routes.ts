import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();

// In-memory user store (Phase 2 - will move to database in next phase)
interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'master_admin' | 'distributor' | 'manager' | 'operator';
  licenseId: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

interface RefreshToken {
  token: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

let users: Map<string, StoredUser> = new Map();
let refreshTokens: Map<string, RefreshToken> = new Map();

// Initialize with default master admin
const initializeDefaultAdmin = () => {
  if (users.size === 0) {
    const adminId = uuidv4();
    const defaultPassword = 'password'; // Demo password as per UI
    
    const defaultAdmin: StoredUser = {
      id: adminId,
      email: 'admin@broadcaster.local',
      passwordHash: bcrypt.hashSync(defaultPassword, 10),
      name: 'Master Administrator',
      role: 'master_admin',
      licenseId: 'master-license-1',
      isActive: true,
      createdAt: new Date(),
    };
    
    // Store by email
    users.set('admin@broadcaster.local', defaultAdmin);
    
    // Also store by username for easier access
    users.set('admin', defaultAdmin);
  }
};

initializeDefaultAdmin();

/**
 * POST /auth/register
 * Register a new user
 * Only available to distributors/managers who can create users
 */
router.post('/register', authMiddleware.requirePermission('create', 'users'), async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, licenseId } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, password, name',
        code: 'VALIDATION_ERROR',
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        code: 'INVALID_EMAIL',
      });
    }

    // Password validation (min 8 chars, alphanumeric)
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
        code: 'WEAK_PASSWORD',
      });
    }

    // Check if user already exists
    if (users.has(email)) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        code: 'USER_EXISTS',
      });
    }

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10);

    // Create user
    const newUser: StoredUser = {
      id: uuidv4(),
      email,
      passwordHash,
      name,
      role: role || 'operator',
      licenseId: licenseId || 'default-license',
      isActive: true,
      createdAt: new Date(),
    };

    users.set(email, newUser);

    // Generate tokens
    const accessToken = authMiddleware.generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      licenseId: newUser.licenseId,
    });

    const refreshToken = authMiddleware.generateRefreshToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      licenseId: newUser.licenseId,
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    refreshTokens.set(refreshToken, {
      token: refreshToken,
      userId: newUser.id,
      createdAt: new Date(),
      expiresAt,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'REGISTER_ERROR',
    });
  }
});

/**
 * POST /auth/login
 * Login with email/username and password
 */
router.post(
  '/login',
  authMiddleware.rateLimitAuth(5, 15 * 60 * 1000),
  async (req: Request, res: Response) => {
    try {
      const { email, username, password } = req.body;
      
      console.log('Login attempt:', { email, username, password, allUsers: Array.from(users.keys()) });
      
      // Accept either email or username
      const identifier = email || username;

      // Validation
      if (!identifier || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email/username and password are required',
          code: 'MISSING_CREDENTIALS',
        });
      }

      // Find user (try both email and username)
      let user = users.get(identifier);
      
      console.log('User found:', user ? 'YES' : 'NO', 'Identifier:', identifier);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email/username or password',
          code: 'INVALID_CREDENTIALS',
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'User account is deactivated',
          code: 'ACCOUNT_INACTIVE',
        });
      }

      // Verify password
      const passwordMatch = bcrypt.compareSync(password, user.passwordHash);

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        });
      }

      // Update last login
      user.lastLogin = new Date();

      // Generate tokens
      const accessToken = authMiddleware.generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        licenseId: user.licenseId,
      });

      const refreshToken = authMiddleware.generateRefreshToken({
        id: user.id,
        email: user.email,
        role: user.role,
        licenseId: user.licenseId,
      });

      // Store refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      refreshTokens.set(refreshToken, {
        token: refreshToken,
        userId: user.id,
        createdAt: new Date(),
        expiresAt,
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            licenseId: user.licenseId,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'LOGIN_ERROR',
      });
    }
  }
);

/**
 * POST /auth/logout
 * Logout user (invalidate refresh tokens)
 */
router.post('/logout', authMiddleware.verifyJWT, (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      refreshTokens.delete(refreshToken);
    }

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'LOGOUT_ERROR',
    });
  }
});

/**
 * POST /auth/refresh-token
 * Get new access token using refresh token
 */
router.post('/refresh-token', (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN',
      });
    }

    // Verify refresh token
    const payload = authMiddleware.verifyRefreshToken(refreshToken);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    // Check if refresh token exists in storage
    const storedToken = refreshTokens.get(refreshToken);

    if (!storedToken || new Date() > storedToken.expiresAt) {
      refreshTokens.delete(refreshToken);
      return res.status(401).json({
        success: false,
        error: 'Refresh token has expired',
        code: 'REFRESH_TOKEN_EXPIRED',
      });
    }

    // Generate new access token
    const newAccessToken = authMiddleware.generateToken({
      id: payload.id,
      email: payload.email,
      role: payload.role,
      licenseId: payload.licenseId,
    });

    res.json({
      success: true,
      message: 'New access token generated',
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'REFRESH_ERROR',
    });
  }
});

/**
 * POST /auth/verify-token
 * Verify if token is valid
 */
router.post('/verify-token', (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
        code: 'MISSING_TOKEN',
      });
    }

    const payload = authMiddleware.verifyToken(token);

    if (!payload) {
      return res.json({
        success: true,
        valid: false,
        message: 'Token is invalid or expired',
      });
    }

    res.json({
      success: true,
      valid: true,
      message: 'Token is valid',
      data: {
        id: payload.id,
        email: payload.email,
        role: payload.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'VERIFY_ERROR',
    });
  }
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', authMiddleware.verifyJWT, (req: Request, res: Response) => {
  try {
    const user = users.get(req.user?.email!);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        licenseId: user.licenseId,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'ME_ERROR',
    });
  }
});

/**
 * POST /auth/change-password
 * Change user password
 */
router.post(
  '/change-password',
  authMiddleware.verifyJWT,
  async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required',
          code: 'MISSING_PASSWORD',
        });
      }

      const user = users.get(req.user?.email!);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      // Verify current password
      const passwordMatch = bcrypt.compareSync(currentPassword, user.passwordHash);

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect',
          code: 'INVALID_PASSWORD',
        });
      }

      // Validate new password
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 8 characters',
          code: 'WEAK_PASSWORD',
        });
      }

      // Update password
      user.passwordHash = bcrypt.hashSync(newPassword, 10);

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'PASSWORD_CHANGE_ERROR',
      });
    }
  }
);

export default router;
