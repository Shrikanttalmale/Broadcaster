# 🚀 PHASE 2 IMPLEMENTATION PLAN

**Duration:** Week 3-4  
**Focus:** License System, RBAC, User Authentication & Management  
**Status:** Starting Implementation

---

## 📋 Phase 2 Objectives

### 1. **License System** ✅ Ready
- Implement license validation logic
- Support 3 license types: Master, Distributor, User
- Offline license verification
- License expiry checking
- Feature unlock system

### 2. **Role-Based Access Control (RBAC)** ✅ Ready
- Define 4 roles: Master Admin, Distributor, Manager, Operator
- Implement permission matrix
- Create role guards for routes
- Feature access restrictions

### 3. **User Authentication** ✅ Ready
- JWT token implementation
- Secure login/logout
- Password hashing
- Token refresh mechanism
- Session management

### 4. **User Management** ✅ Ready
- CRUD operations for users
- Role assignment
- License assignment to users
- User deactivation
- Audit logging

---

## 🏗️ Architecture Overview

```
Phase 2 Architecture:
┌─────────────────┐
│   React UI      │  Login → Token Storage → Protected Routes
└────────┬────────┘
         │ JWT Token
         ↓
┌─────────────────────────────┐
│   Express API               │
├─────────────────────────────┤
│ /auth                       │  ← Login, Register, Logout
│ /users                      │  ← CRUD operations
│ /licenses                   │  ← License management
└────────┬────────────────────┘
         │ Middleware: Auth, RBAC
         ↓
┌─────────────────────────────┐
│   Services Layer            │
├─────────────────────────────┤
│ AuthService                 │
│ LicenseService              │
│ RBACService                 │
│ UserService                 │
└────────┬────────────────────┘
         │ Database queries
         ↓
┌─────────────────────────────┐
│   SQLite Database           │
├─────────────────────────────┤
│ users, licenses, roles      │
└─────────────────────────────┘
```

---

## 📝 Implementation Breakdown

### Task 1: License Service
**File:** `api/src/services/license.service.ts`

```typescript
Class: LicenseService
├── generateLicense(licenseType, expiryDays)
├── validateLicense(licenseKey)
├── checkExpiry(licenseKey)
├── enableFeature(licenseKey, feature)
├── hasFeature(licenseKey, feature)
└── deactivateLicense(licenseKey)
```

**Features:**
- Offline validation with signature
- Feature matrix enforcement
- Expiry date checking
- License type hierarchy

---

### Task 2: RBAC Service
**File:** `api/src/services/rbac.service.ts`

```typescript
Class: RBACService
├── hasRole(userId, role)
├── hasPermission(userId, permission)
├── canAccessResource(userId, resource)
├── getPermissionMatrix()
├── enforceFeature(userId, feature)
└── logAccess(userId, action)
```

**Role Hierarchy:**
```
Master Admin
  ├── Full access to everything
  ├── Can create distributors
  └── Can view all reports

Distributor
  ├── Can create managers & operators
  ├── Can view their own campaigns
  ├── Limited to their plans
  └── Can set up white-label

Manager
  ├── Can create operators
  ├── Can manage campaigns
  ├── Can view reports
  └── Cannot modify licenses

Operator
  ├── Can create/run campaigns
  ├── Can view their campaigns
  ├── Cannot create users
  └── View-only permissions
```

**Permission Matrix:**
```
Master Admin: * (all)
Distributor: create_manager, create_operator, view_campaigns, view_reports
Manager: create_operator, manage_campaigns, view_reports
Operator: create_campaign, run_campaign, view_own_campaigns
```

---

### Task 3: Auth Routes
**File:** `api/src/routes/auth.routes.ts`

```
POST /auth/register          → Register new user
POST /auth/login             → Login with credentials
POST /auth/logout            → Logout and invalidate token
POST /auth/refresh-token     → Get new JWT token
GET  /auth/verify-token      → Verify token validity
GET  /auth/me                → Get current user info
```

**Request/Response:**
```
POST /auth/login
{
  "email": "user@example.com",
  "password": "secure_password"
}

Response:
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "manager",
    "licenseId": "license_uuid"
  }
}
```

---

### Task 4: User Routes
**File:** `api/src/routes/user.routes.ts`

```
GET    /users                → List users (with RBAC)
POST   /users                → Create new user
GET    /users/:id            → Get user details
PUT    /users/:id            → Update user
DELETE /users/:id            → Deactivate user
PUT    /users/:id/role       → Change user role
PUT    /users/:id/license    → Assign license to user
```

---

### Task 5: License Routes
**File:** `api/src/routes/license.routes.ts`

```
GET    /licenses             → List licenses
POST   /licenses             → Generate new license
GET    /licenses/:id         → Get license details
PUT    /licenses/:id         → Update license
DELETE /licenses/:id         → Deactivate license
POST   /licenses/:id/validate → Validate license
GET    /licenses/:id/features → Get enabled features
```

---

### Task 6: Auth Middleware
**File:** `api/src/middleware/auth.middleware.ts`

```typescript
// Middleware functions:
├── verifyToken()          → Check JWT validity
├── requireRole(role)      → Check user role
├── requirePermission(perm)→ Check permission
├── rateLimiter()          → Prevent brute force
└── auditLog()             → Log all actions
```

---

### Task 7: Database Initialization
**File:** `api/src/utils/db-init.ts`

```typescript
├── createTablesFromSchema()
├── insertDefaultPlans()
├── insertMasterAdmin()
└── createIndexes()
```

**Default Master Admin:**
```
Email: admin@broadcaster.local
Password: (set during first run)
Role: Master Admin
```

---

### Task 8: UI Updates
**Files:**
- `ui/src/components/auth/LoginForm.tsx` → Enhanced login
- `ui/src/pages/LoginPage.tsx` → Token handling
- `ui/src/services/auth.service.ts` → API calls
- `ui/src/hooks/useAuth.ts` → Auth state
- `ui/src/hooks/useProtectedRoute.ts` → Route protection

---

## 🔐 Security Checklist

- [ ] Password hashing with bcrypt
- [ ] JWT token expiry (15 min access, 7 day refresh)
- [ ] Rate limiting on login (5 attempts, 15 min lockout)
- [ ] HTTPS ready (will be enforced)
- [ ] Input validation (Joi)
- [ ] CORS properly configured
- [ ] Audit logging for all actions
- [ ] License signature verification

---

## 📊 Database Schema References

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL,  -- master_admin, distributor, manager, operator
  license_id TEXT,
  is_active BOOLEAN DEFAULT 1,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(license_id) REFERENCES licenses(id)
);
```

### Licenses Table
```sql
CREATE TABLE licenses (
  id TEXT PRIMARY KEY,
  license_type TEXT NOT NULL,  -- master, distributor, user
  license_key TEXT UNIQUE NOT NULL,
  owner_id TEXT,
  plan_id TEXT,
  status TEXT,  -- active, inactive, expired
  features TEXT,  -- JSON with enabled features
  expiry_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(owner_id) REFERENCES users(id),
  FOREIGN KEY(plan_id) REFERENCES plans(id)
);
```

---

## 🧪 Testing Plan

### Unit Tests
- [ ] License validation logic
- [ ] RBAC permission checks
- [ ] Password hashing
- [ ] Token generation/verification

### Integration Tests
- [ ] Complete login flow
- [ ] User creation with license
- [ ] RBAC enforcement on routes
- [ ] License expiry handling

### E2E Tests
- [ ] User registers → logs in → accesses dashboard
- [ ] Admin creates manager → manager creates operator
- [ ] License assignment and feature access

---

## 📈 Success Criteria

✅ All users can register and login  
✅ JWT tokens work and expire properly  
✅ RBAC prevents unauthorized access  
✅ License system validates offline  
✅ Audit logs capture all actions  
✅ 90% test coverage  
✅ No security vulnerabilities  
✅ All endpoints documented  

---

## 📅 Timeline

| Day | Task | Status |
|-----|------|--------|
| 1-2 | Services (License, RBAC, Auth) | Pending |
| 3-4 | Routes & Middleware | Pending |
| 5-6 | UI Components & Integration | Pending |
| 7 | Testing & Bug Fixes | Pending |
| 8 | Documentation & Release | Pending |

---

## 🚀 Next Steps

1. ✅ Start implementing license.service.ts
2. Implement rbac.service.ts
3. Create auth and user routes
4. Add JWT middleware
5. Update UI with auth components
6. Test all endpoints
7. Deploy Phase 2

---

## 📚 References

- JWT: https://jwt.io
- bcrypt: https://github.com/kelektiv/node.bcrypt.js
- RBAC Patterns: https://en.wikipedia.org/wiki/Role-based_access_control
- Express Middleware: https://expressjs.com/guide/using-middleware.html
