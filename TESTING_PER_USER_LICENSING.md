# Testing Per-User Licensing System

## Quick Start

### 1. Start the API Server
```bash
cd c:\broadcaster\api
npm run dev
# Server starts on port 3001
```

### 2. Generate a License (Using API)
```bash
POST http://localhost:3001/api/v1/licenses/generate

Body:
{
  "licenseType": "user",
  "validDays": 30,
  "features": ["whatsapp", "campaigns", "analytics"]
}

Response:
{
  "success": true,
  "data": {
    "licenseKey": "LIC-XXXX-XXXX-XXXX",
    "signature": "sha256_hash...",
    "validUntil": "2025-02-15T12:00:00Z"
  }
}
```

### 3. Test Login WITH Valid License

#### Scenario A: User has valid license
```bash
POST http://localhost:3001/api/v1/auth/login

Body:
{
  "email": "admin@broadcaster.local",
  "password": "password"
}

Expected Response (✅ SUCCESS):
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid...",
      "email": "admin@broadcaster.local",
      "name": "Master Administrator",
      "role": "master_admin",
      "licenseId": "LIC-XXXX-XXXX-XXXX"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "uuid..."
  }
}
```

#### Scenario B: User without license
```bash
POST http://localhost:3001/api/v1/auth/login

Body:
{
  "email": "unlicensed@example.com",
  "password": "password123"
}

Expected Response (❌ FAILED):
{
  "success": false,
  "error": "User license is invalid, expired, or inactive",
  "code": "INVALID_LICENSE",
  "statusCode": 403
}
```

### 4. Test Protected Route Access (License Check)

#### Step 1: Login and get token
```bash
POST http://localhost:3001/api/v1/auth/login
# Copy accessToken from response
```

#### Step 2: Access protected route with valid license
```bash
GET http://localhost:3001/api/v1/users
Authorization: Bearer <accessToken>

Expected Response (✅ SUCCESS):
{
  "success": true,
  "data": {
    "users": [...],
    "total": 5
  }
}
```

#### Step 3: Try without token
```bash
GET http://localhost:3001/api/v1/users
(no Authorization header)

Expected Response (❌ NOT AUTHENTICATED):
{
  "success": false,
  "error": "User not authenticated",
  "code": "NOT_AUTHENTICATED",
  "statusCode": 401
}
```

### 5. Test Multi-Device Access

**Device A (Laptop):**
```bash
# 1. Login on laptop
POST http://localhost:3001/api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
# Save accessToken_A

# 2. Access protected route
GET http://localhost:3001/api/v1/users
Authorization: Bearer <accessToken_A>
# ✅ Works
```

**Device B (Phone) - SAME USER:**
```bash
# 1. Login on phone (same email)
POST http://localhost:3001/api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
# Save accessToken_B

# 2. Access protected route
GET http://localhost:3001/api/v1/users
Authorization: Bearer <accessToken_B>
# ✅ Works (same license, same user)
```

**Result:** Same user can access from multiple devices ✅

## Using Postman/Insomnia

### Create Requests

**1. Login Request**
```
Name: Login - Valid License
Method: POST
URL: http://localhost:3001/api/v1/auth/login

Body (JSON):
{
  "email": "admin@broadcaster.local",
  "password": "password"
}
```

**2. Generate License Request**
```
Name: Generate License
Method: POST
URL: http://localhost:3001/api/v1/licenses/generate

Body (JSON):
{
  "licenseType": "user",
  "validDays": 30,
  "features": ["whatsapp", "campaigns"]
}
```

**3. Get Users Request**
```
Name: Get Users (Protected)
Method: GET
URL: http://localhost:3001/api/v1/users

Headers:
Authorization: Bearer {{accessToken}}
```

### Environment Variables
```
Base URL: http://localhost:3001
accessToken: (copy from login response)
refreshToken: (copy from login response)
```

## cURL Examples

### Login
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@broadcaster.local",
    "password": "password"
  }'
```

### Get Users (with token)
```bash
curl -X GET http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Generate License
```bash
curl -X POST http://localhost:3001/api/v1/licenses/generate \
  -H "Content-Type: application/json" \
  -d '{
    "licenseType": "user",
    "validDays": 30,
    "features": ["whatsapp"]
  }'
```

## Test Cases

### ✅ Test Case 1: Successful Login with Valid License
```
Precondition:
- User exists: admin@broadcaster.local
- User has valid license: LIC-xxxx (not expired, isActive=true)

Steps:
1. POST /auth/login with email and password
2. Verify password matches

Expected:
- ✅ Return 200 OK
- ✅ Message: "Login successful"
- ✅ Response includes: accessToken, refreshToken
```

### ✅ Test Case 2: Login Failed - Expired License
```
Precondition:
- User exists with email
- User's license has validUntil < now()

Steps:
1. POST /auth/login with email and password
2. Verify password
3. Check license status

Expected:
- ❌ Return 403 Forbidden
- ❌ Error: "User license is invalid, expired, or inactive"
- ❌ Code: INVALID_LICENSE
```

### ✅ Test Case 3: Login Failed - License Inactive
```
Precondition:
- User exists with email
- User's license has isActive = false

Steps:
1. POST /auth/login with email and password
2. Verify password
3. Check license status

Expected:
- ❌ Return 403 Forbidden
- ❌ Error: "User license is invalid, expired, or inactive"
- ❌ Code: INVALID_LICENSE
```

### ✅ Test Case 4: Login Failed - User Has No License
```
Precondition:
- User exists with email
- User.licenseId is NULL

Steps:
1. POST /auth/login with email and password
2. Verify password
3. Check if user has license

Expected:
- ❌ Return 401 Unauthorized
- ❌ Error: "Invalid email/username or password" (or specific license error)
```

### ✅ Test Case 5: Protected Route Access with Valid License
```
Precondition:
- User logged in successfully
- User has valid accessToken
- User has valid license

Steps:
1. GET /users with Authorization: Bearer <token>
2. validateLicense middleware checks license
3. Permission middleware checks RBAC

Expected:
- ✅ Return 200 OK
- ✅ Response includes user list
```

### ✅ Test Case 6: Protected Route Denied - Invalid License
```
Precondition:
- User has token (from login)
- User's license is now expired (clock moved forward)

Steps:
1. GET /users with Authorization: Bearer <token>
2. validateLicense queries current license status
3. License check fails

Expected:
- ❌ Return 403 Forbidden
- ❌ Error: "User license is invalid, expired, or inactive"
- ❌ Code: INVALID_LICENSE
```

### ✅ Test Case 7: Multi-Device Access - Same User
```
Precondition:
- One user, one license
- Can access from multiple devices

Steps:
1. Login on Device A (Laptop) → get token_a
2. Access GET /users with token_a → ✅ Works
3. Login on Device B (Phone) with same credentials → get token_b
4. Access GET /users with token_b → ✅ Works

Expected:
- ✅ Both devices can access (same user, same license)
- ✅ No device-specific restrictions
- ✅ License check passes on both
```

### ✅ Test Case 8: Multi-Device Access - Different Users
```
Precondition:
- Two different users, two different licenses
- Both users can access simultaneously

Steps:
1. User A logs in on Device 1 → token_a
2. User B logs in on Device 2 → token_b
3. User A accesses GET /users with token_a → ✅ Works
4. User B accesses GET /users with token_b → ✅ Works

Expected:
- ✅ Each user sees their own data (RBAC)
- ✅ No interference between users
- ✅ Both licenses validated independently
```

## Database Verification

### Check Users Table Structure
```sql
PRAGMA table_info(users);

Expected columns:
- id (TEXT PRIMARY KEY)
- username (TEXT UNIQUE)
- passwordHash (TEXT)
- email (TEXT)
- role (TEXT)
- licenseKey (TEXT) ← NEW
- isActive (BOOLEAN)
- createdAt (DATETIME)
- updatedAt (DATETIME)

Check: licenseKey should have FOREIGN KEY to licenses(licenseKey)
```

### Check Licenses Table
```sql
SELECT * FROM licenses;

Expected columns:
- id (TEXT PRIMARY KEY)
- licenseKey (TEXT UNIQUE NOT NULL)
- licenseType (TEXT)
- isActive (BOOLEAN)
- validUntil (DATETIME)
- features (JSON)
- signature (TEXT)
- createdAt (DATETIME)
```

### Verify Device Table Removed
```sql
PRAGMA table_info(device_registrations);

Expected: 
❌ No results (table removed)

If table still exists:
DROP TABLE device_registrations;
```

## Troubleshooting

### Issue: "User license is invalid" on login
**Cause:** License doesn't exist or is expired
**Solution:**
1. Generate new license
2. Assign to user (update users.licenseKey)
3. Ensure license.isActive = 1
4. Ensure license.validUntil > current time

### Issue: Protected route returns 403 INVALID_LICENSE
**Cause:** License validation middleware failed
**Solution:**
1. Check user has valid token (JWT not expired)
2. Check user's licenseKey in database
3. Check license exists and is active
4. Check license validUntil date

### Issue: Cannot access from second device
**Solution:**
- ✅ This should work now (per-user licensing)
- Use same email and password on all devices
- Generate fresh tokens on each device
- No device registration needed

### Issue: Build errors about device.routes
**Solution:**
- Device files have been deleted
- Clear TypeScript cache: `rm -rf api/dist`
- Rebuild: `npm run build`

## API Endpoints Reference

| Method | Endpoint | Auth | License | Purpose |
|--------|----------|------|---------|---------|
| POST | /api/v1/auth/login | No | Check | User login (validates license) |
| POST | /api/v1/auth/register | Role | No | Register new user |
| POST | /api/v1/auth/logout | Yes | No | Logout user |
| GET | /api/v1/users | Yes | Yes | List users |
| POST | /api/v1/licenses/generate | Role | No | Generate license |
| GET | /api/v1/licenses | Yes | Yes | List licenses |

## Summary

**Per-User Licensing Test Summary:**
- ✅ Login validates user has active, non-expired license
- ✅ Protected routes check license on every request
- ✅ Multi-device access works (same user, any device)
- ✅ License status changes (expiration) take effect immediately
- ✅ Device files deleted (no longer needed)
- ✅ System is ready for deployment
