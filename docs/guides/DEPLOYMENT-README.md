# Deployment Quick Start

## 🚀 Ready for Production Deployment

Your Canvas App is now configured for production deployment on Vercel + Railway.

### Files Added for Deployment:
- ✅ `vercel.json` - Vercel frontend configuration
- ✅ `railway.json` - Railway backend configuration  
- ✅ `frontend/.env.production.example` - Frontend environment template
- ✅ `backend/.env.production.example` - Backend environment template
- ✅ `DEPLOYMENT-GUIDE.md` - Complete deployment instructions
- ✅ `deployment-check.ps1` / `deployment-check.sh` - Pre-deployment validation scripts

### Database Migration:
- ✅ Prisma schema updated for PostgreSQL production
- ✅ Development schema preserved in `schema.dev.prisma`
- ✅ Production build scripts added to `backend/package.json`

### API Configuration:
- ✅ Centralized environment config created (`frontend/src/config/environment.ts`)
- ✅ API services updated to use environment variables
- ✅ Socket connections configured for production URLs

## Quick Deployment Steps:

1. **Run Pre-deployment Check:**
   ```powershell
   .\deployment-check.ps1  # Windows
   # or
   ./deployment-check.sh   # Linux/Mac
   ```

2. **Commit and Push to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

3. **Deploy Backend (Railway):**
   - Create Railway project
   - Add PostgreSQL database
   - Connect GitHub repo
   - Configure environment variables

4. **Deploy Frontend (Vercel):**
   - Create Vercel project
   - Set root directory to `frontend`
   - Configure environment variables
   - Deploy

5. **Configure Cross-Origin:**
   - Update Railway `FRONTEND_URL` with Vercel domain
   - Update Vercel `REACT_APP_BACKEND_URL` with Railway domain

## 📖 Full Instructions:
See **[DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)** for complete step-by-step deployment instructions.

---

**Stack:**
- 🎨 **Frontend**: React + TypeScript → Vercel
- ⚡ **Backend**: Node.js + Express → Railway  
- 🗄️ **Database**: PostgreSQL → Railway
- 🔄 **Real-time**: Socket.io WebSockets