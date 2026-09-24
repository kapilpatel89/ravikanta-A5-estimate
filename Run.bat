@echo off
title Ravi Kanta Estimate System - A5 Print
cd /d "%~dp0"

echo ========================================================
echo   RAVI KANTA DOORS - ESTIMATE & A5 PRINT SYSTEM
echo ========================================================
echo.

where php >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] PHP is not found in your system PATH!
    echo Please install PHP or add it to your environment variables.
    echo.
    pause
    exit /b 1
)

echo Starting PHP local server on http://127.0.0.1:8088 ...
echo Opening application in your default browser...
echo.
echo Press Ctrl+C in this window to stop the server.
echo ========================================================
echo.

:: Wait 1 second in background for PHP server to initialize, then launch browser
start "" cmd /c "timeout /t 1 /nobreak >nul && start http://127.0.0.1:8088/"

:: Run PHP built-in web server
php -S 127.0.0.1:8088
pause
