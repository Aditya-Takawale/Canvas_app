"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Server Error';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const path = req.originalUrl;
    const method = req.method;
    const ipAddress = req.ip;
    const userId = req.user?.id || 'anonymous';
    // Capture detailed error information
    const errorDetails = {
        message: `${statusCode} - ${message} - ${path} - ${method} - ${ipAddress}`,
        statusCode,
        path,
        method,
        ipAddress,
        userId,
        userAgent,
        errorName: err.name,
        errorCode: err.code,
        stack: err.stack,
        errorPath: err.path,
        validationErrors: err.errors,
        requestBody: method !== 'GET' ? req.body : undefined,
        requestQuery: req.query,
        requestParams: req.params,
        timestamp: new Date().toISOString(),
    };
    // Log structured error data
    logger_1.default.error(errorDetails);
    // Send appropriate response to client
    res.status(statusCode).json({
        status: 'error',
        statusCode,
        message,
        // Only include stack trace in development
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map