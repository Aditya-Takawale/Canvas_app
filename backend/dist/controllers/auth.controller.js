"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.getCurrentUser = exports.refreshToken = exports.login = exports.register = void 0;
const auth_1 = require("../utils/auth");
const logger_1 = __importStar(require("../utils/logger"));
const prisma_1 = __importDefault(require("../config/prisma"));
/**
 * Register a new user
 * @route POST /api/auth/register
 */
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const ipAddress = req.ip;
        const userAgent = req.headers['user-agent'] || 'Unknown';
        // Log registration attempt
        logger_1.authLogger.info({
            message: 'User registration attempt',
            username,
            email,
            ipAddress,
            userAgent,
            timestamp: new Date().toISOString()
        });
        // Check if user already exists
        const existingUser = await prisma_1.default.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username },
                ],
            },
        });
        if (existingUser) {
            // Log failed registration - user already exists
            logger_1.authLogger.warn({
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
        const hashedPassword = await (0, auth_1.hashPassword)(password);
        // Create new user
        const newUser = await prisma_1.default.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                role: 'user', // Default role
            },
        });
        // Generate JWT token
        const token = (0, auth_1.generateJwtToken)(newUser);
        // Return user data and token (excluding password)
        const { password: _, ...userWithoutPassword } = newUser;
        // Log successful registration
        logger_1.authLogger.info({
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
    }
    catch (error) {
        // Log registration error
        logger_1.authLogger.error({
            message: 'Registration error',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });
        // Also log to main logger for error monitoring
        logger_1.default.error('Registration error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to register user',
        });
    }
};
exports.register = register;
/**
 * Login user
 * @route POST /api/auth/login
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const ipAddress = req.ip;
        const userAgent = req.headers['user-agent'] || 'Unknown';
        // Log login attempt
        logger_1.authLogger.info({
            message: 'Login attempt',
            email,
            ipAddress,
            userAgent,
            timestamp: new Date().toISOString()
        });
        // Find user by email
        const user = await prisma_1.default.user.findUnique({
            where: { email },
        });
        if (!user) {
            // Log failed login - user not found
            logger_1.authLogger.warn({
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
        const isPasswordValid = await (0, auth_1.comparePassword)(password, user.password);
        if (!isPasswordValid) {
            // Log failed login - invalid password
            logger_1.authLogger.warn({
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
        const token = (0, auth_1.generateJwtToken)(user);
        // Return user data and token (excluding password)
        const { password: _, ...userWithoutPassword } = user;
        // Log successful login
        logger_1.authLogger.info({
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
    }
    catch (error) {
        // Log login error
        logger_1.authLogger.error({
            message: 'Login error',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });
        // Also log to main logger for error monitoring
        logger_1.default.error('Login error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to login',
        });
    }
};
exports.login = login;
/**
 * Refresh JWT token
 * @route POST /api/auth/refresh
 */
const refreshToken = async (req, res) => {
    try {
        // This functionality would typically involve refresh tokens
        // For simplicity, we're just re-validating the current token and generating a new one
        const { userId } = req.body;
        const ipAddress = req.ip;
        const userAgent = req.headers['user-agent'] || 'Unknown';
        // Log token refresh attempt
        logger_1.authLogger.info({
            message: 'Token refresh attempt',
            userId,
            ipAddress,
            userAgent,
            timestamp: new Date().toISOString()
        });
        if (!userId) {
            // Log failed token refresh - missing userId
            logger_1.authLogger.warn({
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
        const user = await prisma_1.default.user.findUnique({
            where: { id: parseInt(userId) },
        });
        if (!user) {
            // Log failed token refresh - user not found
            logger_1.authLogger.warn({
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
        const token = (0, auth_1.generateJwtToken)(user);
        // Log successful token refresh
        logger_1.authLogger.info({
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
    }
    catch (error) {
        // Log token refresh error
        logger_1.authLogger.error({
            message: 'Token refresh error',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });
        // Also log to main logger for error monitoring
        logger_1.default.error('Token refresh error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to refresh token',
        });
    }
};
exports.refreshToken = refreshToken;
/**
 * Get current user information
 * @route GET /api/auth/me
 */
const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                status: 'error',
                message: 'Not authenticated',
            });
            return;
        }
        const user = await prisma_1.default.user.findUnique({
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
    }
    catch (error) {
        logger_1.default.error('Get current user error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get user information',
        });
    }
};
exports.getCurrentUser = getCurrentUser;
/**
 * Logout user
 * @route POST /api/auth/logout
 */
const logout = async (req, res) => {
    // In a stateless JWT setup, the client simply discards the token
    // For extra security, we could implement a token blocklist
    // Get user information from authenticated request
    const userId = req.user?.id;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    // Log logout
    if (userId) {
        logger_1.authLogger.info({
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
exports.logout = logout;
//# sourceMappingURL=auth.controller.js.map