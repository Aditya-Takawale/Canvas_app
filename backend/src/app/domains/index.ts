import { Router } from 'express';
import authRoutes from './auth/routes';
import roomRoutes from './rooms/routes';
import canvasRoutes from './canvas/routes';
import userRoutes from './users/routes';
import { authenticate } from '../common/middleware';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is up and running',
    timestamp: new Date(),
  });
});

router.use('/auth', authRoutes);
router.use('/rooms', authenticate, roomRoutes);
router.use('/canvas', authenticate, canvasRoutes);
router.use('/users', authenticate, userRoutes);

export default router;
