# Canvas App Master Control Script
param([switch]$NoWait)

Write-Host ""
Write-Host "  ____                              _                " -ForegroundColor Cyan
Write-Host " / ___|__ _ _ ____   ____ _ ___     / \   _ __  _ __  " -ForegroundColor Cyan  
Write-Host "| |   / _` | '_ \ \ / / _` / __|   / _ \ | '_ \| '_ \ " -ForegroundColor Cyan
Write-Host "| |__| (_| | | | \ V / (_| \__ \  / ___ \| |_) | |_) |" -ForegroundColor Cyan
Write-Host " \____\__,_|_| |_|\_/ \__,_|___/ /_/   \_\ .__/| .__/ " -ForegroundColor Cyan
Write-Host "                                         |_|   |_|   " -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting Canvas App - One Command Setup" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Gray

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Function to kill processes on a specific port
function Stop-ProcessOnPort {
    param([int]$Port)
    $processes = netstat -ano 2>$null | findstr ":$Port" | ForEach-Object {
        $parts = $_ -split '\s+'
        if ($parts.Length -gt 4) { $parts[4] }
    } | Where-Object { $_ -ne "" -and $_ -ne "0" } | Sort-Object -Unique
    
    foreach ($processId in $processes) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Host "[CLEANUP] Stopped process on port $Port (PID: $processId)" -ForegroundColor Yellow
        }
        catch {
            # Ignore errors
        }
    }
}

# Cleanup existing processes
Write-Host "[CLEANUP] Checking for existing processes..." -ForegroundColor Yellow
Stop-ProcessOnPort 5000
Stop-ProcessOnPort 3000  
Stop-ProcessOnPort 3001
Stop-ProcessOnPort 5555
Stop-ProcessOnPort 8081
Start-Sleep -Seconds 2

# Build backend
Write-Host "[BUILD] Building backend..." -ForegroundColor Green
Set-Location "$PSScriptRoot\backend"
try {
    # First, run Prisma fix to ensure DLL permissions are correct
    Write-Host "[BUILD] Fixing Prisma permissions..." -ForegroundColor Yellow
    $prismaFix = powershell -ExecutionPolicy Bypass -File scripts/fix-prisma-clean.ps1 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARNING] Prisma fix returned non-zero code, trying manual fix..." -ForegroundColor Yellow
        # Manual Prisma generation as fallback
        npx prisma generate 2>&1 | Out-Null
    }
    
    # Now build TypeScript
    Write-Host "[BUILD] Compiling TypeScript..." -ForegroundColor Yellow
    $buildOutput = npx tsc 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[BUILD] Backend built successfully" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Backend build failed" -ForegroundColor Red
        Write-Host $buildOutput -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "[ERROR] Backend build failed: $_" -ForegroundColor Red
    exit 1
}

# Start backend server
Write-Host "[START] Starting backend server..." -ForegroundColor Green
$backendProcess = Start-Process powershell -ArgumentList "-Command", "Set-Location '$PSScriptRoot\backend'; node dist/server.js" -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 5

# Check backend status
$attempts = 0
$maxAttempts = 10
$backendReady = $false
while ($attempts -lt $maxAttempts -and -not $backendReady) {
    if (Test-Port 5000) {
        $backendReady = $true
        Write-Host "[SUCCESS] Backend server started on http://localhost:5000" -ForegroundColor Green
    } else {
        Start-Sleep -Seconds 1
        $attempts++
        Write-Host "[WAIT] Waiting for backend... ($attempts/$maxAttempts)" -ForegroundColor Yellow
    }
}

if (-not $backendReady) {
    Write-Host "[ERROR] Backend server failed to start after $maxAttempts attempts" -ForegroundColor Red
    exit 1
}

# Start collaboration WebSocket server (collab-server.js)
Write-Host "[START] Starting collaboration server (WebSocket)..." -ForegroundColor Green
Set-Location "$PSScriptRoot"

# Kill any existing process on port 8081 first
Stop-ProcessOnPort 8081
Start-Sleep -Seconds 1

# Start fresh collab server
$collabProcess = Start-Process powershell -ArgumentList "-Command", "Set-Location '$PSScriptRoot'; node collab-server.js" -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 2

# Verify it started
if (Test-Port 8081) {
    Write-Host "[SUCCESS] Collaboration server started on ws://localhost:8081" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Collaboration server did not start (port 8081 not listening)" -ForegroundColor Yellow
}

# Start frontend
Write-Host "[START] Starting frontend server..." -ForegroundColor Green
Set-Location "$PSScriptRoot\frontend"
$frontendProcess = Start-Process powershell -ArgumentList "-Command", "Set-Location '$PSScriptRoot\frontend'; `$env:BROWSER='none'; echo 'y' | npm start" -WindowStyle Hidden -PassThru

# Wait for frontend with progress
$attempts = 0
$maxAttempts = 30
$frontendReady = $false
$frontendPort = $null

while ($attempts -lt $maxAttempts -and -not $frontendReady) {
    if (Test-Port 3001) {
        $frontendReady = $true
        $frontendPort = 3001
    } elseif (Test-Port 3000) {
        $frontendReady = $true
        $frontendPort = 3000
    } else {
        Start-Sleep -Seconds 2
        $attempts++
        Write-Host "[WAIT] Waiting for frontend... ($($attempts*2)/$($maxAttempts*2)s)" -ForegroundColor Yellow
    }
}

# Display final status
Write-Host ""
Write-Host "=========================================" -ForegroundColor Gray
Write-Host "           CANVAS APP STATUS             " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Gray

if (Test-Port 5000) {
    Write-Host "[RUNNING] Backend:  http://localhost:5000" -ForegroundColor Green
} else {
    Write-Host "[FAILED]  Backend:  http://localhost:5000" -ForegroundColor Red
}

if ($frontendPort) {
    Write-Host "[RUNNING] Frontend: http://localhost:$frontendPort" -ForegroundColor Green
} else {
    Write-Host "[FAILED]  Frontend: Not started" -ForegroundColor Red
}
if (Test-Port 8081) { Write-Host "[RUNNING] Collab WS: ws://localhost:8081" -ForegroundColor Green } else { Write-Host "[FAILED]  Collab WS: ws://localhost:8081" -ForegroundColor Red }

Write-Host ""
Write-Host "LOGIN CREDENTIALS:" -ForegroundColor Cyan
Write-Host "  Admin User: admin@example.com / admin123" -ForegroundColor White
Write-Host "  Test User:  user@example.com / user123" -ForegroundColor White
Write-Host ""

if ($frontendPort) {
    Write-Host "READY TO USE!" -ForegroundColor Green
    Write-Host "Open http://localhost:$frontendPort in your browser" -ForegroundColor Yellow
} else {
    Write-Host "Frontend failed to start. Check the logs." -ForegroundColor Red
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Gray

# Start Prisma Studio
Write-Host "[START] Starting Prisma Studio..." -ForegroundColor Green
Set-Location "$PSScriptRoot\backend"
$studioProcess = Start-Process powershell -ArgumentList "-Command", "Set-Location '$PSScriptRoot\backend'; npx prisma studio --port 5555" -WindowStyle Hidden -PassThru

# Wait for Prisma Studio to be ready
$attempts = 0
$maxAttempts = 20
$studioReady = $false
while ($attempts -lt $maxAttempts -and -not $studioReady) {
    if (Test-Port 5555) {
        $studioReady = $true
        Write-Host "[SUCCESS] Prisma Studio started on http://localhost:5555" -ForegroundColor Green
    } else {
        Start-Sleep -Seconds 1
        $attempts++
        Write-Host "[WAIT] Waiting for Prisma Studio... ($attempts/$maxAttempts)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Gray
Write-Host "           SERVICES STATUS                   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Gray
if (Test-Port 5000) { Write-Host "[RUNNING] Backend:       http://localhost:5000" -ForegroundColor Green } else { Write-Host "[FAILED]  Backend:       http://localhost:5000" -ForegroundColor Red }
if ($frontendPort) { Write-Host "[RUNNING] Frontend:      http://localhost:$frontendPort" -ForegroundColor Green } else { Write-Host "[FAILED]  Frontend:      Not started" -ForegroundColor Red }
if (Test-Port 5555) { Write-Host "[RUNNING] Prisma Studio: http://localhost:5555" -ForegroundColor Green } else { Write-Host "[FAILED]  Prisma Studio: Not started" -ForegroundColor Red }
if (Test-Port 8081) { Write-Host "[RUNNING] Collab WS:     ws://localhost:8081" -ForegroundColor Green } else { Write-Host "[FAILED]  Collab WS:     ws://localhost:8081" -ForegroundColor Red }
Write-Host "=========================================" -ForegroundColor Gray

if (-not $NoWait) {
    Write-Host "Press Ctrl+C to stop both servers..." -ForegroundColor Yellow
    Write-Host ""
    
    # Monitor loop
    try {
        while ($true) {
            Start-Sleep -Seconds 10
            
            # Check backend
            if (-not (Test-Port 5000)) {
                Write-Host "[ERROR] Backend server stopped!" -ForegroundColor Red
                break
            }
            
            # Check frontend  
            if ($frontendPort -and -not (Test-Port $frontendPort)) {
                Write-Host "[ERROR] Frontend server stopped!" -ForegroundColor Red
                break
            }

            # Check Prisma Studio
            if (-not (Test-Port 5555)) {
                Write-Host "[ERROR] Prisma Studio stopped!" -ForegroundColor Red
                break
            }
            # Check Collaboration WS
            if (-not (Test-Port 8081)) {
                Write-Host "[ERROR] Collaboration server stopped!" -ForegroundColor Red
                break
            }
            
            # Status check every minute
            if ((Get-Date).Second -eq 0) {
                Write-Host "[STATUS] Servers are running..." -ForegroundColor Green
            }
        }
    }
    finally {
        Write-Host ""
        Write-Host "[CLEANUP] Stopping all servers..." -ForegroundColor Yellow
        
        # Stop processes
        if ($backendProcess -and -not $backendProcess.HasExited) {
            $backendProcess.Kill()
        }
        if ($frontendProcess -and -not $frontendProcess.HasExited) {
            $frontendProcess.Kill()
        }
        if ($studioProcess -and -not $studioProcess.HasExited) {
            $studioProcess.Kill()
        }
        if ($collabProcess -and -not $collabProcess.HasExited) {
            $collabProcess.Kill()
        }
        
        Stop-ProcessOnPort 5000
        Stop-ProcessOnPort 3000
        Stop-ProcessOnPort 3001
        Stop-ProcessOnPort 5555
        Stop-ProcessOnPort 8081
        
        Write-Host "[SUCCESS] All servers stopped" -ForegroundColor Green
    }
}