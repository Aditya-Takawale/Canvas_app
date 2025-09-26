"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = exports.changePassword = exports.updateUserProfile = exports.getCurrentUser = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const logger_1 = __importDefault(require("../utils/logger"));
const auth_1 = require("../utils/auth");
/**
 * Get current user profile
 * @route GET /api/users/me
 */
const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                status: 'error',
                message: 'User authentication required'
            });
            return;
        }
        const user = await prisma_1.default.user.findUnique({
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
    }
    catch (error) {
        logger_1.default.error('Get current user error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve user profile',
        });
    }
};
exports.getCurrentUser = getCurrentUser;
/**
 * Update current user profile
 * @route PUT /api/users/me
 */
const updateUserProfile = async (req, res) => {
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
            const existingUser = await prisma_1.default.user.findFirst({
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
        const updatedUser = await prisma_1.default.user.update({
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
    }
    catch (error) {
        logger_1.default.error('Update user profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update user profile',
        });
    }
};
exports.updateUserProfile = updateUserProfile;
/**
 * Change current user password
 * @route PUT /api/users/me/password
 */
const changePassword = async (req, res) => {
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
        const user = await prisma_1.default.user.findUnique({
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
        const isPasswordValid = await (0, auth_1.comparePassword)(currentPassword, user.password);
        if (!isPasswordValid) {
            res.status(401).json({
                status: 'error',
                message: 'Current password is incorrect',
            });
            return;
        }
        // Hash new password
        const hashedPassword = await (0, auth_1.hashPassword)(newPassword);
        // Update password
        await prisma_1.default.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        res.status(200).json({
            status: 'success',
            message: 'Password changed successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Change password error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to change password',
        });
    }
};
exports.changePassword = changePassword;
/**
 * Get user by ID (limited info)
 * @route GET /api/users/:id
 */
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma_1.default.user.findUnique({
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
    }
    catch (error) {
        logger_1.default.error('Get user error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve user',
        });
    }
};
exports.getUserById = getUserById;
//# sourceMappingURL=user.controller.js.map