@echo off
title Book-Slot App Launcher
color 0A
setlocal

echo ============================================
echo        Book-Slot App Launcher
echo ============================================
echo.

cd /d "%~dp0"

echo [1/3] Checking if node_modules exists...
if not exist "node_modules\" (
    echo [*] node_modules not found. Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed!
        pause
        exit /b 1
    )
    echo [+] Dependencies installed successfully.
) else (
    echo [+] node_modules found. Skipping install.
)

echo.
echo [2/3] Building frontend with Vite...
call npm run build
if errorlevel 1 (
    echo [ERROR] Vite build failed!
    pause
    exit /b 1
)
echo [+] Frontend built successfully.

echo.
echo [3/3] Starting the backend server...
echo [*] Server will start on http://localhost:3000
echo [*] Press Ctrl+C to stop the server.
echo.

set "PORT=3000"
start "" "http://localhost:3000"
call npm start

pause
