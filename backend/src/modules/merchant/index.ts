import { z } from 'zod';
import jwt from 'jsonwebtoken';
import type { AppModule } from '../../core/types';
import { ensureSchema, getStore, setLocation, updateProfile, setOnline } from './service';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-insecure-secret';

function requireAuth(req: any, res: any, next: any) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try { req.account = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid or expired session' }); }
}

const locSchema = z.object({ mode: z.enum(['auto', 'manual']), lat: z.number().optional(), lng: z.number().optional(), address: z.string().min(2).optional() });
const profileSchema = z.object({ name: z.string().optional(), category: z.string().optional(), payout_bank: z.string().optional(), payout_account: z.string().optional(), payout_name: z.string().optional() });

const merchant: AppModule = {
  name: 'merchant',
  async register({ router, db, log }) {
    try { await ensureSchema(db); log.info('merchant: schema ready'); }
    catch (e) { log.warn('merchant: schema setup skipped', String(e)); }

    router.get('/store', requireAuth, async (req: any, res) => {
      try { res.json({ store: await getStore(db, req.account.sub) }); }
      catch { res.status(503).json({ error: 'Unavailable' }); }
    });

    router.post('/store/location', requireAuth, async (req: any, res) => {
      const parsed = locSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
      try { res.json({ store: await setLocation(db, req.account.sub, parsed.data as any) }); }
      catch (e: any) { if (e.status) return res.status(e.status).json({ error: e.message }); log.error('setLocation failed', String(e)); res.status(503).json({ error: 'Could not save location' }); }
    });

    router.patch('/store', requireAuth, async (req: any, res) => {
      const parsed = profileSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
      try {
        const store = await updateProfile(db, req.account.sub, parsed.data);
        if (!store) return res.status(404).json({ error: 'Set up your store first' });
        res.json({ store });
      } catch (e) { log.error('updateProfile failed', String(e)); res.status(503).json({ error: 'Could not save' }); }
    });

    router.patch('/store/online', requireAuth, async (req: any, res) => {
      const online = !!req.body?.online;
      try {
        const store = await setOnline(db, req.account.sub, online);
        if (!store) return res.status(404).json({ error: 'Set up your store first' });
        res.json({ store });
      } catch (e) { log.error('setOnline failed', String(e)); res.status(503).json({ error: 'Could not update' }); }
    });

    log.info('merchant module ready');
  },
};

export default merchant;
