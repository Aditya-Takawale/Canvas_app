"use strict";
/**
 * Prisma client singleton to be used throughout the application
 * This prevents multiple connections to the database
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const logger_1 = __importStar(require("../utils/logger"));
// Add Prisma logging in development mode
const prismaClientSingleton = () => {
    return new client_1.PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
};
// Create or reuse the Prisma client
const prisma = global.prisma ?? prismaClientSingleton();
// Add event listeners for database logging with proper type definitions
prisma.$on('query', (e) => {
    logger_1.dbLogger.debug({
        message: 'Database query executed',
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
    });
});
prisma.$on('error', (e) => {
    logger_1.dbLogger.error({
        message: 'Prisma error occurred',
        error: e.message,
        target: e.target,
    });
    // Also log to main error logger to ensure it appears in general error logs
    logger_1.default.error('Database error:', e);
});
prisma.$on('info', (e) => {
    logger_1.dbLogger.info({
        message: 'Prisma info event',
        event: e.message,
        timestamp: new Date().toISOString(),
    });
});
prisma.$on('warn', (e) => {
    logger_1.dbLogger.warn({
        message: 'Prisma warning',
        event: e.message,
        timestamp: new Date().toISOString(),
    });
});
// Update the global variable in development for HMR
if (process.env.NODE_ENV !== 'production')
    global.prisma = prisma;
exports.default = prisma;
//# sourceMappingURL=prisma.js.map