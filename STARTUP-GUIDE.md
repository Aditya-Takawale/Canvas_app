# Canvas App - Easy Startup Guide 🎨

## 🚀 One-Command Startup

I've created multiple ways to start both the backend and frontend with a single command:

### Option 1: Using npm (Recommended)
```bash
npm start
```

### Option 2: Using PowerShell directly
```powershell
.\start-app.ps1
```

### Option 3: Using Batch file
```cmd
start-app.bat
```

## 📊 What the Script Does

The startup script will:

1. **🔍 Check Port Status** - Verifies if ports 3000, 3001, and 5000 are available
2. **🛑 Stop Existing Processes** - Automatically stops any conflicting processes
3. **🔨 Build Backend** - Compiles TypeScript backend code
4. **🚀 Start Backend** - Launches the API server on port 5000
5. **🚀 Start Frontend** - Launches the React app (usually port 3001)
6. **📊 Show Status** - Displays the running status of both servers
7. **👀 Monitor Servers** - Continuously monitors both servers
8. **📝 Show Login Info** - Displays test user credentials

## 📊 Status Display

After running, you'll see:
```
🎉 Canvas App Status:
==================================================
✅ Backend:  http://localhost:5000 (Running)
✅ Frontend: http://localhost:3001 (Running)

📝 Login Credentials:
   Admin: admin@example.com / admin123
   User:  user@example.com / user123

🌐 Open your browser and go to the Frontend URL above!

⚠️  Press Ctrl+C to stop both servers
```

## 🛑 Stopping the App

- **Press `Ctrl+C`** in the terminal where the script is running
- The script will automatically stop both servers and clean up processes

## 🔧 Individual Commands (if needed)

### Start Backend Only
```bash
npm run start:backend
```

### Start Frontend Only  
```bash
npm run start:frontend
```

### Build Both Projects
```bash
npm run build
```

## 📝 Test Users Available

- **Admin User**: `admin@example.com` / `admin123`
- **Regular User**: `user@example.com` / `user123`

## 🎯 Quick Start

1. Open PowerShell or Command Prompt
2. Navigate to the Canvas_app directory
3. Run: `npm start`
4. Wait for both servers to start
5. Open http://localhost:3001 in your browser
6. Login with the provided credentials
7. Enjoy your collaborative canvas app! 🎨