import { createApp } from './core/app';
import { config } from './core/config';
import { logger } from './core/logger';

const { server } = await createApp();
server.listen(config.port, () => logger.info(`Listening on http://localhost:${config.port}`));
