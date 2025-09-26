import { Router } from 'express';
import {
  getCurrentUser,
  updateUserProfile,
  getUserById,
  changePassword,
} from '../controllers/user.controller';
import { validatePasswordChange, validateProfileUpdate } from '../middleware/validators';

const router = Router();

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', getCurrentUser);

/**
 * @route   PUT /api/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', validateProfileUpdate, updateUserProfile);

/**
 * @route   PUT /api/users/me/password
 * @desc    Change current user password
 * @access  Private
 */
router.put('/me/password', validatePasswordChange, changePassword);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (limited info)
 * @access  Private
 */
router.get('/:id', getUserById);

export default router;