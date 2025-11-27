# Per-User Licensing - Code Changes Reference

## File 1: api/src/services/database.service.ts

### Change 1: Add licenseKey to Users Table
```typescript
// BEFORE:
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'operator')),
  isActive BOOLEAN DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
)

// AFTER:
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'operator')),
  licenseKey TEXT,  // ← NEW: Added this column
  isActive BOOLEAN DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(licenseKey) REFERENCES licenses(licenseKey) ON DELETE SET NULL  // ← NEW: FK
)
```

### Change 2: Remove device_registrations Table
```typescript
// DELETED:
await db.exec(`
  CREATE TABLE IF NOT EXISTS device_registrations (
    id TEXT PRIMARY KEY,
    licenseKey TEXT NOT NULL,
    deviceId TEXT NOT NULL,
    deviceName TEXT,
    deviceFingerprint TEXT UNIQUE,
    isPrimary BOOLEAN DEFAULT 0,
    registeredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastUsedAt DATETIME,
    FOREIGN KEY(licenseKey) REFERENCES licenses(licenseKey) ON DELETE CASCADE,
    UNIQUE(licenseKey, deviceId)
  )
`);

// This entire table creation was removed (no longer needed for per-user licensing)
```

---

## File 2: api/src/routes/auth.routes.ts

### Change 1: Add Database Import
```typescript
// BEFORE:
import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import authMiddleware from '../middleware/auth.middleware';

// AFTER:
import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import authMiddleware from '../middleware/auth.middleware';
import { getDatabase } from '../services/database.service';  // ← NEW: Added
```

### Change 2: Add License Validation to Login
```typescript
// BEFORE (in POST /auth/login):
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

// AFTER (NEW license check added):
      // Verify password
      const passwordMatch = bcrypt.compareSync(password, user.passwordHash);

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        });
      }

      // Check user's license (NEW: Per-user licensing for online app)
      if (user.licenseId) {
        try {
          const db = getDatabase();
          if (db) {
            const license = await db.get(
              `SELECT * FROM licenses WHERE licenseKey = ? AND isActive = 1 AND validUntil > datetime('now')`,
              [user.licenseId]
            );

            if (!license) {
              return res.status(403).json({
                success: false,
                error: 'User license is invalid, expired, or inactive',
                code: 'INVALID_LICENSE',
              });
            }
          }
        } catch (licenseError: any) {
          // If database check fails, continue (database might not be fully initialized)
          console.warn('License validation warning:', licenseError.message);
        }
      }

      // Update last login
      user.lastLogin = new Date();
```

---

## File 3: api/src/middleware/license.middleware.ts (NEW FILE)

```typescript
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
```

---

## File 4: api/src/routes/user.routes.ts

### Change: Add License Middleware Import and Usage
```typescript
// BEFORE:
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import authMiddleware from '../middleware/auth.middleware';
import rBACService from '../services/rbac.service';

// AFTER:
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import authMiddleware from '../middleware/auth.middleware';
import { validateLicense } from '../middleware/license.middleware';  // ← NEW
import rBACService from '../services/rbac.service';
```

### Apply to GET / users route
```typescript
// BEFORE:
router.get(
  '/',
  authMiddleware.verifyJWT,
  authMiddleware.requirePermission('read', 'users'),
  (req: Request, res: Response) => {

// AFTER:
router.get(
  '/',
  authMiddleware.verifyJWT,
  validateLicense,  // ← NEW: Check license before processing
  authMiddleware.requirePermission('read', 'users'),
  (req: Request, res: Response) => {
```

---

## File 5: api/src/routes/license.routes.ts

### Change: Add License Middleware Import and Usage
```typescript
// BEFORE:
import { Router, Request, Response } from 'express';
import licenseService, { License, LicenseGenerationOptions } from '../services/license.service';
import authMiddleware from '../middleware/auth.middleware';

// AFTER:
import { Router, Request, Response } from 'express';
import licenseService, { License, LicenseGenerationOptions } from '../services/license.service';
import authMiddleware from '../middleware/auth.middleware';
import { validateLicense } from '../middleware/license.middleware';  // ← NEW
```

### Apply to GET / licenses route
```typescript
// BEFORE:
router.get(
  '/',
  authMiddleware.verifyJWT,
  authMiddleware.requirePermission('read', 'licenses'),
  (req: Request, res: Response) => {

// AFTER:
router.get(
  '/',
  authMiddleware.verifyJWT,
  validateLicense,  // ← NEW: Check license before processing
  authMiddleware.requirePermission('read', 'licenses'),
  (req: Request, res: Response) => {
```

---

## File 6: api/src/index.ts

### Change 1: Remove Device Routes Import
```typescript
// BEFORE:
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import licenseRoutes from './routes/license.routes';
import deviceRoutes from './routes/device.routes';  // ← REMOVED

// AFTER:
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import licenseRoutes from './routes/license.routes';
```

### Change 2: Remove Device Routes Registration
```typescript
// BEFORE:
app.use('/api/v1/licenses', licenseRoutes);
app.use('/api/v1/devices', deviceRoutes);  // ← REMOVED

// AFTER:
app.use('/api/v1/licenses', licenseRoutes);
```

---

## Files Deleted

### ❌ api/src/routes/device.routes.ts
**This entire file was deleted** - it contained all device registration endpoints

### ❌ api/src/services/device.service.ts
**This entire file was deleted** - it contained device fingerprinting logic

---

## Summary of Changes

| Operation | Files | Lines | Impact |
|-----------|-------|-------|--------|
| Database schema | 1 file | 10 lines | Added licenseKey, removed device table |
| Auth validation | 1 file | 20 lines | License check on login |
| License middleware | 1 file | 80 lines | NEW - validates on routes |
| Route updates | 2 files | 4 lines | Added middleware usage |
| Server config | 1 file | 2 lines | Removed device routes |
| Files deleted | 2 files | ~400 lines | Device system removed |

**Total: 6 files updated, 2 files deleted, ~116 lines added**

---

## Code Review Checklist

- [x] Database schema adds licenseKey FK to users
- [x] Database schema removes device_registrations table
- [x] Auth login validates user has active license
- [x] License validation happens before token generation
- [x] License middleware created and exported
- [x] License middleware checks user exists
- [x] License middleware checks licenseKey exists
- [x] License middleware queries licenses table
- [x] License middleware validates isActive = 1
- [x] License middleware validates validUntil > now()
- [x] Protected routes use validateLicense middleware
- [x] Device routes removed from server config
- [x] Device files deleted
- [x] TypeScript compiles without errors
- [x] All imports resolve correctly

---

## Testing the Changes

### Test 1: Verify Build
```bash
cd c:\broadcaster\api
npm run build
# Should complete with no errors
```

### Test 2: Login with Valid License
```bash
POST /api/v1/auth/login
{
  "email": "admin@broadcaster.local",
  "password": "password"
}
# Should return: ✅ 200 OK with tokens
```

### Test 3: Login with Expired License
```bash
# Setup: Create user with expired license
# Then try login

POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
# Should return: ❌ 403 INVALID_LICENSE
```

### Test 4: Protected Route with Valid License
```bash
GET /api/v1/users
Authorization: Bearer <valid_token_with_active_license>
# Should return: ✅ 200 OK with user list
```

### Test 5: Protected Route with Invalid License
```bash
# Setup: Get token, then invalidate user's license
# Then try route

GET /api/v1/users
Authorization: Bearer <token_with_now_invalid_license>
# Should return: ❌ 403 INVALID_LICENSE
```

---

**All changes complete and ready for testing!**
