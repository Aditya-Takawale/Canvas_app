/* Frontend logging utility with level gating.
 * Usage:
 * import log from '@/utils/logger';
 * log.debug('message', meta);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const envLevel = ((): LogLevel => {
  const raw = (process.env.REACT_APP_LOG_LEVEL || '').toLowerCase();
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error' || raw === 'silent') return raw;
  return process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
})();

const order: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];
const enabled = (lvl: LogLevel) => order.indexOf(lvl) >= order.indexOf(envLevel) && envLevel !== 'silent';

const format = (level: string, args: any[]) => {
  const ts = new Date().toISOString();
  return [`[%c${level.toUpperCase()}%c][${ts}]`, 'color:#6366f1;font-weight:bold', 'color:inherit', ...args];
};

const logger = {
  level: envLevel,
  debug: (...args: any[]) => enabled('debug') && console.debug(...format('debug', args)),
  info: (...args: any[]) => enabled('info') && console.info(...format('info', args)),
  warn: (...args: any[]) => enabled('warn') && console.warn(...format('warn', args)),
  error: (...args: any[]) => enabled('error') && console.error(...format('error', args)),
};

export default logger;
