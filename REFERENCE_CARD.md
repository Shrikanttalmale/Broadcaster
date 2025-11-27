# One Active Session Testing - Reference Card

## 🔐 Login Credentials
```
Email:    admin@broadcaster.local
Password: password
```

## 🚀 Start Server
```powershell
cd c:\broadcaster\api
npm run dev
```
✓ Wait for: `Server running on port 3001`

---

## ⚡ Quick Test (Copy All & Run)

```powershell
# SETUP
$email = "admin@broadcaster.local"
$password = "password"
$baseUrl = "http://localhost:3001/api/v1"

# TEST 1: LOGIN DEVICE 1
$body = @{email=$email;password=$password} | ConvertTo-Json
$r1 = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $body
$token1 = ($r1.Content | ConvertFrom-Json).data.accessToken
Write-Host "✓ Device 1 login: $($token1.Substring(0,20))..." -ForegroundColor Green

# TEST 2: CHECK SESSIONS DEVICE 1 (Should be 1)
$s1 = Invoke-WebRequest -Uri "$baseUrl/auth/sessions" -Method GET -Headers @{"Authorization"="Bearer $token1"} | Select-Object -ExpandProperty Content | ConvertFrom-Json
Write-Host "✓ Device 1 sessions: $($s1.data.activeSessions.Count)" -ForegroundColor Green

# TEST 3: LOGIN DEVICE 2 (Same credentials)
$r2 = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $body
$token2 = ($r2.Content | ConvertFrom-Json).data.accessToken
Write-Host "✓ Device 2 login: $($token2.Substring(0,20))..." -ForegroundColor Green

# TEST 4: TRY DEVICE 1 TOKEN (Should return 401)
try {
    Invoke-WebRequest -Uri "$baseUrl/auth/me" -Method GET -Headers @{"Authorization"="Bearer $token1"} -ErrorAction Stop
    Write-Host "✗ Device 1 token still works (UNEXPECTED)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✓ Device 1 token invalid (401) - KICKED OFF" -ForegroundColor Green
    }
}

# TEST 5: TRY DEVICE 2 TOKEN (Should work)
$r3 = Invoke-WebRequest -Uri "$baseUrl/auth/me" -Method GET -Headers @{"Authorization"="Bearer $token2"}
if ($r3.StatusCode -eq 200) {
    Write-Host "✓ Device 2 token valid (200)" -ForegroundColor Green
}

# TEST 6: CHECK SESSIONS DEVICE 2 (Should be 1)
$s2 = Invoke-WebRequest -Uri "$baseUrl/auth/sessions" -Method GET -Headers @{"Authorization"="Bearer $token2"} | Select-Object -ExpandProperty Content | ConvertFrom-Json
Write-Host "✓ Device 2 sessions: $($s2.data.activeSessions.Count)" -ForegroundColor Green

if ($s2.data.activeSessions.Count -eq 1) {
    Write-Host "`n✓✓✓ SUCCESS - ONE ACTIVE SESSION WORKING! ✓✓✓" -ForegroundColor Green
}
```

---

## 📋 API Endpoints

| Endpoint | Method | Purpose | Header |
|----------|--------|---------|--------|
| `/auth/login` | POST | Login | Content-Type: application/json |
| `/auth/logout` | POST | Logout | Authorization: Bearer {token} |
| `/auth/me` | GET | Get user info | Authorization: Bearer {token} |
| `/auth/sessions` | GET | View active sessions | Authorization: Bearer {token} |
| `/auth/sessions/{id}/logout` | POST | Logout device | Authorization: Bearer {token} |

---

## 🎯 Expected Results

| Test | Expect | Status |
|------|--------|--------|
| Login | Returns accessToken | 200 OK ✓ |
| Sessions Device 1 | 1 active session | Count=1 ✓ |
| Second Login | Returns new token | Different token ✓ |
| First Token | 401 Unauthorized | Kicked off ✓ |
| Second Token | 200 OK with user | Valid ✓ |
| Sessions Device 2 | 1 active session | Count=1 ✓ |

**All pass = Feature working!**

---

## 📚 Documentation

| File | Content |
|------|---------|
| `QUICK_START_TESTING.md` | Step-by-step guide |
| `TESTING_COMMANDS.md` | Copy-paste commands |
| `ONE_ACTIVE_SESSION_IMPLEMENTATION.md` | How it works |
| `SHARING_PROTECTION_ANALYSIS.md` | Before/after comparison |

---

## 🔧 Troubleshooting

**Server won't start?**
```powershell
cd c:\broadcaster\api
rm -Force -Recurse dist
npm run build
npm run dev
```

**Port 3001 in use?**
```powershell
Get-Process | Where-Object {$_.Path -match "node"} | Stop-Process -Force
```

**Database error?**
```powershell
rm broadcaster.db
npm run dev
```

---

## ✅ Success Checklist

- [ ] Server running on port 3001
- [ ] Device 1 login successful (token1)
- [ ] Device 1 shows 1 active session
- [ ] Device 2 login successful (token2)
- [ ] Device 1 token returns 401 ← **CRITICAL**
- [ ] Device 2 token returns 200
- [ ] Device 2 shows 1 active session

**All checked? Feature is working!** ✓✓✓

---

## 🎓 What's Being Tested

When Device 2 logs in with same credentials:
1. System finds Device 1's active session
2. Marks it as inactive (isActive = 0)
3. Creates new session for Device 2
4. Device 1's token now returns 401
5. Device 2's token works normally
6. Only 1 session active at a time

**Result:** Account sharing prevented! ✓
