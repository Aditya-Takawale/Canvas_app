# Canvas App - API Configuration Fix

## Problem Resolved: Cannot POST /api/rooms (404 Not Found)

### Issue Identified
The frontend was making API calls to `http://localhost:3000/api/rooms` instead of the backend server at `http://localhost:5000/api/rooms`. This happened because:

1. **apiSlice.ts** had `baseUrl: '/api'` (relative URL)
2. **roomSlice.ts** used axios with relative URLs like `/api/rooms`
3. **auth.api.ts** had incorrect base URL configuration

### Solution Implemented

#### 1. Created Centralized API Instance (`/frontend/src/services/api.ts`)
```typescript
const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

#### 2. Fixed API Base URLs
- **apiSlice.ts**: Changed from `baseUrl: '/api'` to `baseUrl: 'http://localhost:5000/api'`
- **auth.api.ts**: Updated to use `baseUrl: 'http://localhost:5000/api'`
- **roomSlice.ts**: Now uses the centralized `api` instance

#### 3. Added Request Interceptor
Automatically attaches JWT tokens to all requests:
```typescript
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Current Status
✅ Backend Server: http://localhost:5000
✅ Frontend Server: http://localhost:3000  
✅ API Endpoints: All pointing to backend server
✅ Authentication: JWT tokens properly attached
✅ CORS: Configured for both frontend ports (3000, 3001)

### Available Commands
```bash
npm start          # Start both servers with monitoring
npm run status     # Check server status
npm run stop       # Stop all servers
```

### Test Credentials
- **Admin**: admin@example.com / admin123
- **User**: user@example.com / user123

### API Endpoints Now Working
- POST `/api/auth/login` ✅
- POST `/api/auth/register` ✅  
- GET `/api/rooms` ✅
- POST `/api/rooms` ✅
- GET `/api/rooms/:id` ✅
- PUT `/api/rooms/:id` ✅
- DELETE `/api/rooms/:id` ✅

The 404 error should now be resolved and all room operations should work correctly!