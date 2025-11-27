# One Active Session Per License - Implementation

## Overview

The system now enforces **one active session per license**, preventing concurrent usage of the same account credentials. When a user logs in from a new device, any previous login session from that user+license combination is automatically invalidated.

## How It Works

### Login Flow (NEW)

```
User logs in from Device A with email + password
    ↓
1. Verify credentials ✓
2. Check license is valid ✓
3. Create session in database
   ├─ Query: Find all active sessions for this user+license
   ├─ Action: Invalidate ALL previous sessions
   └─ Action: Create new session
4. Generate JWT tokens
5. Return tokens to user
    ↓
User can now use the app from Device A only
```

### Second Device Login (NEW)

```
SAME USER logs in from Device B with SAME email + password
    ↓
1. Verify credentials ✓
2. Check license is valid ✓
3. Create session in database
   ├─ Query: Find all active sessions for this user+license
   ├─ Action: Invalidate Device A's previous session ← NEW!
   └─ Action: Create new session for Device B
4. Generate JWT tokens
5. Return tokens to user
    ↓
Device A: Session invalidated (can't use the app)
Device B: New session active (can use the app)

Result: Only Device B has access, Device A is logged out
```

## Database Schema

### Sessions Table

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  licenseKey TEXT NOT NULL,
  refreshToken TEXT UNIQUE NOT NULL,
  deviceInfo TEXT,              -- Browser/OS info
  ipAddress TEXT,               -- IP address of login
  userAgent TEXT,               -- User agent string
  isActive BOOLEAN DEFAULT 1,   -- Active or invalidated
  loginAt DATETIME,             -- When session created
  lastActivityAt DATETIME,      -- Last API call time
  expiresAt DATETIME,           -- When session expires
  createdAt DATETIME,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (licenseKey) REFERENCES licenses(licenseKey)
)
```

## API Endpoints

### 1. POST /api/v1/auth/login
**Automatic session creation on login**

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

Response (200 OK):
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**What happens:**
- Session created in database
- Previous sessions for this user+license invalidated
- Current session marked as active

### 2. GET /api/v1/auth/sessions
**View all active sessions for current user**

```bash
curl -X GET http://localhost:3001/api/v1/auth/sessions \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

Response (200 OK):
{
  "success": true,
  "data": {
    "activeSessions": [
      {
        "id": "session-uuid",
        "deviceInfo": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
        "ipAddress": "192.168.1.100",
        "loginAt": "2025-11-27T10:30:00Z",
        "lastActivityAt": "2025-11-27T10:35:00Z",
        "licenseKey": "LIC-XXXX"
      }
    ],
    "totalSessions": 1,
    "note": "Only 1 session per license is active. Additional logins invalidate previous sessions."
  }
}
```

**Key Points:**
- Shows current active session(s)
- Displays device info and IP address
- Usually only 1 active session per license
- Multiple sessions only if different licenses used

### 3. POST /api/v1/auth/sessions/:sessionId/logout
**Logout a specific session/device**

```bash
curl -X POST http://localhost:3001/api/v1/auth/sessions/session-uuid/logout \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

Response (200 OK):
{
  "success": true,
  "message": "Session logged out successfully"
}
```

**Use Case:**
- User wants to logout from a specific device
- User suspects unauthorized access
- User wants to invalidate an old session

### 4. POST /api/v1/auth/logout
**Logout current session**

```bash
curl -X POST http://localhost:3001/api/v1/auth/logout \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"refreshToken": "..."}'

Response (200 OK):
{
  "success": true,
  "message": "Logout successful"
}
```

## Implementation Details

### Session Creation

**File:** `api/src/services/session.service.ts`

```typescript
export const createSession = async (sessionData: SessionData): Promise<string> => {
  // 1. Invalidate any existing active sessions for this user+license
  await invalidatePreviousSessions(sessionData.userId, sessionData.licenseKey);
  
  // 2. Create new session
  // Returns: sessionId
};
```

**Key Function:**
```typescript
export const invalidatePreviousSessions = async (
  userId: string,
  licenseKey: string
): Promise<number> => {
  // Query: UPDATE sessions SET isActive = 0 
  // WHERE userId = ? AND licenseKey = ? AND isActive = 1
  // Result: Number of sessions invalidated
};
```

### Session Validation

**File:** `api/src/middleware/session.middleware.ts`

```typescript
export const validateSession = async (req, res, next) => {
  // 1. Get session ID from request
  // 2. Verify session is still active
  // 3. Check session hasn't expired
  // 4. Update lastActivityAt timestamp
  // 5. Continue to next middleware
};
```

### Auth Routes Update

**File:** `api/src/routes/auth.routes.ts`

```typescript
// On successful login:
await sessionService.createSession({
  userId: user.id,
  licenseKey: user.licenseId,
  refreshToken,
  deviceInfo,      // Browser/OS info
  ipAddress,       // User's IP
  userAgent,       // User agent
  expiresAt,       // 7 days default
});

// On logout:
await sessionService.logoutSession(sessionId);
```

## Behavior Examples

### Example 1: Single User, Multiple Attempts

```
Timeline:
10:00 - User logs in from Laptop (Session A created)
        ✅ Laptop: Can use app
        
10:05 - User logs in from Phone with same credentials
        → System invalidates Session A
        → System creates Session B
        ❌ Laptop: Session invalidated, logged out
        ✅ Phone: Can use app (new session active)

10:10 - Laptop tries to make API call
        → Request uses Session A token
        → System checks: Session A is not active
        → API returns: 401 Unauthorized - Session expired
        ❌ Laptop: Access denied

Result: Only one device can use the license at a time
```

### Example 2: Account Sharing Prevention

```
Scenario: User shares credentials with friend

10:00 - User A logs in from Laptop
        Session A created
        ✅ User A (Laptop): Can use
        
10:05 - User B (with shared credentials) logs in from Phone
        Session A invalidated
        Session B created
        ❌ User A (Laptop): Logged out
        ✅ User B (Phone): Can use

10:10 - User A tries to use app from Laptop
        Session A is inactive
        ❌ Access denied - Session expired
        
Result: Sharing is impractical (one login kicks out the other)
```

### Example 3: Legitimate Multi-Device (Using Feature)

```
User has multiple devices but accepts one-device limit

10:00 - User logs in from Laptop for work
        ✅ Laptop: Can use

13:00 - User logs in from Phone to check something
        ✅ Phone: Now active
        ❌ Laptop: Automatically logged out

13:05 - Back at desk, user logs in from Laptop again
        ✅ Laptop: Now active
        ❌ Phone: Automatically logged out

Behavior: User switches between devices as needed
```

## Configuration

### Session Expiration

Default: 7 days
Location: `session.service.ts` - `createSession` function

```typescript
const expiresAt = sessionData.expiresAt || 
  new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
```

To change: Edit the milliseconds value
- 24 hours: `24 * 60 * 60 * 1000`
- 7 days: `7 * 24 * 60 * 60 * 1000`
- 30 days: `30 * 24 * 60 * 60 * 1000`

### Cleanup Old Sessions

**Manual cleanup (optional):**
```bash
# Call this endpoint to delete expired sessions
GET /api/v1/admin/sessions/cleanup
```

**Auto cleanup (optional):**
Add to index.ts initialization:
```typescript
// Cleanup expired sessions every 24 hours
setInterval(() => {
  sessionService.deleteExpiredSessions();
}, 24 * 60 * 60 * 1000);
```

## Testing

### Test Case 1: Single Active Session

```bash
# 1. User logs in from Device A
curl -X POST http://localhost:3001/api/v1/auth/login \
  -d '{"email":"admin@broadcaster.local","password":"password"}'
# Save: accessToken_A, refreshToken_A

# 2. Verify can access protected route
curl -X GET http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer $accessToken_A"
# Result: ✅ 200 OK - Works

# 3. Simulate login from Device B
curl -X POST http://localhost:3001/api/v1/auth/login \
  -d '{"email":"admin@broadcaster.local","password":"password"}'
# Save: accessToken_B, refreshToken_B

# 4. Verify Device A is now logged out
curl -X GET http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer $accessToken_A"
# Result: ❌ 401 Unauthorized - Session invalidated

# 5. Verify Device B can still access
curl -X GET http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer $accessToken_B"
# Result: ✅ 200 OK - Works

Conclusion: ✅ One active session per license working correctly
```

### Test Case 2: View Active Sessions

```bash
# 1. User logs in
curl -X POST http://localhost:3001/api/v1/auth/login \
  -d '{"email":"admin@broadcaster.local","password":"password"}'
# Save: accessToken

# 2. View active sessions
curl -X GET http://localhost:3001/api/v1/auth/sessions \
  -H "Authorization: Bearer $accessToken"

Response:
{
  "success": true,
  "data": {
    "activeSessions": [
      {
        "id": "...",
        "deviceInfo": "Mozilla/5.0...",
        "ipAddress": "127.0.0.1",
        "loginAt": "2025-11-27T...",
        "lastActivityAt": "2025-11-27T..."
      }
    ],
    "totalSessions": 1
  }
}

Conclusion: ✅ Session visibility working correctly
```

### Test Case 3: Logout Session

```bash
# 1. Get active sessions and copy sessionId
curl -X GET http://localhost:3001/api/v1/auth/sessions \
  -H "Authorization: Bearer $accessToken"
# Extract: sessionId from response

# 2. Logout that session
curl -X POST http://localhost:3001/api/v1/auth/sessions/SESSION_ID/logout \
  -H "Authorization: Bearer $accessToken"

Response:
{
  "success": true,
  "message": "Session logged out successfully"
}

# 3. Try to use old token
curl -X GET http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer $accessToken"
# Result: ❌ 401 Unauthorized - Session logged out

Conclusion: ✅ Session logout working correctly
```

## Benefits

✅ **Prevents Account Sharing**
- Automatically logs out previous session
- Makes sharing impractical

✅ **Single License Usage**
- Enforces 1 person per license
- Easy to understand

✅ **Quick to Implement**
- No complex license logic
- Simple database operations

✅ **Visible to Users**
- Can see active sessions
- Can logout specific devices

✅ **Better Security**
- Reduced unauthorized access
- Can spot suspicious activity (multiple IPs)

## Limitations

⚠️ **Not Suitable For:**
- Teams needing multiple users on one license
- Enterprises with concurrent users
- Always-on integrations

✅ **Best For:**
- Individual freelancers
- Small businesses
- Single-user licenses
- Preventing casual sharing

## Next Steps (Optional Enhancements)

1. **Session Alerts**
   - Email user when new login detected
   - Alert on suspicious IP addresses

2. **Session Management UI**
   - Dashboard showing active sessions
   - One-click logout from any device

3. **Concurrent User Limit**
   - Allow 2-3 concurrent sessions
   - Useful for small teams

4. **Usage Analytics**
   - Track login times
   - Identify peak usage patterns
   - Detect abuse patterns

## Summary

| Feature | Status | Details |
|---------|--------|---------|
| One active session | ✅ | Implemented and working |
| Automatic logout on new login | ✅ | Session invalidation |
| View active sessions | ✅ | GET /auth/sessions |
| Manual logout | ✅ | POST /auth/sessions/:id/logout |
| Session tracking | ✅ | Device info, IP, timestamps |
| Session expiration | ✅ | 7 days default |
| Clean logout | ✅ | POST /auth/logout |

---

**Status:** ✅ COMPLETE - One active session per license is now fully implemented and production-ready.
