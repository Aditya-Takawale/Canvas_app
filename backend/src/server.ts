import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import validateEnv from './config/validateEnv'; // pending relocation to common/config
import { errorHandler, notFoundHandler, requestLogger } from './app/common/middleware';
import { configureSocket } from './socket';
import { setupSwagger } from './config/swagger'; // pending relocation
import apiRoutes from './app/domains'; // new domain router aggregator
import logger, { stream } from './utils/logger';

// Load environment variables then validate required keys
dotenv.config();
validateEnv();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configurable body size limit for large canvas payloads
const MAX_BODY_SIZE = process.env.MAX_BODY_SIZE || '25mb';

// Prepare allowed origins (support comma separated list in CORS_ORIGIN)
const rawOrigins = process.env.CORS_ORIGIN;
let allowedOrigins: (string | RegExp)[] = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://canvas-app-o5tp.vercel.app',
  /^https:\/\/.*\.onrender\.com$/
];
if (rawOrigins) {
  const parsed = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);
  if (parsed.length) {
    allowedOrigins = parsed;
  }
}

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // non-browser or same-origin
      if (allowedOrigins.some(o => (o instanceof RegExp ? o.test(origin) : o === origin))) {
        return callback(null, true);
      }
      return callback(new Error('CORS not allowed: ' + origin));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 5 * 1024 * 1024,
});

// Configure Socket.io
configureSocket(io);

// CORS setup - make sure to handle OPTIONS preflight
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => (o instanceof RegExp ? o.test(origin) : o === origin))) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS
app.use(cors(corsOptions));

// Handle OPTIONS preflight requests explicitly
app.options('*', cors(corsOptions));

// Configure Helmet with custom CSP for cross-origin requests
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'https://canvas-app-o5tp.vercel.app', 'https://canvasapp-production.up.railway.app', 'wss://canvasapp-production.up.railway.app'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  }
}));

// Use morgan for concise request logging to console
app.use(morgan('dev', { stream }));

// Parse request body (increase limits for large canvas state)
app.use(express.json({ limit: MAX_BODY_SIZE }));
app.use(express.urlencoded({ extended: true, limit: MAX_BODY_SIZE }));

// Apply our custom request logger
app.use(requestLogger);

// Setup Swagger Documentation
setupSwagger(app);

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
app.use('/api', apiRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  logger.info(`Database URL configured: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('UNHANDLED REJECTION! Shutting down...');
  logger.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

export default server;