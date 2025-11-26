@echo off
REM Broadcaster Application Startup Script
REM This starts: API, UI Dev Server, and Electron

echo ========================================
echo Starting Broadcaster Application...
echo ========================================

REM Navigate to root directory
cd /d %~dp0

REM Build main and api
echo.
echo Building main process and API...
call npm run build -w main
call npm run build -w api

REM Start services in parallel
echo.
echo Starting services...
echo - API Server on port 3001
echo - UI Dev Server on port 5173+
echo - Electron window

REM Use concurrently with proper configuration
call npm run dev -w api & call npm run dev -w ui & timeout /t 8 /nobreak & call npm start

pause
