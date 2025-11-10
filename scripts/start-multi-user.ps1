# Canvas App with Multi-User Simulation Startup Script
# This script starts both backend and frontend servers with multi-user functionality enabled

Write-Host "Starting Canvas App with Multi-User Simulation..." -ForegroundColor Cyan
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
    
    foreach ($processId in $processes) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Host "⚠️  Stopped existing process on port $Port (PID: $processId)" -ForegroundColor Yellow
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

# Start backend server
Write-Host "🚀 Starting backend server..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    Set-Location $args[0]
    node dist/server.js
} -ArgumentList (Get-Location).Path

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Check if backend started successfully
if (Test-Port 5000) {
    Write-Host "✅ Backend server started on http://localhost:5000" -ForegroundColor Green
} else {
    Write-Host "❌ Backend server failed to start on port 5000" -ForegroundColor Red
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    exit 1
}

# Start frontend server with multi-user mode
Write-Host "🚀 Starting frontend server with Multi-User Simulation..." -ForegroundColor Green
Set-Location "$PSScriptRoot\frontend"
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $args[0]
    $env:BROWSER = "none"  # Prevent auto-opening browser
    $env:REACT_APP_ENABLE_MULTI_USER = "true"  # Enable multi-user mode
    Write-Output "yes" | npm start
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
Write-Host "🎉 Canvas App with Multi-User Simulation Status:" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# Backend status
if (Test-Port 5000) {
    Write-Host "✅ Backend:  http://localhost:5000 (Running)" -ForegroundColor Green
} else {
    Write-Host "❌ Backend:  http://localhost:5000 (Not Running)" -ForegroundColor Red
}

# Frontend status
if (Test-Port 3001) {
    Write-Host "✅ Frontend: http://localhost:3001 (Running with Multi-User)" -ForegroundColor Green
} elseif (Test-Port 3000) {
    Write-Host "✅ Frontend: http://localhost:3000 (Running with Multi-User)" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend: Not Running" -ForegroundColor Red
}

Write-Host ""
Write-Host "📝 Login Credentials:" -ForegroundColor Cyan
Write-Host "   Admin: admin@example.com / admin123" -ForegroundColor White
Write-Host "   User:  user@example.com / user123" -ForegroundColor White
Write-Host ""
Write-Host "👥 Multi-User Keyboard Shortcuts:" -ForegroundColor Cyan
Write-Host "   1-2: Switch to user 1-2 (Admin/User)" -ForegroundColor White
Write-Host "   Tab: Next user" -ForegroundColor White
Write-Host "   Shift+Tab: Previous user" -ForegroundColor White
Write-Host "   C: Toggle cursor visibility" -ForegroundColor White
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
        if ($backendJob.State -ne "Running") {
            Write-Host "❌ Backend server stopped unexpectedly" -ForegroundColor Red
            break
        }
        
        if ($frontendJob.State -ne "Running") {
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
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue  
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
    
    # Stop processes on ports
    Stop-ProcessOnPort 5000
    Stop-ProcessOnPort 3000
    Stop-ProcessOnPort 3001
    
    Write-Host "✅ All servers stopped" -ForegroundColor Green
}