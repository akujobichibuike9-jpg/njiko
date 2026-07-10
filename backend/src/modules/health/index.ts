import type { AppModule } from '../../core/types';

// A module is just an object with a name and a register() function.
// Copy this folder, rename it, and it auto-mounts at /api/<name>.
const health: AppModule = {
  name: 'health',
  register({ router, log }) {
    router.get('/', (_req, res) =>
      res.json({ status: 'ok', module: 'health', time: new Date().toISOString() }));
    log.info('health module ready');
  },
};

export default health;
