import { Request, Response } from 'express';
import { comparePassword, generateJwtToken, hashPassword } from '../utils/auth';
import { User, UserCreationAttributes } from '../interfaces/user';
import { PrismaClient } from '@prisma/client';
import logger, { authLogger } from '../utils/logger';

import prisma from '../config/prisma';

/**
 * Register a new user
 * @route POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body as UserCreationAttributes;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Log registration attempt
    authLogger.info({
      message: 'User registration attempt',
      username,
      email,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    });

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
    });

    if (existingUser) {
      // Log failed registration - user already exists
      authLogger.warn({
        message: 'Registration failed - user already exists',
        username,
        email,
        ipAddress,
        userAgent,
        reason: 'Duplicate user',
        timestamp: new Date().toISOString()
      });

      res.status(409).json({
        status: 'error',
        message: 'User with this email or username already exists',
      });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'user', // Default role
      },
    });

    // Generate JWT token
    const token = generateJwtToken(newUser as unknown as User);

    // Return user data and token (excluding password)
    const { password: _, ...userWithoutPassword } = newUser;

    // Log successful registration
    authLogger.info({
      message: 'User registered successfully',
      userId: newUser.id,
      username,
      email,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    // Log registration error
    authLogger.error({
      message: 'Registration error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Also log to main logger for error monitoring
    logger.error('Registration error:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to register user',
    });
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    // Log login attempt
    authLogger.info({
      message: 'Login attempt',
      email,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    });

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Log failed login - user not found
      authLogger.warn({
        message: 'Login failed - user not found',
        email,
        ipAddress,
        userAgent,
        reason: 'User not found',
        timestamp: new Date().toISOString()
      });
      
      res.status(401).json({
        status: 'error',
        message: 'Invalid credentials',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      // Log failed login - invalid password
      authLogger.warn({
        message: 'Login failed - invalid password',
        userId: user.id,
        username: user.username,
        email,
        ipAddress,
        userAgent,
        reason: 'Invalid password',
        timestamp: new Date().toISOString()
      });
      
      res.status(401).json({
        status: 'error',
        message: 'Invalid credentials',
      });
      return;
    }

    // Generate JWT token
    const token = generateJwtToken(user as unknown as User);

    // Return user data and token (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    
    // Log successful login
    authLogger.info({
      message: 'Login successful',
      userId: user.id,
      username: user.username,
      email,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    // Log login error
    authLogger.error({
      message: 'Login error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Also log to main logger for error monitoring
    logger.error('Login error:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to login',
    });
  }
};

/**
 * Refresh JWT token
 * @route POST /api/auth/refresh
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // This functionality would typically involve refresh tokens
    // For simplicity, we're just re-validating the current token and generating a new one
    
    const { userId } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    // Log token refresh attempt
    authLogger.info({
      message: 'Token refresh attempt',
      userId,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    });
    
    if (!userId) {
      // Log failed token refresh - missing userId
      authLogger.warn({
        message: 'Token refresh failed - missing user ID',
        ipAddress,
        userAgent,
        reason: 'Missing user ID',
        timestamp: new Date().toISOString()
      });
      
      res.status(400).json({
        status: 'error',
        message: 'User ID required',
      });
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
    });
    
    if (!user) {
      // Log failed token refresh - user not found
      authLogger.warn({
        message: 'Token refresh failed - user not found',
        userId,
        ipAddress,
        userAgent,
        reason: 'User not found',
        timestamp: new Date().toISOString()
      });
      
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }
    
    // Generate new token
    const token = generateJwtToken(user as unknown as User);
    
    // Log successful token refresh
    authLogger.info({
      message: 'Token refresh successful',
      userId: user.id,
      username: user.username,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Token refreshed',
      data: { token },
    });
  } catch (error) {
    // Log token refresh error
    authLogger.error({
      message: 'Token refresh error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Also log to main logger for error monitoring
    logger.error('Token refresh error:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to refresh token',
    });
  }
};

/**
 * Get current user information
 * @route GET /api/auth/me
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
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
      data: { user },
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user information',
    });
  }
};

/**
 * Logout user
 * @route POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  // In a stateless JWT setup, the client simply discards the token
  // For extra security, we could implement a token blocklist
  
  // Get user information from authenticated request
  const userId = (req as any).user?.id;
  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  // Log logout
  if (userId) {
    authLogger.info({
      message: 'User logout',
      userId,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }
  
  res.status(200).json({
    status: 'success',
    message: 'Logout successful',
  });
};