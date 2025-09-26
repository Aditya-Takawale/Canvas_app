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
const router = (0, express_1.Router)();
// Health check route
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'API is up and running',
        timestamp: new Date(),
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