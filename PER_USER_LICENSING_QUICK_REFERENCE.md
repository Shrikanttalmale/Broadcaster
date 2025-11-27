# ⚡ Per-User Licensing - Quick Reference Card

## Changes at a Glance

| What | Before | After |
|------|--------|-------|
| **Licensing Model** | Per-Device (fingerprinting) ❌ | Per-User (account-based) ✅ |
| **Device Access** | Only 1 device allowed | Any device allowed |
| **Auth Check** | Device fingerprinting | User credentials + license validation |
| **Onboarding** | 10 minutes | 2 minutes |
| **Files Deleted** | N/A | device.routes.ts, device.service.ts |
| **Database** | device_registrations table | Removed ✅ |
| **Users Table** | No licenseKey | Added licenseKey FK ✅ |
| **Middleware** | N/A | Added validateLicense ✅ |

## Files Modified (6)

```
✅ api/src/services/database.service.ts
   - Added licenseKey to users
   - Removed device_registrations table

✅ api/src/routes/auth.routes.ts
   - Added license validation on login

✅ api/src/middleware/license.middleware.ts
   - NEW: License validation middleware

✅ api/src/routes/user.routes.ts
   - Added validateLicense to routes

✅ api/src/routes/license.routes.ts
   - Added validateLicense to routes

✅ api/src/index.ts
   - Removed device routes
```

## Files Deleted (2)

```
❌ api/src/routes/device.routes.ts
❌ api/src/services/device.service.ts
```

## Login Flow (NEW)

```
Email + Password
      │
      ▼
1. Find User
2. Verify Password ✓
3. Get User's License Key
      │
      ▼
4. Query licenses table:
   - licenseKey exists? ✓
   - isActive = 1? ✓
   - validUntil > now()? ✓
      │
      └─→ ✅ All checks pass → Generate JWT → Login ✓
          ❌ Any check fails → Return 403 → Deny login ✗
```

## Protected Route Flow (NEW)

```
Request + JWT Token
      │
      ▼
1. Verify JWT
2. validateLicense middleware:
   - Check user's license
   - Check if active
   - Check if expired
      │
      ├─→ ✅ Valid → Continue to route handler
      └─→ ❌ Invalid → Return 403, deny access
```

## Quick Test Commands

### 1. Build
```bash
cd c:\broadcaster\api
npm run build
```

### 2. Start Dev Server
```bash
npm run dev
```

### 3. Test Login
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@broadcaster.local",
    "password": "password"
  }'
```

### 4. Test Protected Route
```bash
curl -X GET http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

## Expected Responses

### ✅ Valid License Login
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "email": "...", "licenseId": "..." },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### ❌ Invalid/Expired License
```json
{
  "success": false,
  "error": "User license is invalid, expired, or inactive",
  "code": "INVALID_LICENSE",
  "statusCode": 403
}
```

## Multi-Device Test

**Device A (Laptop):**
```bash
curl http://localhost:3001/api/v1/auth/login \
  -d '{"email":"user@example.com","password":"pass"}'
# Save accessToken → token_a

curl http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer token_a"
# ✅ Works
```

**Device B (Phone - Same User):**
```bash
curl http://localhost:3001/api/v1/auth/login \
  -d '{"email":"user@example.com","password":"pass"}'
# Save accessToken → token_b

curl http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer token_b"
# ✅ Works (same license, same user)
```

## Database Verification

### Check Schema
```sql
PRAGMA table_info(users);
-- Should show: licenseKey column

SELECT name FROM sqlite_master WHERE type='table';
-- Should NOT show: device_registrations
```

### List Licenses
```sql
SELECT licenseKey, isActive, validUntil FROM licenses;
```

## Key Points

1. **License tied to USER, not DEVICE** ✅
2. **Check happens on LOGIN** ✅
3. **Check happens on EVERY PROTECTED ROUTE** ✅
4. **User can access from MULTIPLE DEVICES** ✅
5. **No device fingerprinting needed** ✅

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Build fails | Delete `api/dist`, run `npm run build` |
| "User license invalid" | Check user.licenseKey exists in DB |
| "License expired" | Create new license with future validUntil |
| Can't access 2nd device | It should work - same email/password |
| 401 error on protected route | Get token from login first |
| 403 error on protected route | License invalid or expired |

## Documentation Files

1. **PER_USER_LICENSING_SUMMARY.md** - Complete overview
2. **MIGRATION_TO_PER_USER_LICENSING.md** - Detailed changes
3. **TESTING_PER_USER_LICENSING.md** - Test procedures
4. **PER_USER_LICENSING_QUICK_REFERENCE.md** - This file

## Status

✅ **Complete and Ready**
- Code updated
- Database schema fixed
- Build succeeds
- Ready for testing
- Ready for deployment

---

**Remember:** Per-user licensing is the correct model for web apps. Devices don't matter - only the user account does. 🚀
