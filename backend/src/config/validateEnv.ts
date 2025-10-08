import logger from '../utils/logger';

interface EnvSpec {
  key: string;
  required?: boolean;
  warnOnly?: boolean;
  validate?: (value: string) => boolean;
  example?: string;
}

const SPECS: EnvSpec[] = [
  { key: 'NODE_ENV', required: true },
  { key: 'PORT', required: false },
  { key: 'DATABASE_URL', required: true },
  { key: 'JWT_SECRET', required: true, validate: v => v.length >= 24, example: 'at-least-24-chars-secret' },
  { key: 'CORS_ORIGIN', required: false },
  { key: 'MAX_BODY_SIZE', required: false },
];

export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === 'production';
  let hasErrors = false;
  SPECS.forEach(spec => {
    const val = process.env[spec.key];
    if (!val) {
      if (spec.required) {
        logger.error(`[env] Missing required env var: ${spec.key}`);
        hasErrors = true;
      }
      return;
    }
    if (spec.validate && !spec.validate(val)) {
      logger.error(`[env] Validation failed for ${spec.key}${spec.example ? ` (example: ${spec.example})` : ''}`);
      hasErrors = true;
    }
    if (spec.key === 'JWT_SECRET' && isProd && val === 'fallback_secret') {
      logger.error('[env] JWT_SECRET uses insecure fallback in production');
      hasErrors = true;
    }
  });

  if (hasErrors) {
    logger.error('[env] Environment validation failed. Exiting.');
    process.exit(1);
  }
  logger.info('[env] Environment variables validated');
}

export default validateEnv;