import { Request, Response } from 'express';
import prisma from '../config/prisma';
import logger from '../utils/logger';
import { comparePassword, hashPassword } from '../utils/auth';

/**
 * Get current user profile
 * @route GET /api/users/me
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ 
        status: 'error',
        message: 'User authentication required' 
      });
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }
    
    res.status(200).json({
      status: 'success',
      message: 'User profile retrieved successfully',
      data: user,
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve user profile',
    });
  }
};

/**
 * Update current user profile
 * @route PUT /api/users/me
 */
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ 
        status: 'error',
        message: 'User authentication required' 
      });
      return;
    }
    
    const { username } = req.body;
    
    // Check if username already exists for a different user
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: userId },
        },
      });
      
      if (existingUser) {
        res.status(409).json({
          status: 'error',
          message: 'Username already exists',
        });
        return;
      }
    }
    
    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { username },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    res.status(200).json({
      status: 'success',
      message: 'User profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    logger.error('Update user profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user profile',
    });
  }
};

/**
 * Change current user password
 * @route PUT /api/users/me/password
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ 
        status: 'error',
        message: 'User authentication required' 
      });
      return;
    }
    
    const { currentPassword, newPassword } = req.body;
    
    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }
    
    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    
    if (!isPasswordValid) {
      res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect',
      });
      return;
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password',
    });
  }
};

/**
 * Get user by ID (limited info)
 * @route GET /api/users/:id
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });
    
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }
    
    res.status(200).json({
      status: 'success',
      message: 'User retrieved successfully',
      data: user,
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve user',
    });
  }
};