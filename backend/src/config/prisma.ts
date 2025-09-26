/**
 * Prisma client singleton to be used throughout the application
 * This prevents multiple connections to the database
 */

import { PrismaClient, Prisma } from '@prisma/client';
import logger, { dbLogger } from '../utils/logger';

// Add Prisma logging in development mode
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

// Define a global type for Prisma client
declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Create or reuse the Prisma client
const prisma = global.prisma ?? prismaClientSingleton();

// Add event listeners for database logging with proper type definitions
prisma.$on('query' as never, (e: Prisma.QueryEvent) => {
  dbLogger.debug({
    message: 'Database query executed',
    query: e.query,
    params: e.params,
    duration: `${e.duration}ms`,
  });
});

prisma.$on('error' as never, (e: Prisma.LogEvent) => {
  dbLogger.error({
    message: 'Prisma error occurred',
    error: e.message,
    target: e.target,
  });
  
  // Also log to main error logger to ensure it appears in general error logs
  logger.error('Database error:', e);
});

prisma.$on('info' as never, (e: Prisma.LogEvent) => {
  dbLogger.info({
    message: 'Prisma info event',
    event: e.message,
    timestamp: new Date().toISOString(),
  });
});

prisma.$on('warn' as never, (e: Prisma.LogEvent) => {
  dbLogger.warn({
    message: 'Prisma warning',
    event: e.message,
    timestamp: new Date().toISOString(),
  });
});

// Update the global variable in development for HMR
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default prisma;