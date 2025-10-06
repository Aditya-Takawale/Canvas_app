import { Router } from 'express';
import authRoutes from './auth.routes';
import roomRoutes from './room.routes';
import canvasRoutes from './canvas.routes';
import userRoutes from './user.routes';
import { authenticate } from '../middleware/authenticate';
import prisma from '../config/prisma';

const router = Router();

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is up and running',
    timestamp: new Date(),
  });
});

// Temporary DB health route (can be removed after verification)
router.get('/health/db', async (req, res) => {
  try {
    // Simple query to ensure DB is reachable
    await prisma.$queryRaw`SELECT 1`;
    const userCount = await prisma.user.count();
    res.status(200).json({
      status: 'success',
      database: 'reachable',
      userCount,
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      database: 'unreachable',
      message: error?.message || 'Database health check failed',
      timestamp: new Date(),
    });
  }
});

// Optional debug route (must set ENABLE_DEBUG_ROUTES=true in backend env)
router.get('/debug/env', (req, res) => {
  if (process.env.ENABLE_DEBUG_ROUTES !== 'true') {
    return res.status(404).json({ status: 'error', message: 'Not found' });
  }
  res.status(200).json({
    status: 'success',
    data: {
      nodeEnv: process.env.NODE_ENV,
      corsOrigin: process.env.CORS_ORIGIN,
      port: process.env.PORT,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasJwtSecret: Boolean(process.env.JWT_SECRET),
      // Do NOT send actual secrets
      timestamp: new Date(),
    }
  });
});

// Public routes
router.use('/auth', authRoutes);

// Protected routes - require authentication
router.use('/rooms', authenticate, roomRoutes);
router.use('/canvas', authenticate, canvasRoutes);
router.use('/users', authenticate, userRoutes);

export default router;