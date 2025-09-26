import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// Declare the DailyRotateFile transport type
declare module 'winston' {
  interface transports {
    DailyRotateFile: any;
  }
}

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create subdirectories for different log types
const errorLogsDir = path.join(logsDir, 'error');
const dbLogsDir = path.join(logsDir, 'database');
const authLogsDir = path.join(logsDir, 'auth');
const accessLogsDir = path.join(logsDir, 'access');
const socketLogsDir = path.join(logsDir, 'socket');

// Create directories if they don't exist
[errorLogsDir, dbLogsDir, authLogsDir, accessLogsDir, socketLogsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Common logger format
const commonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for readable logs in terminal
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info as any;
    return `${timestamp} ${level}: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    }`;
  })
);

// Create file transport with rotation for database logs
const databaseRotateTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/database/%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
});

// Create file transport with rotation for authentication logs
const authRotateTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/auth/%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
});

// Create file transport with rotation for error logs
const errorRotateTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/error/%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  level: 'error',
});

// Create file transport with rotation for access logs
const accessRotateTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/access/%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
});

// Create file transport with rotation for socket logs
const socketRotateTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/socket/%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
});

// Main general-purpose logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: commonFormat,
  defaultMeta: { service: 'canvas-app-backend' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new winston.transports.File({ 
      filename: path.join(errorLogsDir, 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log') 
    }),
    errorRotateTransport,
  ],
});

// Database-specific logger
const dbLogger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: commonFormat,
  defaultMeta: { service: 'canvas-app-database' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    databaseRotateTransport,
  ],
});

// Authentication-specific logger
const authLogger = winston.createLogger({
  level: 'info',
  format: commonFormat,
  defaultMeta: { service: 'canvas-app-auth' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    authRotateTransport,
  ],
});

// HTTP request logger
const httpLogger = winston.createLogger({
  level: 'info',
  format: commonFormat,
  defaultMeta: { service: 'canvas-app-http' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    accessRotateTransport,
  ],
});

// Socket communication logger
const socketLogger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: commonFormat,
  defaultMeta: { service: 'canvas-app-socket' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    socketRotateTransport,
  ],
});

// Create a stream object for morgan integration
export const stream = {
  write: (message: string) => {
    httpLogger.info(message.trim());
  },
};

export { dbLogger, authLogger, httpLogger, socketLogger };
export default logger;