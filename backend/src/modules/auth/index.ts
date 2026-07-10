import { z } from 'zod';
import type { AppModule } from '../../core/types';
import {
  ensureSchema, createAccount, login, getAccount, requireAuth, updateAccount, requestReset, resetPassword,
} from './service';
import { sendEmail, resetEmailHtml } from '../../core/email';

const roles = ['user', 'merchant', 'rider', 'admin'] as const;

const signupSchema = z.object({
  role: z.enum(roles),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
  password: z.string().min(6),
  deviceFingerprint: z.string().optional(),
}).refine((d) => d.email || d.phone, { message: 'Email or phone is required' });

const loginSchema = z.object({
  role: z.enum(roles),
  identifier: z.string().min(3),
  password: z.string().min(1),
});

function ipOf(req: any): string | null {
  const fwd = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim();
  return fwd || req.ip || req.socket?.remoteAddress || null;
}

const auth: AppModule = {
  name: 'auth',
  async register({ router, db, events, log }) {
    try {
      await ensureSchema(db);
      log.info('auth: schema ready');
    } catch (e) {
      log.warn('auth: schema setup skipped — set DATABASE_URL and restart', String(e));
    }

    router.post('/signup', async (req, res) => {
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
      try {
        const out = await createAccount(db, { ...parsed.data, ip: ipOf(req) });
        await events.emit('account.created', out.account);
        res.status(201).json(out);
      } catch (e: any) {
        if (e.code === '23505') return res.status(409).json({ error: 'An account with those details already exists' });
        if (e.status) return res.status(e.status).json({ error: e.message });
        log.error('signup failed', String(e));
        res.status(503).json({ error: 'Signup unavailable — is the database connected?' });
      }
    });

    router.post('/login', async (req, res) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
      try {
        res.json(await login(db, parsed.data));
      } catch (e: any) {
        if (e.status) return res.status(e.status).json({ error: e.message });
        log.error('login failed', String(e));
        res.status(503).json({ error: 'Login unavailable — is the database connected?' });
      }
    });

    router.get('/me', requireAuth, async (req: any, res) => {
      try {
        const account = await getAccount(db, req.account.sub);
        if (!account) return res.status(404).json({ error: 'Account not found' });
        res.json({ account });
      } catch {
        res.status(503).json({ error: 'Unavailable' });
      }
    });

    router.patch('/me', requireAuth, async (req: any, res) => {
      const parsed = z.object({ name: z.string().min(1).optional(), phone: z.string().min(3).optional() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
      try {
        const account = await updateAccount(db, req.account.sub, parsed.data);
        if (!account) return res.status(404).json({ error: 'Account not found' });
        res.json({ account });
      } catch (e: any) {
        if (e.code === '23505') return res.status(409).json({ error: 'That phone is already in use' });
        res.status(503).json({ error: 'Could not update' });
      }
    });

    const APP_URL = process.env.APP_URL ?? 'http://localhost:5180';
    const resetRoles = ['user', 'merchant', 'rider'] as const;

    router.post('/forgot', async (req, res) => {
      const parsed = z.object({ role: z.enum(resetRoles), email: z.string().email() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email address' });
      try {
        const result = await requestReset(db, parsed.data.role, parsed.data.email);
        if (result) {
          const link = `${APP_URL}/reset?token=${result.token}`;
          await sendEmail({ to: parsed.data.email, subject: 'Reset your password', html: resetEmailHtml(link, parsed.data.role) });
        }
      } catch (e) { log.warn('forgot-password failed', String(e)); }
      // Always generic — never reveal whether an account exists.
      res.json({ ok: true, message: 'If that email is registered, a reset link is on its way.' });
    });

    router.post('/reset', async (req, res) => {
      const parsed = z.object({ token: z.string().min(10), password: z.string().min(6) }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      try { await resetPassword(db, parsed.data.token, parsed.data.password); res.json({ ok: true }); }
      catch (e: any) { res.status(e.status ?? 400).json({ error: e.message ?? 'Invalid or expired link' }); }
    });

    log.info('auth module ready');
  },
};

export default auth;
