# Environment Setup Guide

## 🔐 Security First: Environment Variables

This project uses environment variables to store sensitive configuration. **Never commit `.env` files to git!**

## Backend Setup

1. **Copy the example file:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Generate a secure JWT secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

3. **Update your `.env` file:**
   ```bash
   # Example .env file
   NODE_ENV=development
   PORT=5000
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="your-generated-secret-here"
   JWT_EXPIRES_IN=30d
   CORS_ORIGIN=http://localhost:3000
   ```

## Frontend Setup

1. **Create frontend environment file:**
   ```bash
   cd frontend
   touch .env.local
   ```

2. **Add your configuration:**
   ```bash
   NODE_ENV=development
   REACT_APP_API_URL=http://localhost:5000
   REACT_APP_SOCKET_URL=http://localhost:5000
   GENERATE_SOURCEMAP=true
   ```

## 🚨 Security Warnings

- ❌ **NEVER** commit `.env` files to git
- ❌ **NEVER** share your JWT_SECRET
- ❌ **NEVER** use default/example secrets in production
- ✅ **ALWAYS** use strong, unique secrets for each environment
- ✅ **ALWAYS** use environment-specific configurations

## Production Deployment

For production, ensure you:

1. Use strong, unique secrets
2. Use secure database connections
3. Set `NODE_ENV=production`
4. Use HTTPS URLs for CORS_ORIGIN
5. Never expose sensitive environment variables in client-side code

## Need Help?

If you're missing environment variables, check:
1. `.env.example` files for reference
2. This setup guide
3. The main README.md for project setup instructions