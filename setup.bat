@echo off
title Ravi Kanta Estimate System - Setup Wizard
cd /d "%~dp0"

echo ========================================================
echo   RAVI KANTA DOORS - SYSTEM SETUP & RECOVERY WIZARD
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
echo Opening Setup Wizard in your default browser...
echo.
echo URL: http://127.0.0.1:8088/setup.php
echo Press Ctrl+C in this window to stop the server anytime.
echo ========================================================
echo.

:: Wait 1 second in background for PHP server to initialize, then launch setup.php in browser
start "" cmd /c "timeout /t 1 /nobreak >nul && start http://127.0.0.1:8088/setup.php"

:: Run PHP built-in web server
php -S 127.0.0.1:8088
pause
