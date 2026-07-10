import type { Logger } from './types';

const t = () => new Date().toISOString();

export const logger: Logger = {
  info: (m, meta) => console.log(`[${t()}] INFO  ${m}`, meta ?? ''),
  warn: (m, meta) => console.warn(`[${t()}] WARN  ${m}`, meta ?? ''),
  error: (m, meta) => console.error(`[${t()}] ERROR ${m}`, meta ?? ''),
};
