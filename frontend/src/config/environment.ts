// Environment configuration for the application
interface AppConfig {
  apiBaseUrl: string;
  socketUrl: string;
  environment: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

const config: AppConfig = {
  apiBaseUrl: process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000',
  socketUrl: process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000',
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