# Quick Status Check for Canvas App
Write-Host ""
Write-Host "Canvas App - Server Status Check" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Gray

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

# Check backend
if (Test-Port 5000) {
    Write-Host "[RUNNING] Backend:  http://localhost:5000" -ForegroundColor Green
} else {
    Write-Host "[STOPPED] Backend:  http://localhost:5000" -ForegroundColor Red
}

# Check frontend ports
if (Test-Port 3000) {
    Write-Host "[RUNNING] Frontend: http://localhost:3000" -ForegroundColor Green
} elseif (Test-Port 3001) {
    Write-Host "[RUNNING] Frontend: http://localhost:3001" -ForegroundColor Green
} else {
    Write-Host "[STOPPED] Frontend: Not running" -ForegroundColor Red
}

# Check Prisma Studio
if (Test-Port 5555) {
    Write-Host "[RUNNING] Prisma Studio: http://localhost:5555" -ForegroundColor Green
} else {
    Write-Host "[STOPPED] Prisma Studio: Not running" -ForegroundColor Red
}

Write-Host ""
if ((Test-Port 5000) -and (Test-Port 3000 -or Test-Port 3001) -and (Test-Port 5555)) {
    Write-Host "CANVAS APP IS READY!" -ForegroundColor Green
    if (Test-Port 3000) {
        Write-Host "Open http://localhost:3000 in your browser" -ForegroundColor Yellow
    } else {
        Write-Host "Open http://localhost:3001 in your browser" -ForegroundColor Yellow
    }
    Write-Host "Prisma Studio: http://localhost:5555" -ForegroundColor Yellow
} else {
    Write-Host "Use 'npm start' to start the Canvas App" -ForegroundColor Yellow
}

Write-Host ""