import { Request, Response, NextFunction } from 'express';
import { verifyJwtToken } from '../utils/auth';
import logger from '../utils/logger';
import { JwtPayload } from '../interfaces/auth';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authentication middleware to protect routes
 * Verifies JWT token and adds user information to request
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required. Please provide a valid token.',
      });
      return;
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = verifyJwtToken(token);
    
    // Add user info to request
    req.user = decoded;
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token. Please login again.',
    });
  }
};