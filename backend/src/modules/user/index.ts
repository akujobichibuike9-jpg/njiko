import { z } from 'zod';
import jwt from 'jsonwebtoken';
import type { AppModule } from '../../core/types';
import { ensureSchema, getProfile, setAddress } from './service';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-insecure-secret';

function requireAuth(req: any, res: any, next: any) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try { req.account = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid or expired session' }); }
}

const addrSchema = z.object({
  mode: z.enum(['auto', 'manual']),
  lat: z.number().optional(),
  lng: z.number().optional(),
  address: z.string().min(2).optional(),
});

const user: AppModule = {
  name: 'user',
  async register({ router, db, log }) {
    try { await ensureSchema(db); log.info('user: schema ready'); }
    catch (e) { log.warn('user: schema setup skipped', String(e)); }

    router.get('/profile', requireAuth, async (req: any, res) => {
      try { res.json({ profile: await getProfile(db, req.account.sub) }); }
      catch { res.status(503).json({ error: 'Unavailable' }); }
    });

    router.post('/profile/address', requireAuth, async (req: any, res) => {
      const parsed = addrSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
      try { res.json({ profile: await setAddress(db, req.account.sub, parsed.data as any) }); }
      catch (e: any) { if (e.status) return res.status(e.status).json({ error: e.message }); log.error('setAddress failed', String(e)); res.status(503).json({ error: 'Could not save address' }); }
    });

    log.info('user module ready');
  },
};

export default user;
