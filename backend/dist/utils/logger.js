"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketLogger = exports.httpLogger = exports.authLogger = exports.dbLogger = exports.stream = void 0;
const winston_1 = __importDefault(require("winston"));
require("winston-daily-rotate-file");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Ensure logs directory exists
const logsDir = path_1.default.join(process.cwd(), 'logs');
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
// Create subdirectories for different log types
const errorLogsDir = path_1.default.join(logsDir, 'error');
const dbLogsDir = path_1.default.join(logsDir, 'database');
const authLogsDir = path_1.default.join(logsDir, 'auth');
const accessLogsDir = path_1.default.join(logsDir, 'access');
const socketLogsDir = path_1.default.join(logsDir, 'socket');
// Create directories if they don't exist
[errorLogsDir, dbLogsDir, authLogsDir, accessLogsDir, socketLogsDir].forEach(dir => {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
});
// Common logger format
const commonFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json());
// Console format for readable logs in terminal
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
}));
// Create file transport with rotation for database logs
const databaseRotateTransport = new winston_1.default.transports.DailyRotateFile({
    filename: 'logs/database/%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
});
// Create file transport with rotation for authentication logs
const authRotateTransport = new winston_1.default.transports.DailyRotateFile({
    filename: 'logs/auth/%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
});
// Create file transport with rotation for error logs
const errorRotateTransport = new winston_1.default.transports.DailyRotateFile({
    filename: 'logs/error/%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level: 'error',
});
// Create file transport with rotation for access logs
const accessRotateTransport = new winston_1.default.transports.DailyRotateFile({
    filename: 'logs/access/%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
});
// Create file transport with rotation for socket logs
const socketRotateTransport = new winston_1.default.transports.DailyRotateFile({
    filename: 'logs/socket/%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
});
// Main general-purpose logger
const logger = winston_1.default.createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    format: commonFormat,
    defaultMeta: { service: 'canvas-app-backend' },
    transports: [
        new winston_1.default.transports.Console({
            format: consoleFormat,
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(errorLogsDir, 'error.log'),
            level: 'error'
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'combined.log')
        }),
        errorRotateTransport,
    ],
});
// Database-specific logger
const dbLogger = winston_1.default.createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    format: commonFormat,
    defaultMeta: { service: 'canvas-app-database' },
    transports: [
        new winston_1.default.transports.Console({
            format: consoleFormat,
        }),
        databaseRotateTransport,
    ],
});
exports.dbLogger = dbLogger;
// Authentication-specific logger
const authLogger = winston_1.default.createLogger({
    level: 'info',
    format: commonFormat,
    defaultMeta: { service: 'canvas-app-auth' },
    transports: [
        new winston_1.default.transports.Console({
            format: consoleFormat,
        }),
        authRotateTransport,
    ],
});
exports.authLogger = authLogger;
// HTTP request logger
const httpLogger = winston_1.default.createLogger({
    level: 'info',
    format: commonFormat,
    defaultMeta: { service: 'canvas-app-http' },
    transports: [
        new winston_1.default.transports.Console({
            format: consoleFormat,
        }),
        accessRotateTransport,
    ],
});
exports.httpLogger = httpLogger;
// Socket communication logger
const socketLogger = winston_1.default.createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    format: commonFormat,
    defaultMeta: { service: 'canvas-app-socket' },
    transports: [
        new winston_1.default.transports.Console({
            format: consoleFormat,
        }),
        socketRotateTransport,
    ],
});
exports.socketLogger = socketLogger;
// Create a stream object for morgan integration
exports.stream = {
    write: (message) => {
        httpLogger.info(message.trim());
    },
};
exports.default = logger;
//# sourceMappingURL=logger.js.map