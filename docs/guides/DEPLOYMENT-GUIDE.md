# Canvas App Deployment Guide

This guide will help you deploy your Canvas App to production using Vercel (frontend) and Railway (backend + database).

## Prerequisites

1. **GitHub Account** - Your code should be pushed to a GitHub repository
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **Railway Account** - Sign up at [railway.app](https://railway.app)

## Project Structure

```
Canvas_app/
├── frontend/           # React application (deploys to Vercel)
├── backend/           # Node.js API server (deploys to Railway)
├── vercel.json        # Vercel configuration
├── railway.json       # Railway configuration
└── deployment-scripts/ # Deployment helper scripts
```

## Step 1: Database Setup (Railway)

### 1.1 Create PostgreSQL Database
1. Go to [railway.app](https://railway.app) and sign in
2. Create a new project
3. Click "Add Service" → "Database" → "PostgreSQL"
4. Copy the DATABASE_URL from the PostgreSQL service

### 1.2 Configure Environment Variables
In your Railway project dashboard:
- Go to your PostgreSQL service
- Copy the `DATABASE_URL` connection string
- Save it for the backend configuration

## Step 2: Backend Deployment (Railway)

### 2.1 Deploy Backend Service
1. In your Railway project, click "Add Service" → "GitHub Repo"
2. Connect your GitHub account and select your Canvas_app repository
3. Railway will automatically detect the Node.js app in the `/backend` folder

### 2.2 Configure Backend Environment Variables
In Railway dashboard, go to your backend service → Variables tab and add:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://username:password@hostname:port/database_name
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
PORT=5000
FRONTEND_URL=https://your-vercel-app-name.vercel.app
```

**Important**: 
- Use the DATABASE_URL from your PostgreSQL service
- Generate a strong JWT_SECRET (minimum 32 characters)
- FRONTEND_URL will be your Vercel domain (update after frontend deployment)

### 2.3 Database Migration
After deployment, run the database migration:
1. Go to your backend service in Railway
2. Open the "Deployments" tab
3. Click on the latest deployment
4. Run: `npm run db:deploy`

## Step 3: Frontend Deployment (Vercel)

### 3.1 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Set **Root Directory** to `frontend`
5. Keep other settings as default

### 3.2 Configure Frontend Environment Variables
In Vercel dashboard, go to Project Settings → Environment Variables and add:

```bash
REACT_APP_BACKEND_URL=https://your-backend-app-name.railway.app
REACT_APP_SOCKET_URL=https://your-backend-app-name.railway.app
REACT_APP_ENVIRONMENT=production
```

**Important**: Replace `your-backend-app-name` with your actual Railway backend URL.

### 3.3 Update Backend CORS
After getting your Vercel URL, update the `FRONTEND_URL` environment variable in Railway:
```bash
FRONTEND_URL=https://your-vercel-app-name.vercel.app
```

## Step 4: Final Configuration

### (Optional) Manual Database Initialization
If Prisma migrations did not run automatically and your PostgreSQL database is empty, you can create the tables manually:

1. Ensure you have psql installed (or use Railway's dashboard connect feature).
2. In the repo root (backend folder present), run:

PowerShell (secure password prompt):
```
cd backend
$pw = Read-Host "Postgres Password" -AsSecureString
./scripts/manual-init-db.ps1 -Password $pw -HostName caboose.proxy.rlwy.net -Port 23072 -Database railway -User postgres
```

Bash (if using WSL/Git Bash):
```
export PGPASSWORD=YOUR_PASSWORD
psql -h caboose.proxy.rlwy.net -U postgres -p 23072 -d railway -f prisma/init-postgres.sql
```

The SQL used lives in `backend/prisma/init-postgres.sql` and mirrors your Prisma schema (users, rooms, canvases, drawing_operations, room_connections).

After running, verify:
```
psql -h caboose.proxy.rlwy.net -U postgres -p 23072 -d railway -c "\dt"
```

If tables exist, you can start using the app immediately.

### 4.1 Update Railway Backend URL
Update your frontend environment variables with the actual Railway backend URL:
1. Get your Railway backend URL from the Railway dashboard
2. Update Vercel environment variables with the correct `REACT_APP_BACKEND_URL`

### 4.2 Verify Database Connection
1. Go to your Railway backend service logs
2. Check that the database connection is successful
3. Verify that tables are created properly

## Step 5: Testing

### 5.1 Test Frontend
- Visit your Vercel URL
- Try to register/login
- Create a room
- Test drawing functionality

### 5.2 Test Real-time Features
- Open multiple browser tabs
- Test multi-user cursor functionality
- Verify socket connections work

## Environment Variables Reference

### Backend (.env.production)
```bash
NODE_ENV=production
DATABASE_URL=postgresql://username:password@hostname:port/database_name
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
PORT=5000
FRONTEND_URL=https://your-vercel-app-name.vercel.app
LOG_LEVEL=info
```

### Frontend (Vercel Environment Variables)
```bash
REACT_APP_BACKEND_URL=https://your-backend-app-name.railway.app
REACT_APP_SOCKET_URL=https://your-backend-app-name.railway.app
REACT_APP_ENVIRONMENT=production
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `FRONTEND_URL` in Railway matches your Vercel domain exactly
   - Check that both HTTP and HTTPS are handled properly

2. **Database Connection Errors**
   - Verify `DATABASE_URL` is correctly formatted
   - Ensure the PostgreSQL service is running in Railway

3. **Socket Connection Issues**
   - Verify `REACT_APP_SOCKET_URL` matches your Railway backend URL
   - Check that WebSocket connections are allowed

4. **Build Failures**
   - Check the build logs in Railway/Vercel
   - Ensure all dependencies are in package.json

### Monitoring

- **Railway Logs**: Monitor backend logs in Railway dashboard
- **Vercel Analytics**: Monitor frontend performance in Vercel dashboard
- **Database Monitoring**: Use Railway's built-in PostgreSQL monitoring

## Development vs Production

### Development (Local)
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Database: SQLite (`dev.db`)

### Production
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.railway.app`
- Database: PostgreSQL (Railway-hosted)

## Scaling Considerations

- **Railway**: Automatically scales based on usage
- **Vercel**: Edge network distribution for fast global access
- **Database**: Railway PostgreSQL can be upgraded for larger datasets

## Security Notes

- All environment variables are encrypted
- HTTPS is enforced in production
- JWT tokens are properly secured
- Database connections use SSL in production

For additional help, refer to:
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)