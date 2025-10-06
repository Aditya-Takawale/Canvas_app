# Render Deployment Guide

## Current Setup
You're deploying a full-stack app with backend (Express + Prisma) and frontend (React).

## For Web Service (Backend) Configuration in Render Dashboard:

### Build & Deploy Settings:
- **Repository**: https://github.com/Aditya-Takawale/Canvas_app
- **Branch**: main
- **Runtime**: Node.js  
- **Build Command**: `cd backend && npm install && npm run build`
- **Start Command**: `cd backend && npm run start:prod`
- **Root Directory**: Leave blank (use repo root)

### Environment Variables:
```
NODE_ENV=production
PORT=10000
DATABASE_URL=[your-postgres-connection-string]
JWT_SECRET=[generate-random-secret]
CORS_ORIGIN=https://your-frontend-render-url.onrender.com
ENABLE_DEBUG_ROUTES=false
```

### Health Check:
- **Health Check Path**: `/api/health`

## For Static Site (Frontend) Configuration:

### Build & Deploy Settings:
- **Repository**: https://github.com/Aditya-Takawale/Canvas_app  
- **Branch**: main
- **Build Command**: `cd frontend && npm install && npm run build`
- **Publish Directory**: `frontend/build`

### Environment Variables:
```
REACT_APP_API_BASE_URL=https://your-backend-render-url.onrender.com
REACT_APP_SOCKET_URL=https://your-backend-render-url.onrender.com
REACT_APP_OFFLINE_MODE=false
```

## Database Options:

### Option 1: Use Render PostgreSQL
1. Create a PostgreSQL database in Render
2. Copy the connection string to your backend's `DATABASE_URL`

### Option 2: Use External Database (Railway/Vercel Postgres)
1. Keep your existing `DATABASE_URL` from Railway or Vercel
2. Ensure it allows external connections

## Deploy Order:
1. Deploy backend first to get the backend URL
2. Deploy frontend with backend URL in environment variables
3. Update backend's `CORS_ORIGIN` with frontend URL
4. Redeploy backend if needed

## After Deployment:
1. Test: `GET https://your-backend-url.onrender.com/api/health`
2. Test: `GET https://your-backend-url.onrender.com/api/health/db`
3. Visit your frontend URL and test login/register

## Troubleshooting:
- If build fails: Check that both backend and frontend package.json have all required dependencies
- If 502 errors: Check logs for database connection issues
- If CORS errors: Verify CORS_ORIGIN matches your frontend domain exactly