import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface ErrorWithStatus extends Error {
  statusCode?: number;
  code?: string;
  path?: string;
  errors?: any[];
}

export const errorHandler = (
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Server Error';
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const path = req.originalUrl;
  const method = req.method;
  const ipAddress = req.ip;
  const userId = (req as any).user?.id || 'anonymous';
  
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
  logger.error(errorDetails);

  // Send appropriate response to client
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    // Only include stack trace in development
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
};