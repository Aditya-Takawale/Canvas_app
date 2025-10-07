# Frontend Environment Variables Fix

## Problem
Frontend was using `http://localhost:5000` instead of production backend URL, causing CORS errors.

## Root Cause
React environment variables (`REACT_APP_*`) are embedded at **build time**, not runtime. The frontend was built without the correct production environment variables.

## Solution Applied

### 1. Created Production Environment File
Created `frontend/.env.production` with:
```
REACT_APP_BACKEND_URL=https://canvas-app-r3ns.onrender.com
REACT_APP_SOCKET_URL=https://canvas-app-r3ns.onrender.com
REACT_APP_ENVIRONMENT=production
REACT_APP_OFFLINE_MODE=false
```

### 2. Triggered Render Rebuild
- Committed and pushed the environment file
- Render will automatically rebuild the frontend with correct variables

## Alternative Solutions

### Option 1: Set Environment Variables in Render Dashboard
1. Go to Render Dashboard → Your Frontend Static Site
2. Go to Environment tab
3. Add:
   - `REACT_APP_BACKEND_URL` = `https://canvas-app-r3ns.onrender.com`
   - `REACT_APP_SOCKET_URL` = `https://canvas-app-r3ns.onrender.com`
4. Trigger manual deploy

### Option 2: Update Build Command (if env vars set in dashboard)
Update build command to:
```bash
cd frontend && npm install && REACT_APP_BACKEND_URL=https://canvas-app-r3ns.onrender.com REACT_APP_SOCKET_URL=https://canvas-app-r3ns.onrender.com npm run build
```

## Verification
After rebuild completes:
1. Check browser console for environment warnings
2. Verify network requests go to `https://canvas-app-r3ns.onrender.com`
3. Test login functionality

## Notes
- React apps embed environment variables during build, not at runtime
- Environment variables must be prefixed with `REACT_APP_` to be available in React
- `.env.production` files are typically gitignored but added here for deployment convenience