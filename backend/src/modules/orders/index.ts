import { z } from 'zod';
import jwt from 'jsonwebtoken';
import type { AppModule } from '../../core/types';
import {
  ensureSchema, createFromCart, getCustomerOrders, getMerchantOrders, updateStatus,
  getAvailableJobs, getRiderJobs, getRiderHistory, acceptJob, riderUpdateStatus,
  cancelOrder, getOrderEvents, getOrderById, setRiderLocation, getTracking,
} from './service';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-insecure-secret';

function requireAuth(req: any, res: any, next: any) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try { req.account = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid or expired session' }); }
}

const checkoutSchema = z.object({
  deliveryAddress: z.string().min(2),
  lines: z.array(z.object({ itemId: z.string().uuid(), qty: z.number().int().positive() })).min(1),
});

const orders: AppModule = {
  name: 'orders',
  async register({ router, db, events, log }) {
    try { await ensureSchema(db); log.info('orders: schema ready'); }
    catch (e) { log.warn('orders: schema setup skipped', String(e)); }

    router.post('/checkout', requireAuth, async (req: any, res) => {
      const parsed = checkoutSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
      try {
        const created = await createFromCart(db, req.account.sub, parsed.data.deliveryAddress, parsed.data.lines);
        for (const o of created) await events.emit('order.placed', o);
        res.status(201).json({ orders: created });
      } catch (e: any) {
        if (e.status) return res.status(e.status).json({ error: e.message });
        log.error('checkout failed', String(e)); res.status(503).json({ error: 'Could not place order' });
      }
    });

    router.get('/customer', requireAuth, async (req: any, res) => {
      try { res.json({ orders: await getCustomerOrders(db, req.account.sub) }); } catch { res.status(503).json({ error: 'Unavailable' }); }
    });
    router.get('/merchant', requireAuth, async (req: any, res) => {
      try { res.json({ orders: await getMerchantOrders(db, req.account.sub) }); } catch { res.status(503).json({ error: 'Unavailable' }); }
    });

    router.get('/available', requireAuth, async (_req: any, res) => {
      try { res.json({ orders: await getAvailableJobs(db) }); } catch { res.status(503).json({ error: 'Unavailable' }); }
    });
    router.get('/rider', requireAuth, async (req: any, res) => {
      try { res.json({ orders: await getRiderJobs(db, req.account.sub) }); } catch { res.status(503).json({ error: 'Unavailable' }); }
    });
    router.post('/rider-location', requireAuth, async (req: any, res) => {
      const lat = Number(req.body?.lat), lng = Number(req.body?.lng);
      if (!isFinite(lat) || !isFinite(lng)) return res.status(400).json({ error: 'lat/lng required' });
      try { await setRiderLocation(db, req.account.sub, lat, lng); res.json({ ok: true }); }
      catch { res.status(503).json({ error: 'Could not update location' }); }
    });
    router.get('/rider-history', requireAuth, async (req: any, res) => {
      try { res.json({ orders: await getRiderHistory(db, req.account.sub) }); } catch { res.status(503).json({ error: 'Unavailable' }); }
    });

    router.get('/:id/tracking', requireAuth, async (req: any, res) => {
      try {
        const o = await getOrderById(db, req.params.id);
        if (!o) return res.status(404).json({ error: 'Order not found' });
        const me = req.account.sub;
        if (o.user_id !== me && o.store_id !== me && o.rider_id !== me) return res.status(403).json({ error: 'Not allowed' });
        res.json(await getTracking(db, req.params.id));
      } catch { res.status(503).json({ error: 'Unavailable' }); }
    });

    // timeline for one order — only visible to a party on that order
    router.get('/:id/events', requireAuth, async (req: any, res) => {
      try {
        const o = await getOrderById(db, req.params.id);
        if (!o) return res.status(404).json({ error: 'Order not found' });
        const me = req.account.sub;
        if (o.user_id !== me && o.store_id !== me && o.rider_id !== me) return res.status(403).json({ error: 'Not allowed' });
        res.json({ events: await getOrderEvents(db, req.params.id) });
      } catch { res.status(503).json({ error: 'Unavailable' }); }
    });

    router.post('/:id/cancel', requireAuth, async (req: any, res) => {
      try {
        const order = await cancelOrder(db, req.account.sub, req.params.id);
        if (!order) return res.status(409).json({ error: 'This order can no longer be cancelled' });
        await events.emit('order.cancelled', order);
        res.json({ order });
      } catch { res.status(503).json({ error: 'Could not cancel' }); }
    });

    router.post('/:id/accept', requireAuth, async (req: any, res) => {
      try {
        const order = await acceptJob(db, req.account.sub, req.params.id);
        if (!order) return res.status(409).json({ error: 'This job was just taken' });
        await events.emit('order.assigned', order);
        res.json({ order });
      } catch { res.status(503).json({ error: 'Could not accept job' }); }
    });
    router.patch('/:id/rider-status', requireAuth, async (req: any, res) => {
      const status = String(req.body?.status ?? '');
      try {
        const order = await riderUpdateStatus(db, req.account.sub, req.params.id, status);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        await events.emit(`order.${status}`, order);
        res.json({ order });
      } catch (e: any) { if (e.status) return res.status(e.status).json({ error: e.message }); res.status(503).json({ error: 'Could not update' }); }
    });
    router.patch('/:id/status', requireAuth, async (req: any, res) => {
      const status = String(req.body?.status ?? '');
      try {
        const order = await updateStatus(db, req.account.sub, req.params.id, status);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        await events.emit(`order.${status}`, order);
        res.json({ order });
      } catch (e: any) { if (e.status) return res.status(e.status).json({ error: e.message }); res.status(503).json({ error: 'Could not update order' }); }
    });

    log.info('orders module ready');
  },
};

export default orders;
