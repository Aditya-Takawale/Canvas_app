# PowerShell script to permanently fix Prisma permissions on Windows
Write-Host "Permanent Prisma Fix for Windows" -ForegroundColor Cyan

# Function to kill Node processes
function Kill-NodeProcesses {
    Write-Host "Killing Node.js processes..." -ForegroundColor Yellow
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name "nodemon" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "Node processes terminated" -ForegroundColor Green
}

# Function to clear Prisma cache
function Clear-PrismaCache {
    $prismaPath = Join-Path $PSScriptRoot "..\node_modules\.prisma"
    if (Test-Path $prismaPath) {
        Write-Host "Removing Prisma cache..." -ForegroundColor Yellow
        Remove-Item -Path $prismaPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Prisma cache cleared" -ForegroundColor Green
    }
}

# Function to generate Prisma client with retries
function Generate-PrismaClient {
    param([int]$MaxRetries = 3)
    
    for ($i = 1; $i -le $MaxRetries; $i++) {
        Write-Host "Attempt $i/$MaxRetries - Generating Prisma client..." -ForegroundColor Yellow
        
        # Kill processes and clear cache before each attempt
        Kill-NodeProcesses
        Clear-PrismaCache
        
        try {
            Set-Location (Join-Path $PSScriptRoot "..")
            npx prisma generate 2>&1 | Write-Host
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Prisma client generated successfully!" -ForegroundColor Green
                return $true
            }
        }
        catch {
            Write-Host "Attempt $i failed: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        if ($i -lt $MaxRetries) {
            Write-Host "Waiting before retry..." -ForegroundColor Yellow
            Start-Sleep -Seconds 3
        }
    }
    
    Write-Host "All attempts failed!" -ForegroundColor Red
    return $false
}

# Main execution
try {
    if (Generate-PrismaClient) {
        Write-Host "Prisma setup completed successfully!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "Prisma setup failed after all retries" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "Script error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}