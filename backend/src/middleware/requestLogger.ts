import { Request, Response, NextFunction } from 'express';
import { httpLogger } from '../utils/logger';
import { Socket } from 'net';

/**
 * Middleware to log HTTP requests with detailed information
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Add response finished listener instead of monkey-patching res.end
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    // Extract important request information
    const {
      method,
      originalUrl,
      ip,
      headers,
      body,
      params,
      query,
    } = req;
    
    const userId = (req as any).user?.id || 'anonymous';
    const userAgent = headers['user-agent'] || 'Unknown';
    const contentType = headers['content-type'];
    const referrer = headers['referer'] || headers['referrer'];
    
    // Log request with structured data
    httpLogger.info({
      message: `${method} ${originalUrl}`,
      method,
      path: originalUrl,
      userId,
      ipAddress: ip,
      userAgent,
      contentType,
      referrer,
      responseTime: `${responseTime}ms`,
      statusCode: res.statusCode,
      responseContentType: res.getHeader('content-type'),
      // Only include body for non-GET requests and if not containing sensitive data
      requestBody: method !== 'GET' && !originalUrl.includes('/auth') ? body : undefined,
      requestParams: params,
      requestQuery: query,
      timestamp: new Date().toISOString(),
    });
  });
  
  next();
};