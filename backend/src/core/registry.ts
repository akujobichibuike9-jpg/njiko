import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Router, type Express } from 'express';
import type { EventBus } from './events';
import type { AppConfig } from './config';
import type { Db } from './db';
import type { AppModule, Logger } from './types';

const here = dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = join(here, '..', 'modules');

// Walks src/modules/*, imports each module's default export, gives it a router,
// and mounts it. To add a feature you drop a folder here — nothing else changes.
export async function loadModules(
  app: Express, events: EventBus, config: AppConfig, db: Db, log: Logger,
): Promise<void> {
  if (!existsSync(MODULES_DIR)) return;

  const dirs = readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory());

  for (const dir of dirs) {
    const ts = join(MODULES_DIR, dir.name, 'index.ts');
    const js = join(MODULES_DIR, dir.name, 'index.js');
    const entry = existsSync(ts) ? ts : existsSync(js) ? js : null;
    if (!entry) continue;

    const mod: AppModule | undefined = (await import(pathToFileURL(entry).href)).default;
    if (!mod?.register) { log.warn(`Skipped "${dir.name}" (no default module export)`); continue; }

    const router = Router();
    await mod.register({ router, events, config, db, log });
    const base = mod.basePath ?? `/api/${mod.name}`;
    app.use(base, router);
    log.info(`Loaded module "${mod.name}" -> ${base}`);
  }
}
