@echo off
setlocal
title Company Task Management System

:: Switch to the folder containing this batch script
cd /d "%~dp0"

echo =================================================================
echo   Apex Global Solutions - Company Task ^& Date Management System
echo =================================================================
echo.

:: 1. Verify Node.js is installed
where node >nul 2>&1
if errorlevel 1 goto :node_missing

:: 2. Clean up any previous stale processes on ports 5000 and 5173
echo [INFO] Preparing network ports (5000 and 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

:: 3. Check root dependencies
if not exist "node_modules\" (
    echo [INFO] Installing root dependencies...
    call npm install
)

:: 4. Check backend dependencies
if not exist "backend\node_modules\" (
    echo [INFO] Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

:: 5. Check frontend dependencies
if not exist "frontend\node_modules\" (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo.
echo [INFO] Starting Backend Server (Port 5000) and Frontend (Port 5173)...
echo [INFO] The system will automatically open your browser once servers are ready!
echo.
echo -----------------------------------------------------------------
echo   Web App:       http://localhost:5173
echo   Backend API:   http://localhost:5000/api
echo   Health Check:  http://localhost:5000/api/health
echo -----------------------------------------------------------------
echo   IMPORTANT: KEEP THIS WINDOW OPEN while using the application!
echo   To STOP servers: Press Ctrl+C in this window, OR double-click stop.bat
echo =================================================================
echo.

:: Launch intelligent browser opener in background (waits for servers to be live)
start "" /b node scripts\open-browser.js

:: Start the application
call npm run dev
goto :end

:node_missing
echo.
echo [ERROR] Node.js was not found in your system PATH!
echo Please install Node.js from https://nodejs.org/ and try again.
echo.
pause
exit /b 1

:end
pause
