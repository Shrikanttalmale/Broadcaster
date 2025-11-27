# Quick Start & Testing Guide

## Credentials
```
Email:    admin@broadcaster.local
Password: password
```

## Step 1: Start Server
```powershell
cd c:\broadcaster\api
npm run dev
```

Wait for: `Server running on port 3001`

---

## Step 2-4: Complete Test Flow

### Test 1: First Login
```powershell
$body = @{email='admin@broadcaster.local';password='password'} | ConvertTo-Json
$resp = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $body
$token1 = ($resp.Content | ConvertFrom-Json).data.accessToken
Write-Host "✓ Login 1 successful - Token: $($token1.Substring(0,20))..."
```

### Test 2: View Active Sessions (Device 1)
```powershell
$sessions = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/auth/sessions" -Method GET -Headers @{"Authorization"="Bearer $token1"}
$sessions.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
```
**Verify:** Shows 1 active session

### Test 3: Second Login (Same Credentials - Simulating Sharing)
```powershell
$resp2 = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $body
$token2 = ($resp2.Content | ConvertFrom-Json).data.accessToken
Write-Host "✓ Login 2 successful - Token: $($token2.Substring(0,20))..."
```

### Test 4: Verify First Token is Now Invalid
```powershell
try {
    Invoke-WebRequest -Uri "http://localhost:3001/api/v1/auth/me" -Method GET -Headers @{"Authorization"="Bearer $token1"} -ErrorAction Stop
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✓ First token INVALIDATED (401 Unauthorized)" -ForegroundColor Green
    }
}
```
**Verify:** Returns 401 Unauthorized (Device 1 kicked off)

### Test 5: Verify Second Token Works
```powershell
$me = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/auth/me" -Method GET -Headers @{"Authorization"="Bearer $token2"}
$me.Content | ConvertFrom-Json | ConvertTo-Json
```
**Verify:** Returns 200 OK with user info

### Test 6: View Sessions Again (Device 2)
```powershell
$sessions2 = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/auth/sessions" -Method GET -Headers @{"Authorization"="Bearer $token2"}
$sessions2.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
```
**Verify:** Still shows 1 active session (the new one, not the old one)

---

## What to Verify

| Check | Expected | Result |
|---|---|---|
| **First Login** | Returns accessToken + refreshToken | ✓ |
| **Device 1 Sessions** | 1 active session | ✓ |
| **Second Login** | Returns new accessToken + refreshToken | ✓ |
| **First Token After Second Login** | 401 Unauthorized | ✓ |
| **Second Token Works** | 200 OK with user data | ✓ |
| **Device 2 Sessions** | 1 active session (new one) | ✓ |
| **Device Info Captured** | Browser/OS info visible | ✓ |
| **IP Address Logged** | 127.0.0.1 for local testing | ✓ |

---

## Key Points

✓ **One Active Session Per License** - Only the most recent login works
✓ **Automatic Invalidation** - Previous sessions kicked off when new login occurs
✓ **Device Tracking** - IP and browser info captured
✓ **Activity Logging** - Login time and last activity tracked
✓ **Sharing Prevention** - Users cannot use app simultaneously with shared credentials

---

## Endpoints Reference

| Method | Endpoint | Headers | Purpose |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Content-Type: application/json | Login with email + password |
| POST | `/api/v1/auth/logout` | Authorization: Bearer token | Logout current session |
| GET | `/api/v1/auth/me` | Authorization: Bearer token | Get current user info |
| GET | `/api/v1/auth/sessions` | Authorization: Bearer token | View active sessions |
| POST | `/api/v1/auth/sessions/:id/logout` | Authorization: Bearer token | Logout specific device |

---

## Troubleshooting

**Server won't start:**
```powershell
cd c:\broadcaster\api
rm -Force -Recurse dist
npm run build
npm run dev
```

**Port 3001 already in use:**
```powershell
# Find and kill the process
Get-Process | Where-Object {$_.Path -match "node"} | Stop-Process -Force
```

**Database error:**
```powershell
# Reset database
cd c:\broadcaster\api
rm broadcaster.db
npm run dev  # Will recreate database
```

---

## Expected Outputs

### Successful Login
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "admin-id",
      "email": "admin@broadcaster.local",
      "name": "Master Administrator",
      "role": "master_admin"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "sessionId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Active Sessions
```json
{
  "success": true,
  "data": {
    "activeSessions": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "deviceInfo": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "ipAddress": "127.0.0.1",
        "loginAt": "2025-11-27T10:30:00.000Z",
        "lastActivityAt": "2025-11-27T10:30:05.000Z",
        "licenseKey": "master-license-1"
      }
    ],
    "totalSessions": 1
  }
}
```

### Invalid Session (401)
```json
{
  "success": false,
  "error": "Session expired or invalidated. Please login again.",
  "code": "SESSION_INVALID"
}
```

---

## Next Steps

1. ✅ Start server and login
2. ✅ Test concurrent login invalidation
3. ✅ Verify device tracking
4. ✅ Confirm one active session per license
5. → Deploy to staging environment
6. → Run full integration tests
7. → Get stakeholder approval
8. → Deploy to production
