import type { AppModule } from '../../core/types';
import { listStores, getStoreWithMenu } from './service';

// Public storefront routes — customers browse without needing to be that merchant.
const catalog: AppModule = {
  name: 'catalog',
  async register({ router, db, log }) {
    router.get('/stores', async (_req, res) => {
      try { res.json({ stores: await listStores(db) }); }
      catch { res.status(503).json({ error: 'Unavailable' }); }
    });

    router.get('/stores/:id', async (req, res) => {
      try {
        const data = await getStoreWithMenu(db, req.params.id);
        if (!data) return res.status(404).json({ error: 'Store not found' });
        res.json(data);
      } catch { res.status(503).json({ error: 'Unavailable' }); }
    });

    log.info('catalog module ready');
  },
};

export default catalog;
