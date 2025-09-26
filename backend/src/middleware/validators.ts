import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

/**
 * Validate registration request
 */
export const validateRegister = [
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/\d/).withMessage('Password must contain at least one number'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation errors',
        errors: errors.array(),
      });
    }
    
    next();
  },
];

/**
 * Validate login request
 */
export const validateLogin = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address'),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation errors',
        errors: errors.array(),
      });
    }
    
    next();
  },
];

/**
 * Validate room creation request
 */
export const validateRoomCreation = [
  body('name')
    .notEmpty().withMessage('Room name is required')
    .isLength({ min: 3, max: 50 }).withMessage('Room name must be between 3 and 50 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters'),
  
  body('isPrivate')
    .optional()
    .isBoolean().withMessage('isPrivate must be a boolean value'),
  
  body('width')
    .optional()
    .isInt({ min: 300, max: 3000 }).withMessage('Width must be an integer between 300 and 3000'),
  
  body('height')
    .optional()
    .isInt({ min: 300, max: 3000 }).withMessage('Height must be an integer between 300 and 3000'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation errors',
        errors: errors.array(),
      });
    }
    
    next();
  },
];

/**
 * Validate room update request
 */
export const validateRoomUpdate = [
  body('name')
    .optional()
    .isLength({ min: 3, max: 50 }).withMessage('Room name must be between 3 and 50 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters'),
  
  body('isPrivate')
    .optional()
    .isBoolean().withMessage('isPrivate must be a boolean value'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation errors',
        errors: errors.array(),
      });
    }
    
    next();
  },
];

/**
 * Validate profile update request
 */
export const validateProfileUpdate = [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation errors',
        errors: errors.array(),
      });
    }
    
    next();
  },
];

/**
 * Validate password change request
 */
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
  
  body('confirmPassword')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation errors',
        errors: errors.array(),
      });
    }
    
    next();
  },
];