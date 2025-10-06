// Environment configuration for the application
interface AppConfig {
  apiBaseUrl: string;
  socketUrl: string;
  environment: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

const resolvedApiBase = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const resolvedSocketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

// Warn in production if we accidentally fell back to localhost (misconfigured Vercel env vars)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  if (resolvedApiBase.includes('localhost')) {
    // eslint-disable-next-line no-console
    console.warn('[Env Warning] Using localhost backend URL in production build. Set REACT_APP_BACKEND_URL before building.');
  }
  if (resolvedSocketUrl.includes('localhost')) {
    // eslint-disable-next-line no-console
    console.warn('[Env Warning] Using localhost socket URL in production build. Set REACT_APP_SOCKET_URL before building.');
  }
}

const config: AppConfig = {
  apiBaseUrl: resolvedApiBase,
  socketUrl: resolvedSocketUrl,
  environment: process.env.REACT_APP_ENVIRONMENT || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Export individual config values for convenience
export const {
  apiBaseUrl,
  socketUrl,
  environment,
  isDevelopment,
  isProduction,
} = config;

export default config;