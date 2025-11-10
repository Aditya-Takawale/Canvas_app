# Canvas App Startup Script
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
    
    foreach ($processId in $processes) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Host "Stopped existing process on port $Port (PID: $processId)" -ForegroundColor Yellow
        }
        catch {
            # Ignore errors
        }
    }
}

# Stop existing processes
Write-Host "Checking for existing processes..." -ForegroundColor Yellow
Stop-ProcessOnPort 5000
Stop-ProcessOnPort 3000  
Stop-ProcessOnPort 3001
Start-Sleep -Seconds 2

# Build and start backend
Write-Host "Building backend..." -ForegroundColor Green
Set-Location "$PSScriptRoot\backend"
npm run build | Out-Null
Write-Host "Backend built successfully" -ForegroundColor Green

Write-Host "Starting backend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-Command", "Set-Location '$PSScriptRoot\backend'; node dist/server.js" -WindowStyle Minimized
Start-Sleep -Seconds 5

if (Test-Port 5000) {
    Write-Host "Backend server started on http://localhost:5000" -ForegroundColor Green
} else {
    Write-Host "Backend server failed to start" -ForegroundColor Red
    exit 1
}

# Start frontend
Write-Host "Starting frontend server..." -ForegroundColor Green
Set-Location "$PSScriptRoot\frontend"
Start-Process powershell -ArgumentList "-Command", "Set-Location '$PSScriptRoot\frontend'; `$env:BROWSER='none'; echo 'y' | npm start" -WindowStyle Minimized
Start-Sleep -Seconds 10

$frontendPort = $null
if (Test-Port 3001) {
    $frontendPort = 3001
} elseif (Test-Port 3000) {
    $frontendPort = 3000
}

Write-Host ""
Write-Host "Canvas App Status:" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Gray

if (Test-Port 5000) {
    Write-Host "Backend:  http://localhost:5000 (Running)" -ForegroundColor Green
} else {
    Write-Host "Backend:  http://localhost:5000 (Not Running)" -ForegroundColor Red
}

if ($frontendPort) {
    Write-Host "Frontend: http://localhost:$frontendPort (Running)" -ForegroundColor Green
} else {
    Write-Host "Frontend: Not Running" -ForegroundColor Red
}

Write-Host ""
Write-Host "Login Credentials:" -ForegroundColor Cyan
Write-Host "  Admin: admin@example.com / admin123" -ForegroundColor White
Write-Host "  User:  user@example.com / user123" -ForegroundColor White
Write-Host ""
Write-Host "Open your browser and go to http://localhost:$frontendPort" -ForegroundColor Yellow
Write-Host "Press any key to exit..." -ForegroundColor Yellow
Read-Host