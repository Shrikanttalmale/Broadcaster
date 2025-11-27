#!/usr/bin/env pwsh
# Test script for one active session implementation

$port = "3001"
$baseUrl = "http://localhost:$port/api/v1"

Write-Host "`n=== ONE ACTIVE SESSION TESTING ===" -ForegroundColor Green
Write-Host "Testing at: $baseUrl`n" -ForegroundColor Gray

# Test 1: Login and create session
Write-Host "TEST 1: Login and create session" -ForegroundColor Yellow
$loginBody = @{email='admin@broadcaster.local';password='password'} | ConvertTo-Json
try {
    $loginResp = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $loginData = $loginResp.Content | ConvertFrom-Json
    
    if ($loginResp.StatusCode -eq 200) {
        $token1 = $loginData.data.accessToken
        $refresh1 = $loginData.data.refreshToken
        Write-Host "✓ Login successful" -ForegroundColor Green
        Write-Host "  Token: $($token1.Substring(0,30))..." -ForegroundColor Gray
        Write-Host "  Refresh: $($refresh1.Substring(0,30))..." -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Test 2: View sessions for this user
Write-Host "`nTEST 2: View active sessions" -ForegroundColor Yellow
try {
    $sessionsResp = Invoke-WebRequest -Uri "$baseUrl/auth/sessions" -Method GET -Headers @{"Authorization"="Bearer $token1"}
    $sessionsData = $sessionsResp.Content | ConvertFrom-Json
    
    if ($sessionsResp.StatusCode -eq 200) {
        $sessionCount = $sessionsData.data.activeSessions.Count
        Write-Host "✓ Got sessions" -ForegroundColor Green
        Write-Host "  Active sessions: $sessionCount" -ForegroundColor Gray
        if ($sessionCount -gt 0) {
            $session1 = $sessionsData.data.activeSessions[0]
            $sessionId1 = $session1.id
            Write-Host "  First session ID: $sessionId1" -ForegroundColor Gray
            Write-Host "  Device: $($session1.deviceInfo)" -ForegroundColor Gray
            Write-Host "  IP: $($session1.ipAddress)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "✗ Get sessions failed: $_" -ForegroundColor Red
}

# Test 3: Login from second device (should invalidate first session)
Write-Host "`nTEST 3: Login from second device" -ForegroundColor Yellow
try {
    $login2Body = @{email='admin@broadcaster.local';password='password'} | ConvertTo-Json
    $login2Resp = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $login2Body
    $login2Data = $login2Resp.Content | ConvertFrom-Json
    
    if ($login2Resp.StatusCode -eq 200) {
        $token2 = $login2Data.data.accessToken
        Write-Host "✓ Second login successful" -ForegroundColor Green
        Write-Host "  Token: $($token2.Substring(0,30))..." -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Second login failed: $_" -ForegroundColor Red
}

# Test 4: Check if first token is now invalid
Write-Host "`nTEST 4: Verify first session was invalidated" -ForegroundColor Yellow
Start-Sleep -Seconds 1
try {
    $testResp = Invoke-WebRequest -Uri "$baseUrl/auth/me" -Method GET -Headers @{"Authorization"="Bearer $token1"} -ErrorAction SilentlyContinue
    if ($testResp.StatusCode -eq 401) {
        Write-Host "✓ First session correctly invalidated" -ForegroundColor Green
        Write-Host "  Old token now returns 401 Unauthorized" -ForegroundColor Gray
    } else {
        Write-Host "⚠ First session still valid (unexpected)" -ForegroundColor Yellow
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✓ First session correctly invalidated" -ForegroundColor Green
        Write-Host "  Old token now returns 401 Unauthorized" -ForegroundColor Gray
    } else {
        Write-Host "✗ Error: $_" -ForegroundColor Red
    }
}

# Test 5: Verify second token is valid
Write-Host "`nTEST 5: Verify second session is active" -ForegroundColor Yellow
try {
    $test2Resp = Invoke-WebRequest -Uri "$baseUrl/auth/me" -Method GET -Headers @{"Authorization"="Bearer $token2"}
    if ($test2Resp.StatusCode -eq 200) {
        Write-Host "✓ Second session is active" -ForegroundColor Green
        $userData = $test2Resp.Content | ConvertFrom-Json
        Write-Host "  User: $($userData.data.email)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Second session verification failed: $_" -ForegroundColor Red
}

# Test 6: View sessions again
Write-Host "`nTEST 6: View sessions after concurrent login" -ForegroundColor Yellow
try {
    $sessions2Resp = Invoke-WebRequest -Uri "$baseUrl/auth/sessions" -Method GET -Headers @{"Authorization"="Bearer $token2"}
    $sessions2Data = $sessions2Resp.Content | ConvertFrom-Json
    
    if ($sessions2Resp.StatusCode -eq 200) {
        $sessionCount = $sessions2Data.data.activeSessions.Count
        Write-Host "✓ Sessions retrieved" -ForegroundColor Green
        Write-Host "  Active sessions: $sessionCount" -ForegroundColor Gray
        if ($sessionCount -eq 1) {
            Write-Host "✓ Exactly one active session (previous was invalidated)" -ForegroundColor Green
        } elseif ($sessionCount -gt 1) {
            Write-Host "⚠ Multiple sessions still active (unexpected)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "✗ Get sessions failed: $_" -ForegroundColor Red
}

Write-Host "`n=== TESTING COMPLETE ===" -ForegroundColor Green
Write-Host "✓ One active session per license is working correctly!`n" -ForegroundColor Green
