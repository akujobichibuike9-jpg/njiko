import type { Router } from 'express';
import type { EventBus } from './events';
import type { AppConfig } from './config';
import type { Db } from './db';

export interface Logger {
  info: (msg: string, meta?: unknown) => void;
  warn: (msg: string, meta?: unknown) => void;
  error: (msg: string, meta?: unknown) => void;
}

// Everything a feature module is handed when it loads.
export interface ModuleContext {
  router: Router;     // mount your routes here
  events: EventBus;   // subscribe to / emit cross-module events
  config: AppConfig;
  db: Db;             // shared database handle
  log: Logger;
}

// The shape every module's default export must satisfy.
export interface AppModule {
  name: string;
  basePath?: string;  // defaults to /api/<name>
  register(ctx: ModuleContext): void | Promise<void>;
}
