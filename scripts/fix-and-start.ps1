# Canvas App - Fix Prisma and Start
Write-Host "🔧 Fixing Prisma DLL permissions..." -ForegroundColor Yellow

# Navigate to backend
Set-Location "$PSScriptRoot\backend"

# Run Prisma fix
powershell -ExecutionPolicy Bypass -File scripts/fix-prisma-clean.ps1

# Build TypeScript
Write-Host "🔨 Building TypeScript..." -ForegroundColor Yellow
npx tsc

# Start the app
Write-Host "🚀 Starting Canvas App..." -ForegroundColor Green
Set-Location "$PSScriptRoot"
.\run-app.ps1