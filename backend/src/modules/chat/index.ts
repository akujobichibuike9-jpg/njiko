import jwt from 'jsonwebtoken';
import type { AppModule } from '../../core/types';
import { ensureTables, listMessages, sendMessage, unreadCount, adminThread } from './service';

function requireAuth(req: any, res: any, next: any) {
  const h = req.headers.authorization ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  try { req.account = jwt.verify(token, process.env.JWT_SECRET as string); next(); }
  catch { return res.status(401).json({ error: 'Session expired' }); }
}

const chat: AppModule = {
  name: 'chat',
  async register({ router, db }) {
    await ensureTables(db);

    router.get('/:orderId', requireAuth, async (req: any, res) => {
      try { res.json(await listMessages(db, req.params.orderId, req.account.sub)); }
      catch (e: any) { res.status(e.status ?? 503).json({ error: e.message }); }
    });

    router.post('/:orderId', requireAuth, async (req: any, res) => {
      const body = req.body?.body ? String(req.body.body).slice(0, 1000) : null;
      const imageUrl = req.body?.imageUrl ? String(req.body.imageUrl) : null;
      try { res.json({ message: await sendMessage(db, req.params.orderId, req.account.sub, body, imageUrl) }); }
      catch (e: any) { res.status(e.status ?? 503).json({ error: e.message }); }
    });

    router.get('/:orderId/unread', requireAuth, async (req: any, res) => {
      res.json({ unread: await unreadCount(db, req.params.orderId, req.account.sub) });
    });

    // Admin oversight of any conversation.
    router.get('/:orderId/admin', requireAuth, async (req: any, res) => {
      if (req.account.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
      res.json({ messages: await adminThread(db, req.params.orderId) });
    });
  },
};

export default chat;
