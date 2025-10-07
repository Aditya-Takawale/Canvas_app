@echo off
echo 🔧 Fixing Prisma permissions on Windows...

:: Kill any existing Node processes
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im nodemon.exe >nul 2>&1
echo ✅ Killed existing Node processes

:: Wait for processes to fully terminate
timeout /t 2 >nul 2>&1

:: Remove Prisma cache
if exist "node_modules\.prisma" (
    rmdir /s /q "node_modules\.prisma" >nul 2>&1
    echo ✅ Removed Prisma cache
)

:: Generate Prisma client
echo 🔄 Generating Prisma client...
npx prisma generate
if %ERRORLEVEL% EQU 0 (
    echo ✅ Prisma client generated successfully!
) else (
    echo ❌ Prisma generation failed, trying force reset...
    npx prisma generate --force-reset
)

echo 🎉 Prisma fix completed!