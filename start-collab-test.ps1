# Real-Time Collaboration Test Script
# Start the WebSocket server and open test page

Write-Host "🚀 Starting Real-Time Collaboration Test..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Install ws package if needed
if (!(Test-Path "node_modules/ws")) {
    Write-Host "📦 Installing WebSocket dependencies..." -ForegroundColor Yellow
    npm install ws
}

# Start the collaboration server in background
Write-Host "🌐 Starting WebSocket collaboration server on port 8081..." -ForegroundColor Yellow
$serverProcess = Start-Process -FilePath "node" -ArgumentList "collab-server.js" -PassThru -WindowStyle Hidden

# Wait a moment for server to start
Start-Sleep -Seconds 2

# Check if server is running
try {
    $testConnection = Test-NetConnection -ComputerName "localhost" -Port 8081 -InformationLevel Quiet
    if ($testConnection) {
        Write-Host "✅ Collaboration server started successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Server may still be starting..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Cannot verify server status" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🧪 Test Instructions:" -ForegroundColor Cyan
Write-Host "1. Opening test page in your default browser..." -ForegroundColor White
Write-Host "2. Open the same page in another browser window/tab" -ForegroundColor White
Write-Host "3. Move your mouse around to see real-time cursors!" -ForegroundColor White
Write-Host "4. Try different room IDs to test room isolation" -ForegroundColor White
Write-Host ""

# Open test page in default browser
$testPagePath = "file:///$((Get-Location).Path)/test-realtime-cursors.html"
Start-Process $testPagePath

Write-Host "🔗 Test page: $testPagePath" -ForegroundColor Green
Write-Host "📡 WebSocket server: ws://localhost:8081" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server and exit." -ForegroundColor Yellow

# Keep script running and handle Ctrl+C
try {
    while ($true) {
        Start-Sleep -Seconds 1
        
        # Check if server process is still running
        if ($serverProcess.HasExited) {
            Write-Host "❌ Server process has stopped unexpectedly." -ForegroundColor Red
            break
        }
    }
} finally {
    # Cleanup: Stop the server process
    if (!$serverProcess.HasExited) {
        Write-Host ""
        Write-Host "🛑 Stopping collaboration server..." -ForegroundColor Yellow
        Stop-Process -Id $serverProcess.Id -Force
        Write-Host "✅ Server stopped." -ForegroundColor Green
    }
}