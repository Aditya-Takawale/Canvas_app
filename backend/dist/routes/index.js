"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const room_routes_1 = __importDefault(require("./room.routes"));
const canvas_routes_1 = __importDefault(require("./canvas.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const authenticate_1 = require("../middleware/authenticate");
const prisma_1 = __importDefault(require("../config/prisma"));
const router = (0, express_1.Router)();
// Health check route
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'API is up and running',
        timestamp: new Date(),
    });
});
// Temporary DB health route (can be removed after verification)
router.get('/health/db', async (req, res) => {
    try {
        // Simple query to ensure DB is reachable
        await prisma_1.default.$queryRaw `SELECT 1`;
        const userCount = await prisma_1.default.user.count();
        res.status(200).json({
            status: 'success',
            database: 'reachable',
            userCount,
            timestamp: new Date(),
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            database: 'unreachable',
            message: error?.message || 'Database health check failed',
            timestamp: new Date(),
        });
    }
});
// Optional debug route (must set ENABLE_DEBUG_ROUTES=true in backend env)
router.get('/debug/env', (req, res) => {
    if (process.env.ENABLE_DEBUG_ROUTES !== 'true') {
        return res.status(404).json({ status: 'error', message: 'Not found' });
    }
    res.status(200).json({
        status: 'success',
        data: {
            nodeEnv: process.env.NODE_ENV,
            corsOrigin: process.env.CORS_ORIGIN,
            port: process.env.PORT,
            hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
            hasJwtSecret: Boolean(process.env.JWT_SECRET),
            // Do NOT send actual secrets
            timestamp: new Date(),
        }
    });
});
// Public routes
router.use('/auth', auth_routes_1.default);
// Protected routes - require authentication
router.use('/rooms', authenticate_1.authenticate, room_routes_1.default);
router.use('/canvas', authenticate_1.authenticate, canvas_routes_1.default);
router.use('/users', authenticate_1.authenticate, user_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map