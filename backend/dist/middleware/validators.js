"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePasswordChange = exports.validateProfileUpdate = exports.validateRoomUpdate = exports.validateRoomCreation = exports.validateLogin = exports.validateRegister = void 0;
const express_validator_1 = require("express-validator");
/**
 * Validate registration request
 */
exports.validateRegister = [
    (0, express_validator_1.body)('username')
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
    (0, express_validator_1.body)('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Must be a valid email address'),
    (0, express_validator_1.body)('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
        .matches(/\d/).withMessage('Password must contain at least one number'),
    (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req);
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
exports.validateLogin = [
    (0, express_validator_1.body)('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Must be a valid email address'),
    (0, express_validator_1.body)('password')
        .notEmpty().withMessage('Password is required'),
    (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req);
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
exports.validateRoomCreation = [
    (0, express_validator_1.body)('name')
        .notEmpty().withMessage('Room name is required')
        .isLength({ min: 3, max: 50 }).withMessage('Room name must be between 3 and 50 characters'),
    (0, express_validator_1.body)('description')
        .optional()
        .isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters'),
    (0, express_validator_1.body)('isPrivate')
        .optional()
        .isBoolean().withMessage('isPrivate must be a boolean value'),
    (0, express_validator_1.body)('width')
        .optional()
        .isInt({ min: 300, max: 3000 }).withMessage('Width must be an integer between 300 and 3000'),
    (0, express_validator_1.body)('height')
        .optional()
        .isInt({ min: 300, max: 3000 }).withMessage('Height must be an integer between 300 and 3000'),
    (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req);
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
exports.validateRoomUpdate = [
    (0, express_validator_1.body)('name')
        .optional()
        .isLength({ min: 3, max: 50 }).withMessage('Room name must be between 3 and 50 characters'),
    (0, express_validator_1.body)('description')
        .optional()
        .isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters'),
    (0, express_validator_1.body)('isPrivate')
        .optional()
        .isBoolean().withMessage('isPrivate must be a boolean value'),
    (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req);
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
exports.validateProfileUpdate = [
    (0, express_validator_1.body)('username')
        .optional()
        .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
    (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req);
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
exports.validatePasswordChange = [
    (0, express_validator_1.body)('currentPassword')
        .notEmpty().withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
        .matches(/\d/).withMessage('Password must contain at least one number')
        .custom((value, { req }) => {
        if (value === req.body.currentPassword) {
            throw new Error('New password must be different from current password');
        }
        return true;
    }),
    (0, express_validator_1.body)('confirmPassword')
        .notEmpty().withMessage('Password confirmation is required')
        .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
            throw new Error('Password confirmation does not match new password');
        }
        return true;
    }),
    (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req);
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
//# sourceMappingURL=validators.js.map