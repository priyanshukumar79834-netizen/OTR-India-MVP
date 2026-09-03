/**
 * Minimal structured logger for the prototype.
 *
 * Rule (MASTER_SPECIFICATION.md §17, §24): never log sensitive content —
 * passwords, tokens, full documents, raw request bodies. Log event types,
 * references, and outcomes only.
 */
type LogFields = Record<string, unknown>;

function write(level: 'info' | 'warn' | 'error', message: string, fields?: LogFields) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...fields,
  };
  // eslint-disable-next-line no-console
  console[level === 'info' ? 'log' : level](JSON.stringify(entry));
}

export const logger = {
  info: (message: string, fields?: LogFields) => write('info', message, fields),
  warn: (message: string, fields?: LogFields) => write('warn', message, fields),
  error: (message: string, fields?: LogFields) => write('error', message, fields),
};
