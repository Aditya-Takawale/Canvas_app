import { Router } from 'express';
import authRoutes from './auth.routes';
import roomRoutes from './room.routes';
import canvasRoutes from './canvas.routes';
import userRoutes from './user.routes';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is up and running',
    timestamp: new Date(),
  });
});

// Public routes
router.use('/auth', authRoutes);

// Protected routes - require authentication
router.use('/rooms', authenticate, roomRoutes);
router.use('/canvas', authenticate, canvasRoutes);
router.use('/users', authenticate, userRoutes);

export default router;