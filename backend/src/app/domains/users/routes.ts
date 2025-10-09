import { Router } from 'express';
import { getCurrentUser, updateUserProfile, changePassword, getUserById } from './controller';
import { validatePasswordChange, validateProfileUpdate } from '../../common/middleware';

const router = Router();
/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get profile of current user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: User profile }
 *       401: { description: Unauthorized }
 */
router.get('/me', getCurrentUser);
/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Updated user }
 *       409: { description: Username conflict }
 */
router.put('/me', validateProfileUpdate, updateUserProfile);
/**
 * @swagger
 * /api/users/me/password:
 *   put:
 *     summary: Change password for current user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Password changed }
 *       401: { description: Invalid current password }
 */
router.put('/me/password', validatePasswordChange, changePassword);
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID (limited info)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200: { description: User returned }
 *       404: { description: Not found }
 */
router.get('/:id', getUserById);
export default router;

