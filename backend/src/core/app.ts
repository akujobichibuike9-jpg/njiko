import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { EventBus } from './events';
import { config } from './config';
import { createDb } from './db';
import { loadModules } from './registry';
import { logger } from './logger';

export async function createApp() {
  const app = express();
  app.set('trust proxy', true);
  app.use(cors());
  app.use(express.json());

  const events = new EventBus();
  const db = createDb();
  if (db.ready) logger.info('Database: connection configured');
  else logger.warn('Database: no DATABASE_URL set — DB-backed features disabled until you add one');

  app.get('/', (_req, res) => res.json({ ok: true, service: 'delivery-backend' }));

  await loadModules(app, events, config, db, logger); // every feature mounts itself

  return { app, server: createServer(app), events };
}
