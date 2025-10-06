#!/usr/bin/env pwsh
# Quick deployment preparation script for Windows

Write-Host "🚀 Canvas App Deployment Preparation" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the Canvas_app root directory" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Pre-deployment checklist:" -ForegroundColor Yellow

# 1. Check Git status
Write-Host "📁 Checking Git status..." -ForegroundColor Cyan
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "⚠️  You have uncommitted changes. Please commit them before deployment." -ForegroundColor Yellow
    git status --short
} else {
    Write-Host "✅ Git working directory is clean" -ForegroundColor Green
}

# 2. Check if environment files exist
Write-Host "🔧 Checking environment configurations..." -ForegroundColor Cyan

$envFiles = @(
    "frontend\.env.production.example",
    "backend\.env.production.example",
    "vercel.json",
    "railway.json"
)

foreach ($file in $envFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $file missing" -ForegroundColor Red
    }
}

# 3. Check package.json scripts
Write-Host "📦 Checking backend package.json scripts..." -ForegroundColor Cyan
$backendPackage = Get-Content "backend\package.json" | ConvertFrom-Json
$requiredScripts = @("start", "build", "postinstall", "db:deploy")

foreach ($script in $requiredScripts) {
    if ($backendPackage.scripts.$script) {
        Write-Host "✅ Script '$script' exists" -ForegroundColor Green
    } else {
        Write-Host "❌ Script '$script' missing" -ForegroundColor Red
    }
}

# 4. Check database schema
Write-Host "🗄️  Checking database configuration..." -ForegroundColor Cyan
if (Test-Path "backend\prisma\schema.prisma") {
    $schema = Get-Content "backend\prisma\schema.prisma" -Raw
    if ($schema -match 'provider = "postgresql"') {
        Write-Host "✅ Database configured for PostgreSQL" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Database still configured for SQLite. Update for production." -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Prisma schema not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Commit all changes: git add . && git commit -m 'Prepare for deployment'" -ForegroundColor White
Write-Host "2. Push to GitHub: git push origin main" -ForegroundColor White
Write-Host "3. Set up Railway PostgreSQL database" -ForegroundColor White
Write-Host "4. Deploy backend to Railway" -ForegroundColor White
Write-Host "5. Deploy frontend to Vercel" -ForegroundColor White
Write-Host "6. Configure environment variables" -ForegroundColor White
Write-Host ""
Write-Host "📖 See DEPLOYMENT-GUIDE.md for detailed instructions" -ForegroundColor Cyan