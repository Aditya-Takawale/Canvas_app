"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const auth_1 = require("../utils/auth");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Authentication middleware to protect routes
 * Verifies JWT token and adds user information to request
 */
const authenticate = (req, res, next) => {
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
        const decoded = (0, auth_1.verifyJwtToken)(token);
        // Add user info to request
        req.user = decoded;
        next();
    }
    catch (error) {
        logger_1.default.error('Authentication error:', error);
        res.status(401).json({
            status: 'error',
            message: 'Invalid or expired token. Please login again.',
        });
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=authenticate.js.map