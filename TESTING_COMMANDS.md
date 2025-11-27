# Copy-Paste Testing Commands

## Terminal 1: Start Server

```powershell
cd c:\broadcaster\api
npm run dev
```

Wait for message: `Server running on port 3001`

---

## Terminal 2: Run Tests (Copy and paste one at a time)

### TEST 1: First Login (Device 1)

```powershell
$body = @{email='admin@broadcaster.local';password='password'} | ConvertTo-Json
$resp = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $body
$token1 = ($resp.Content | ConvertFrom-Json).data.accessToken
Write-Host "✓ LOGIN 1 SUCCESS" -ForegroundColor Green
Write-Host "Token 1: $($token1.Substring(0,30))..." -ForegroundColor Gray
```

**Expected:** Shows token1 (keep this for later comparison)

---

### TEST 2: View Active Sessions (Device 1)

```powershell
$sessions = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/auth/sessions" -Method GET -Headers @{"Authorization"="Bearer $token1"}
$sessData = $sessions.Content | ConvertFrom-Json
Write-Host "✓ SESSIONS COUNT: $($sessData.data.activeSessions.Count)" -ForegroundColor Green
Write-Host "Device Info: $($sessData.data.activeSessions[0].deviceInfo)" -ForegroundColor Gray
Write-Host "IP: $($sessData.data.activeSessions[0].ipAddress)" -ForegroundColor Gray
```

**Expected:** 
- Session count: 1
- Device info: Browser/OS string visible
- IP: 127.0.0.1

---

### TEST 3: Second Login (Device 2 - Same Credentials)

```powershell
$body = @{email='admin@broadcaster.local';password='password'} | ConvertTo-Json
$resp2 = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $body
$token2 = ($resp2.Content | ConvertFrom-Json).data.accessToken
Write-Host "✓ LOGIN 2 SUCCESS" -ForegroundColor Green
Write-Host "Token 2: $($token2.Substring(0,30))..." -ForegroundColor Gray
Write-Host "`nCompare:" -ForegroundColor Yellow
Write-Host "Token 1: $($token1.Substring(0,30))..." -ForegroundColor Gray
Write-Host "Token 2: $($token2.Substring(0,30))..." -ForegroundColor Gray
if ($token1 -ne $token2) {
    Write-Host "✓ Tokens are DIFFERENT (as expected)" -ForegroundColor Green
} else {
    Write-Host "✗ Tokens are SAME (unexpected!)" -ForegroundColor Red
}
```

**Expected:** 
- token2 is different from token1
- Both are valid JWT tokens

---

### TEST 4: Test First Token (Should be Invalid Now)

```powershell
Write-Host "Testing if first token still works..." -ForegroundColor Yellow
try {
    $testResp = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/auth/me" -Method GET -Headers @{"Authorization"="Bearer $token1"} -ErrorAction Stop
    Write-Host "✗ UNEXPECTED: First token still works!" -ForegroundColor Red
    $testResp.Content | ConvertFrom-Json | ConvertTo-Json
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✓ FIRST TOKEN INVALIDATED (401 Unauthorized)" -ForegroundColor Green
        Write-Host "✓ Device 1 kicked off successfully!" -ForegroundColor Green
    } else {
        Write-Host "✗ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
```

**Expected:** 
- HTTP 401 Unauthorized
- Message: "Session expired or invalidated"
- **This proves Device 1 is kicked off!**

---

### TEST 5: Test Second Token (Should Work)

```powershell
Write-Host "`nTesting if second token works..." -ForegroundColor Yellow
$meResp = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/auth/me" -Method GET -Headers @{"Authorization"="Bearer $token2"}
$meData = $meResp.Content | ConvertFrom-Json
Write-Host "✓ SECOND TOKEN WORKS (200 OK)" -ForegroundColor Green
Write-Host "User: $($meData.data.email)" -ForegroundColor Gray
Write-Host "Role: $($meData.data.role)" -ForegroundColor Gray
Write-Host "✓ Device 2 still has access!" -ForegroundColor Green
```

**Expected:** 
- HTTP 200 OK
- User email: admin@broadcaster.local
- Role: master_admin

---

### TEST 6: View Sessions Again (Device 2)

```powershell
Write-Host "`nFinal verification - check session count..." -ForegroundColor Yellow
$sessions2 = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/auth/sessions" -Method GET -Headers @{"Authorization"="Bearer $token2"}
$sess2Data = $sessions2.Content | ConvertFrom-Json
Write-Host "✓ SESSIONS COUNT: $($sess2Data.data.activeSessions.Count)" -ForegroundColor Green

if ($sess2Data.data.activeSessions.Count -eq 1) {
    Write-Host "✓ PERFECT: Exactly 1 session (previous one invalidated)" -ForegroundColor Green
    Write-Host "✓✓✓ ONE ACTIVE SESSION PER LICENSE IS WORKING! ✓✓✓" -ForegroundColor Green
} else {
    Write-Host "✗ Multiple sessions active (unexpected)" -ForegroundColor Red
}
```

**Expected:** 
- Session count: 1
- Success message shown

---

## COMPLETE TEST SCRIPT (Run All at Once)

Copy and paste this entire script to run all tests automatically:

```powershell
Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║        ONE ACTIVE SESSION PER LICENSE - AUTOMATED TEST         ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

# Credentials
$email = "admin@broadcaster.local"
$password = "password"
$baseUrl = "http://localhost:3001/api/v1"

# TEST 1: First Login
Write-Host "TEST 1: First Login (Device 1)" -ForegroundColor Yellow
$body1 = @{email=$email;password=$password} | ConvertTo-Json
$resp1 = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $body1
$login1Data = $resp1.Content | ConvertFrom-Json
$token1 = $login1Data.data.accessToken
$session1Id = $login1Data.data.sessionId
Write-Host "✓ Login successful" -ForegroundColor Green
Write-Host "  Token: $($token1.Substring(0,20))..." -ForegroundColor Gray
Write-Host "  Session: $session1Id`n" -ForegroundColor Gray

# TEST 2: View Sessions Device 1
Write-Host "TEST 2: View Active Sessions (Device 1)" -ForegroundColor Yellow
$sess1 = Invoke-WebRequest -Uri "$baseUrl/auth/sessions" -Method GET -Headers @{"Authorization"="Bearer $token1"}
$sess1Data = $sess1.Content | ConvertFrom-Json
Write-Host "✓ Active sessions: $($sess1Data.data.activeSessions.Count)" -ForegroundColor Green
Write-Host "  Device: $($sess1Data.data.activeSessions[0].deviceInfo.Substring(0,30))..." -ForegroundColor Gray
Write-Host "  IP: $($sess1Data.data.activeSessions[0].ipAddress)`n" -ForegroundColor Gray

# TEST 3: Second Login
Write-Host "TEST 3: Second Login (Device 2 - Same Credentials)" -ForegroundColor Yellow
$body2 = @{email=$email;password=$password} | ConvertTo-Json
$resp2 = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $body2
$login2Data = $resp2.Content | ConvertFrom-Json
$token2 = $login2Data.data.accessToken
$session2Id = $login2Data.data.sessionId
Write-Host "✓ Login successful" -ForegroundColor Green
Write-Host "  Token: $($token2.Substring(0,20))..." -ForegroundColor Gray
Write-Host "  Session: $session2Id`n" -ForegroundColor Gray

# TEST 4: Check if tokens are different
Write-Host "TEST 4: Verify Tokens are Different" -ForegroundColor Yellow
if ($token1 -ne $token2) {
    Write-Host "✓ Tokens are different" -ForegroundColor Green
} else {
    Write-Host "✗ ERROR: Tokens are the same!" -ForegroundColor Red
}
Write-Host ""

# TEST 5: Try first token (should fail)
Write-Host "TEST 5: Try First Token (Should be Invalid)" -ForegroundColor Yellow
try {
    $test1 = Invoke-WebRequest -Uri "$baseUrl/auth/me" -Method GET -Headers @{"Authorization"="Bearer $token1"} -ErrorAction Stop
    Write-Host "✗ ERROR: First token still works!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✓ First token returns 401 Unauthorized (kicked off)" -ForegroundColor Green
    } else {
        Write-Host "✗ ERROR: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}
Write-Host ""

# TEST 6: Try second token (should work)
Write-Host "TEST 6: Try Second Token (Should be Valid)" -ForegroundColor Yellow
$test2 = Invoke-WebRequest -Uri "$baseUrl/auth/me" -Method GET -Headers @{"Authorization"="Bearer $token2"}
$userData = $test2.Content | ConvertFrom-Json
Write-Host "✓ Second token returns 200 OK" -ForegroundColor Green
Write-Host "  User: $($userData.data.email)" -ForegroundColor Gray
Write-Host "  Role: $($userData.data.role)`n" -ForegroundColor Gray

# TEST 7: Final session count
Write-Host "TEST 7: Final Session Count (Device 2)" -ForegroundColor Yellow
$sess2 = Invoke-WebRequest -Uri "$baseUrl/auth/sessions" -Method GET -Headers @{"Authorization"="Bearer $token2"}
$sess2Data = $sess2.Content | ConvertFrom-Json
$finalCount = $sess2Data.data.activeSessions.Count
Write-Host "✓ Active sessions: $finalCount" -ForegroundColor Green

if ($finalCount -eq 1) {
    Write-Host "`n✓✓✓ SUCCESS ✓✓✓" -ForegroundColor Green
    Write-Host "ONE ACTIVE SESSION PER LICENSE IS WORKING!" -ForegroundColor Green
    Write-Host "`nSummary:" -ForegroundColor Green
    Write-Host "  • Device 1 login created session A" -ForegroundColor Green
    Write-Host "  • Device 2 login created session B and invalidated session A" -ForegroundColor Green
    Write-Host "  • Device 1 token now returns 401 (kicked off)" -ForegroundColor Green
    Write-Host "  • Device 2 token works normally" -ForegroundColor Green
    Write-Host "  • Only 1 active session per license ✓" -ForegroundColor Green
} else {
    Write-Host "`n✗ ERROR: Expected 1 session, got $finalCount" -ForegroundColor Red
}

Write-Host ""
```

---

## Simple One-Liner Tests

**Login:**
```powershell
$body = @{email='admin@broadcaster.local';password='password'} | ConvertTo-Json; Invoke-WebRequest -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $body | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
```

**View Sessions:**
```powershell
$token = "PASTE_YOUR_TOKEN_HERE"; Invoke-WebRequest -Uri "http://localhost:3001/api/v1/auth/sessions" -Method GET -Headers @{"Authorization"="Bearer $token"} | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
```

**Check if Token Valid:**
```powershell
$token = "PASTE_YOUR_TOKEN_HERE"; Invoke-WebRequest -Uri "http://localhost:3001/api/v1/auth/me" -Method GET -Headers @{"Authorization"="Bearer $token"} | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json
```

---

## Verification Results

| Test | Expected | Result |
|---|---|---|
| TEST 1: First Login | Returns token1 | ✓ |
| TEST 2: View Sessions | 1 session | ✓ |
| TEST 3: Second Login | Returns token2 ≠ token1 | ✓ |
| TEST 4: Different Tokens | token1 ≠ token2 | ✓ |
| TEST 5: First Token | 401 Unauthorized | ✓ |
| TEST 6: Second Token | 200 OK | ✓ |
| TEST 7: Session Count | 1 session | ✓ |

**All tests pass = Feature working correctly!**
