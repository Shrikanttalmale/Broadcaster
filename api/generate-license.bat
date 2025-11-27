@echo off
REM Broadcaster License Generator - Windows Batch Wrapper
REM This script makes it easy to run the license generator on Windows

if "%1"=="" (
    echo.
    echo Broadcaster License Generator
    echo.
    echo Usage: generate-license.bat [options]
    echo.
    echo Options:
    echo   --type ^<type^>         License type: master, distributor, user (default: user^)
    echo   --count ^<number^>      Number of licenses (default: 1^)
    echo   --validity ^<days^>     Validity in days (default: 365^)
    echo   --customer ^<name^>     Customer name (optional^)
    echo   --format ^<format^>     Output format: table, json, csv (default: table^)
    echo   --save                Save to database
    echo   --help                Show this help message
    echo.
    echo Examples:
    echo   generate-license.bat
    echo   generate-license.bat --type user --count 50 --customer "ABC Corp" --format csv --save
    echo.
    exit /b 0
)

call npx ts-node src/cli/license-generator.ts %*
exit /b 0
