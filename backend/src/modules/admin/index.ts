import jwt from 'jsonwebtoken';
import type { AppModule } from '../../core/types';
import { ensureSchema, overview, listAccounts, accountDetail, setBlocked, deleteAccount, getMaintenance, setMaintenance, allOrders, globalSearch, adminOrderDetail, fleet } from './service';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-insecure-secret';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

function requireAdmin(req: any, res: any, next: any) {
  const h = req.headers.authorization ?? '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!tok) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const p: any = jwt.verify(tok, JWT_SECRET);
    if (p.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.admin = p; next();
  } catch { res.status(401).json({ error: 'Invalid session' }); }
}

const admin: AppModule = {
  name: 'admin',
  async register({ router, db, log }) {
    try { await ensureSchema(db); log.info('admin: schema ready'); }
    catch (e) { log.warn('admin: schema setup skipped', String(e)); }

    // public — the apps poll this to know if the platform is in maintenance
    router.get('/status', async (_req, res) => {
      try { res.json({ maintenance: await getMaintenance(db) }); } catch { res.json({ maintenance: false }); }
    });

    router.post('/login', async (req, res) => {
      const { username, password } = req.body ?? {};
      if (!ADMIN_USERNAME || !ADMIN_PASSWORD) return res.status(503).json({ error: 'Admin not configured (set ADMIN_USERNAME / ADMIN_PASSWORD)' });
      if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong username or password' });
      const token = jwt.sign({ sub: 'root', role: 'admin', username }, JWT_SECRET, { expiresIn: '12h' });
      res.json({ token, username });
    });

    router.get('/overview', requireAdmin, async (_req, res) => {
      try { res.json(await overview(db)); } catch { res.status(503).json({ error: 'Unavailable' }); }
    });
    router.get('/accounts', requireAdmin, async (req: any, res) => {
      try { res.json({ accounts: await listAccounts(db, (req.query.role as string) || null, (req.query.q as string) || null, (req.query.sort as string) || null) }); } catch { res.status(503).json({ error: 'Unavailable' }); }
    });
    router.get('/search', requireAdmin, async (req: any, res) => {
      const q = (req.query.q as string) || '';
      if (!q.trim()) return res.json({ accounts: [], orders: [] });
      try { res.json(await globalSearch(db, q)); } catch { res.status(503).json({ error: 'Unavailable' }); }
    });
    router.get('/orders', requireAdmin, async (req: any, res) => {
      try { res.json({ orders: await allOrders(db, (req.query.group as string) || null, (req.query.q as string) || null) }); } catch { res.status(503).json({ error: 'Unavailable' }); }
    });
    router.get('/fleet', requireAdmin, async (_req: any, res) => {
      try { res.json({ riders: await fleet(db) }); } catch { res.status(503).json({ error: 'Unavailable' }); }
    });
    router.get('/orders/:id', requireAdmin, async (req: any, res) => {
      try { const d = await adminOrderDetail(db, req.params.id); if (!d) return res.status(404).json({ error: 'Not found' }); res.json(d); } catch { res.status(503).json({ error: 'Unavailable' }); }
    });
    router.get('/accounts/:id', requireAdmin, async (req: any, res) => {
      try { const d = await accountDetail(db, req.params.id); if (!d) return res.status(404).json({ error: 'Not found' }); res.json(d); } catch { res.status(503).json({ error: 'Unavailable' }); }
    });
    router.post('/accounts/:id/block', requireAdmin, async (req: any, res) => {
      try { await setBlocked(db, req.params.id, true); res.json({ ok: true }); } catch { res.status(503).json({ error: 'Failed' }); }
    });
    router.post('/accounts/:id/unblock', requireAdmin, async (req: any, res) => {
      try { await setBlocked(db, req.params.id, false); res.json({ ok: true }); } catch { res.status(503).json({ error: 'Failed' }); }
    });
    router.delete('/accounts/:id', requireAdmin, async (req: any, res) => {
      try { await deleteAccount(db, req.params.id); res.json({ ok: true }); } catch { res.status(503).json({ error: 'Failed' }); }
    });

    router.post('/maintenance', requireAdmin, async (req: any, res) => {
      try { await setMaintenance(db, !!req.body?.on); res.json({ maintenance: !!req.body?.on }); } catch { res.status(503).json({ error: 'Failed' }); }
    });

    log.info('admin module ready');
  },
};

export default admin;
