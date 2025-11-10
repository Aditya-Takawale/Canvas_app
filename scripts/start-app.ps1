# Canvas App Startup Script
# This script starts both backend and frontend servers and shows their status

Write-Host "Starting Canvas App..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Gray

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
    $processes = netstat -ano | findstr ":$Port" | ForEach-Object {
        $parts = $_ -split '\s+'
        $parts[4]
    } | Where-Object { $_ -ne "" -and $_ -ne "0" } | Sort-Object -Unique
    
    foreach ($pid in $processes) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "⚠️  Stopped existing process on port $Port (PID: $pid)" -ForegroundColor Yellow
        }
        catch {
            # Ignore errors - process might already be stopped
        }
    }
}

# Check and stop existing processes
Write-Host "Checking for existing processes..." -ForegroundColor Yellow
if (Test-Port 5000) {
    Write-Host "Port 5000 is in use. Stopping existing backend..." -ForegroundColor Yellow
    Stop-ProcessOnPort 5000
    Start-Sleep -Seconds 2
}

if (Test-Port 3000) {
    Write-Host "Port 3000 is in use. Stopping existing process..." -ForegroundColor Yellow
    Stop-ProcessOnPort 3000
    Start-Sleep -Seconds 2
}

if (Test-Port 3001) {
    Write-Host "Port 3001 is in use. Stopping existing process..." -ForegroundColor Yellow
    Stop-ProcessOnPort 3001
    Start-Sleep -Seconds 2
}

# Build backend
Write-Host "Building backend..." -ForegroundColor Green
Set-Location "$PSScriptRoot\backend"
try {
    npm run build | Out-Null
    Write-Host "✅ Backend built successfully" -ForegroundColor Green
}
catch {
    Write-Host "❌ Backend build failed" -ForegroundColor Red
    exit 1
}

# Start backend server with streaming logs & health check
Write-Host "🚀 Starting backend server..." -ForegroundColor Green
$backendJob = Start-Job -Name CanvasBackend -ScriptBlock {
    param($dir)
    Set-Location $dir
    try {
        node dist/server.js
    } catch {
        Write-Output "[backend-job-error] $_"
        exit 1
    }
} -ArgumentList (Get-Location).Path

$backendStarted = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 750
    $out = Receive-Job -Name CanvasBackend -Keep 2>$null
    if ($out) { $out | ForEach-Object { Write-Host "[backend] $_" -ForegroundColor DarkGray } }
    if (Test-Port 5000) {
        try {
            $health = (Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET -TimeoutSec 2 2>$null)
            if ($health.status -in @('ok','success')) { $backendStarted = $true; break }
        } catch {}
        if ($i -gt 4) { $backendStarted = $true; break }
    }
    $state = (Get-Job -Name CanvasBackend).State
    if ($state -in @('Failed','Stopped')) { break }
}

if ($backendStarted) {
    Write-Host "✅ Backend server started on http://localhost:5000" -ForegroundColor Green
} else {
    Write-Host "❌ Backend server failed to become healthy" -ForegroundColor Red
    $final = Receive-Job -Name CanvasBackend -Keep 2>$null
    if ($final) { $final | ForEach-Object { Write-Host "[backend-final] $_" -ForegroundColor Red } }
    Stop-Job -Name CanvasBackend -ErrorAction SilentlyContinue
    Remove-Job -Name CanvasBackend -ErrorAction SilentlyContinue
    exit 1
}

# Start frontend server
Write-Host "🚀 Starting frontend server..." -ForegroundColor Green
Set-Location "$PSScriptRoot\frontend"
$frontendJob = Start-Job -Name CanvasFrontend -ScriptBlock {
    param($dir)
    Set-Location $dir
    $env:BROWSER = "none"
    echo "yes" | npm start
} -ArgumentList (Get-Location).Path

# Wait a moment for frontend to start
Start-Sleep -Seconds 10

# Check frontend status
$frontendStarted = $false
$attempts = 0
while (-not $frontendStarted -and $attempts -lt 30) {
    if (Test-Port 3001) {
        $frontendStarted = $true
        Write-Host "✅ Frontend server started on http://localhost:3001" -ForegroundColor Green
    } elseif (Test-Port 3000) {
        $frontendStarted = $true
        Write-Host "✅ Frontend server started on http://localhost:3000" -ForegroundColor Green
    } else {
        Start-Sleep -Seconds 2
        $attempts++
    }
}

if (-not $frontendStarted) {
    Write-Host "❌ Frontend server failed to start" -ForegroundColor Red
}

    # Display final status
    Write-Host ""
    Write-Host "🎉 Canvas App Status:" -ForegroundColor Cyan
    Write-Host ("=" * 50) -ForegroundColor Gray# Backend status
if (Test-Port 5000) {
    Write-Host "✅ Backend:  http://localhost:5000 (Running)" -ForegroundColor Green
} else {
    Write-Host "❌ Backend:  http://localhost:5000 (Not Running)" -ForegroundColor Red
}

# Frontend status
if (Test-Port 3001) {
    Write-Host "✅ Frontend: http://localhost:3001 (Running)" -ForegroundColor Green
} elseif (Test-Port 3000) {
    Write-Host "✅ Frontend: http://localhost:3000 (Running)" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend: Not Running" -ForegroundColor Red
}

Write-Host ""
Write-Host "📝 Login Credentials:" -ForegroundColor Cyan
Write-Host "   Admin: admin@example.com / admin123" -ForegroundColor White
Write-Host "   User:  user@example.com / user123" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Open your browser and go to the Frontend URL above!" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

# Keep the script running and monitor the servers
try {
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Check if jobs are still running
        # Stream incremental backend logs
        $out = Receive-Job -Name CanvasBackend -Keep 2>$null
        if ($out) { $out | ForEach-Object { Write-Host "[backend] $_" -ForegroundColor DarkGray } }

        if ((Get-Job -Name CanvasBackend).State -ne "Running") {
            Write-Host "❌ Backend server stopped unexpectedly" -ForegroundColor Red
            break
        }
        
        if ((Get-Job -Name CanvasFrontend).State -ne "Running") {
            Write-Host "❌ Frontend server stopped unexpectedly" -ForegroundColor Red
            break
        }
        
        # Quick port check every 30 seconds
        if ((Get-Date).Second % 30 -eq 0) {
            if (-not (Test-Port 5000)) {
                Write-Host "❌ Backend server lost connection" -ForegroundColor Red
                break
            }
        }
    }
}
finally {
    Write-Host ""
    Write-Host "🛑 Stopping servers..." -ForegroundColor Yellow
    
    # Clean up jobs
    Stop-Job -Name CanvasBackend -ErrorAction SilentlyContinue
    Remove-Job -Name CanvasBackend -ErrorAction SilentlyContinue
    Stop-Job -Name CanvasFrontend -ErrorAction SilentlyContinue  
    Remove-Job -Name CanvasFrontend -ErrorAction SilentlyContinue
    
    # Stop processes on ports
    Stop-ProcessOnPort 5000
    Stop-ProcessOnPort 3000
    Stop-ProcessOnPort 3001
    
    Write-Host "✅ All servers stopped" -ForegroundColor Green
}