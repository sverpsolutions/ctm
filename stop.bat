@echo off
setlocal enabledelayedexpansion
title Stop Company Task Management System

:: Switch to the folder containing this batch script
cd /d "%~dp0"

echo =================================================================
echo   Apex Global Solutions - Company Task ^& Date Management System
echo   Stopping All Running Services
echo =================================================================
echo.

set STOPPED_ANY=0

:: 1. Check and stop Backend Server on Port 5000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    echo [INFO] Terminating Backend Server PID %%a on Port 5000...
    taskkill /f /t /pid %%a >nul 2>&1
    set STOPPED_ANY=1
)

:: 2. Check and stop Frontend Dev Server on Port 5173
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo [INFO] Terminating Frontend Server PID %%a on Port 5173...
    taskkill /f /t /pid %%a >nul 2>&1
    set STOPPED_ANY=1
)

:: 3. Check and stop Alternate Frontend Port 5174 if active
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5174" ^| findstr "LISTENING"') do (
    echo [INFO] Terminating Alternate Frontend Server PID %%a on Port 5174...
    taskkill /f /t /pid %%a >nul 2>&1
    set STOPPED_ANY=1
)

echo.
if "!STOPPED_ANY!"=="1" (
    echo =================================================================
    echo   [SUCCESS] All application services have been stopped cleanly!
    echo   Ports 5000 and 5173 are now released and available.
    echo =================================================================
) else (
    echo =================================================================
    echo   [INFO] No active services found on ports 5000 or 5173.
    echo   The application is already stopped.
    echo =================================================================
)

echo.
pause
