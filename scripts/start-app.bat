@echo off
echo 🎨 Starting Canvas App...
echo ==================================================

REM Change to the app directory
cd /d "%~dp0"

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "start-app.ps1"

pause