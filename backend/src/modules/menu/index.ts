import { z } from 'zod';
import jwt from 'jsonwebtoken';
import type { AppModule } from '../../core/types';
import { ensureSchema, listItems, createItem, setAvailable, deleteItem } from './service';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-insecure-secret';

// Self-contained auth guard (no dependency on other modules).
function requireAuth(req: any, res: any, next: any) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try { req.account = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid or expired session' }); }
}

const createSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  available: z.boolean().optional(),
  image_url: z.string().url().nullable().optional(),
});

const menu: AppModule = {
  name: 'menu',
  async register({ router, db, log }) {
    try { await ensureSchema(db); log.info('menu: schema ready'); }
    catch (e) { log.warn('menu: schema setup skipped', String(e)); }

    router.get('/', requireAuth, async (req: any, res) => {
      try { res.json({ items: await listItems(db, req.account.sub) }); }
      catch { res.status(503).json({ error: 'Unavailable' }); }
    });

    router.post('/', requireAuth, async (req: any, res) => {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
      try { res.status(201).json({ item: await createItem(db, req.account.sub, parsed.data) }); }
      catch (e) { log.error('create item failed', String(e)); res.status(503).json({ error: 'Could not add item' }); }
    });

    router.patch('/:id/available', requireAuth, async (req: any, res) => {
      const available = !!req.body?.available;
      try {
        const item = await setAvailable(db, req.account.sub, req.params.id, available);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json({ item });
      } catch { res.status(503).json({ error: 'Could not update item' }); }
    });

    router.delete('/:id', requireAuth, async (req: any, res) => {
      try {
        const ok = await deleteItem(db, req.account.sub, req.params.id);
        if (!ok) return res.status(404).json({ error: 'Item not found' });
        res.json({ ok: true });
      } catch { res.status(503).json({ error: 'Could not delete item' }); }
    });

    log.info('menu module ready');
  },
};

export default menu;
