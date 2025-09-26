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
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const errorHandler_1 = require("./middleware/errorHandler");
const notFoundHandler_1 = require("./middleware/notFoundHandler");
const requestLogger_1 = require("./middleware/requestLogger");
const index_1 = require("./socket/index");
const swagger_1 = require("./config/swagger");
const routes_1 = __importDefault(require("./routes"));
const logger_1 = __importStar(require("./utils/logger"));
// Load environment variables
dotenv_1.default.config();
// Initialize Express app
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Configurable body size limit for large canvas payloads
const MAX_BODY_SIZE = process.env.MAX_BODY_SIZE || '25mb';
// Initialize Socket.io
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST'],
        credentials: true,
    },
    // Allow larger messages if needed (e.g., large events)
    maxHttpBufferSize: 5 * 1024 * 1024, // 5MB
});
// Configure Socket.io
(0, index_1.configureSocket)(io);
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
}));
app.use((0, helmet_1.default)());
// Use morgan for concise request logging to console
app.use((0, morgan_1.default)('dev', { stream: logger_1.stream }));
// Parse request body (increase limits for large canvas state)
app.use(express_1.default.json({ limit: MAX_BODY_SIZE }));
app.use(express_1.default.urlencoded({ extended: true, limit: MAX_BODY_SIZE }));
// Apply our custom request logger
app.use(requestLogger_1.requestLogger);
// Setup Swagger Documentation
(0, swagger_1.setupSwagger)(app);
// Root route
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Canvas App API Server',
        version: '1.0.0',
        documentation: '/api-docs',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            rooms: '/api/rooms',
            canvas: '/api/canvas',
            users: '/api/users'
        }
    });
});
// API Routes
app.use('/api', routes_1.default);
// Error handling middleware
app.use(notFoundHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    logger_1.default.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
    logger_1.default.error('UNHANDLED REJECTION! Shutting down...');
    logger_1.default.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});
exports.default = server;
//# sourceMappingURL=server.js.map