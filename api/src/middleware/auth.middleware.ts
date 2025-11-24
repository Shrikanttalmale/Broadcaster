import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import rBACService, { UserRole } from '../services/rbac.service';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        licenseId: string;
        iat?: number;
        exp?: number;
      };
      accessLog?: {
        requestId: string;
        timestamp: Date;
        method: string;
        path: string;
        status?: number;
        duration?: number;
        userId?: string;
        ip?: string;
      };
    }
  }
}

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  licenseId: string;
}

export class AuthMiddleware {
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private jwtExpiresIn: string;
  private refreshTokenExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'broadcaster-default-jwt-secret';
    this.jwtRefreshSecret =
      process.env.JWT_REFRESH_SECRET || 'broadcaster-default-refresh-secret';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  }

  /**
   * Generate JWT token
   */
  generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      algorithm: 'HS256',
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: this.refreshTokenExpiresIn,
      algorithm: 'HS256',
    });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtRefreshSecret) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Middleware: Attach request context (ID, timestamp)
   */
  attachRequestContext = (req: Request, res: Response, next: NextFunction) => {
    req.accessLog = {
      requestId: uuidv4(),
      timestamp: new Date(),
      method: req.method,
      path: req.path,
      ip: req.ip || req.socket.remoteAddress,
    };

    // Add request ID to response headers
    res.setHeader('X-Request-ID', req.accessLog.requestId);

    next();
  };

  /**
   * Middleware: Verify JWT token and extract user info
   */
  verifyJWT = (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({
          success: false,
          error: 'No authorization header',
          code: 'MISSING_TOKEN',
        });
      }

      // Extract token from "Bearer <token>"
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

      const payload = this.verifyToken(token);

      if (!payload) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        });
      }

      // Attach user to request
      req.user = payload;
      req.accessLog!.userId = payload.id;

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_ERROR',
      });
    }
  };

  /**
   * Middleware: Require specific role
   */
  requireRole = (...allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
          code: 'NOT_AUTHENTICATED',
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        // Log denied access
        rBACService.logAccess(
          req.user.id,
          'access_route',
          req.path,
          false,
          `Role ${req.user.role} not in allowed roles`,
          req.accessLog?.ip,
          req.headers['user-agent']
        );

        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required: allowedRoles,
          current: req.user.role,
        });
      }

      next();
    };
  };

  /**
   * Middleware: Require specific permission
   */
  requirePermission = (action: string, resource: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
          code: 'NOT_AUTHENTICATED',
        });
      }

      const hasPermission = rBACService.hasPermission(
        req.user.role,
        action,
        resource
      );

      if (!hasPermission) {
        // Log denied access
        rBACService.logAccess(
          req.user.id,
          action,
          resource,
          false,
          `Permission denied for ${action}:${resource}`,
          req.accessLog?.ip,
          req.headers['user-agent']
        );

        return res.status(403).json({
          success: false,
          error: 'You do not have permission to perform this action',
          code: 'PERMISSION_DENIED',
          required: { action, resource },
        });
      }

      // Log successful access
      rBACService.logAccess(
        req.user.id,
        action,
        resource,
        true,
        undefined,
        req.accessLog?.ip,
        req.headers['user-agent']
      );

      next();
    };
  };

  /**
   * Middleware: Check if user is master admin
   */
  isMasterAdmin = (req: Request, res: Response, next: NextFunction) => {
    return this.requireRole('master_admin')(req, res, next);
  };

  /**
   * Middleware: Check if user is distributor or higher
   */
  isDistributorOrHigher = (req: Request, res: Response, next: NextFunction) => {
    return this.requireRole('master_admin', 'distributor')(req, res, next);
  };

  /**
   * Middleware: Check if user is manager or higher
   */
  isManagerOrHigher = (req: Request, res: Response, next: NextFunction) => {
    return this.requireRole('master_admin', 'distributor', 'manager')(
      req,
      res,
      next
    );
  };

  /**
   * Middleware: Rate limiting for auth endpoints
   */
  rateLimitAuth = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
    const attempts: Map<string, Array<number>> = new Map();

    return (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const now = Date.now();

      // Get previous attempts
      const userAttempts = attempts.get(ip) || [];

      // Remove attempts outside the window
      const recentAttempts = userAttempts.filter((time) => now - time < windowMs);

      if (recentAttempts.length >= maxAttempts) {
        return res.status(429).json({
          success: false,
          error: 'Too many login attempts. Please try again later.',
          code: 'RATE_LIMITED',
          retryAfter: Math.ceil(
            (recentAttempts[0] + windowMs - now) / 1000
          ),
        });
      }

      // Record this attempt
      recentAttempts.push(now);
      attempts.set(ip, recentAttempts);

      next();
    };
  };

  /**
   * Middleware: Log access attempts
   */
  logAccess = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Intercept res.end to capture status code
    const originalEnd = res.end;
    res.end = function (...args: any[]) {
      req.accessLog!.status = res.statusCode;
      req.accessLog!.duration = Date.now() - startTime;

      // Log the access
      const log = req.accessLog!;
      const level =
        res.statusCode >= 500
          ? 'error'
          : res.statusCode >= 400
            ? 'warn'
            : 'info';
      
      // Here you would normally call logger service
      console.log(
        `[${level.toUpperCase()}] ${log.method} ${log.path} - ${res.statusCode} (${log.duration}ms) ${log.userId ? `[User: ${log.userId}]` : ''}`
      );

      return originalEnd.apply(res, args);
    } as any;

    next();
  };

  /**
   * Middleware: Require feature access
   */
  requireFeature = (feature: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
          code: 'NOT_AUTHENTICATED',
        });
      }

      // In production, this would check against the license features
      // For now, just check if role has access to feature
      const hasAccess = rBACService.canAccessFeature(req.user.role, feature);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: `This feature is not available in your plan`,
          code: 'FEATURE_NOT_AVAILABLE',
          feature,
        });
      }

      next();
    };
  };

  /**
   * Middleware: Optional authentication (doesn't fail if no token)
   */
  optionalJWT = (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader) {
        const token = authHeader.startsWith('Bearer ')
          ? authHeader.slice(7)
          : authHeader;

        const payload = this.verifyToken(token);

        if (payload) {
          req.user = payload;
          req.accessLog!.userId = payload.id;
        }
      }

      next();
    } catch (error) {
      // Silently continue even if token verification fails
      next();
    }
  };
}

export default new AuthMiddleware();
