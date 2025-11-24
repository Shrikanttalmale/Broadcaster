@echo off
REM Broadcaster Development Server Startup Script

echo.
echo ========================================
echo  Broadcaster Development Server
echo ========================================
echo.

REM Check Node.js
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed. Please install Node.js 18+
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node version: %NODE_VERSION%

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo npm version: %NPM_VERSION%

REM Install dependencies if needed
if not exist "node_modules" (
    echo.
    echo Installing root dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Install workspace dependencies
for %%W in (main api ui) do (
    if not exist "%%W\node_modules" (
        echo Installing %%W dependencies...
        call npm install -w %%W
    )
)

REM Build TypeScript
echo.
echo Building TypeScript...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

REM Start development
echo.
echo ✅ All systems ready!
echo.
echo Starting services...
echo   • API Server:  http://localhost:3001
echo   • React UI:    http://localhost:3000
echo   • Electron:    Starting...
echo.
echo Press Ctrl+C to stop all services
echo.

call npm run dev
