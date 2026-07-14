import jwt from 'jsonwebtoken';
import type { AppModule } from '../../core/types';
import { ensureTables, ensureTraceTables, tick, currentOffer, acceptOffer, declineOffer, riderRoute, deliveryAudit, POLICY } from './service';

function requireAuth(req: any, res: any, next: any) {
  const h = req.headers.authorization ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  try {
    req.account = jwt.verify(token, process.env.JWT_SECRET as string);
    next();
  } catch { return res.status(401).json({ error: 'Session expired' }); }
}

const dispatch: AppModule = {
  name: 'dispatch',
  async register({ router, db, log }) {
    await ensureTables(db);
    await ensureTraceTables(db);

    // The engine runs on the server on a timer — never on a rider's phone.
    const every = 5000;
    setInterval(() => {
      tick(db, (m) => log.info(m)).catch((e) => log.error(`dispatch tick failed: ${e.message}`));
    }, every);
    log.info(`dispatch engine running every ${every / 1000}s (max ${POLICY.MAX_JOBS_PER_RIDER} jobs/rider)`);

    // The rider's ONE live offer. They never see a list to cherry-pick from.
    router.get('/offer', requireAuth, async (req: any, res) => {
      const offer = await currentOffer(db, req.account.sub);
      res.json({ offer });
    });

    router.post('/offer/:orderId/accept', requireAuth, async (req: any, res) => {
      const r = await acceptOffer(db, req.params.orderId, req.account.sub);
      if (!r.ok) return res.status(409).json({ error: r.error });   // 409 = someone/something beat you
      res.json({ ok: true });
    });

    router.post('/offer/:orderId/decline', requireAuth, async (req: any, res) => {
      await declineOffer(db, req.params.orderId, req.account.sub);
      res.json({ ok: true });
    });

    // The rider's whole route, correctly sequenced across every job they hold.
    router.get('/route', requireAuth, async (req: any, res) => {
      res.json(await riderRoute(db, req.account.sub));
    });

    // Admin: audit one delivery — the rider's ACTUAL travelled path and where they
    // stood when they marked it delivered. This is how you catch a rider who ends a
    // ride blocks away from the customer.
    router.get('/audit/:orderId', requireAuth, async (req: any, res) => {
      if (req.account.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
      const a = await deliveryAudit(db, req.params.orderId);
      if (!a) return res.status(404).json({ error: 'Order not found' });
      res.json(a);
    });

    // Admin: every delivery the system flagged as suspicious.
    router.get('/flagged', requireAuth, async (req: any, res) => {
      if (req.account.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
      const { rows } = await db.query(
        `SELECT o.id, o.delivered_gap_m, o.created_at, o.delivery_address,
                a.name AS rider_name, a.id AS rider_id, s.name AS store_name
           FROM orders o
           LEFT JOIN accounts a ON a.id = o.rider_id
           JOIN merchant_stores s ON s.account_id = o.store_id
          WHERE o.delivery_flagged = true
          ORDER BY o.created_at DESC LIMIT 100`);
      res.json({ flagged: rows });
    });

    // Admin: the decision log + anything stuck.
    router.get('/events', requireAuth, async (req: any, res) => {
      if (req.account.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
      const { rows } = await db.query(
        `SELECT * FROM dispatch_events ORDER BY created_at DESC LIMIT 200`);
      res.json({ events: rows });
    });

    router.get('/stuck', requireAuth, async (req: any, res) => {
      if (req.account.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
      const { rows } = await db.query(
        `SELECT o.id, o.created_at, o.delivery_fee, s.name AS store_name,
                (SELECT count(*) FROM offers f WHERE f.order_id=o.id AND f.status IN ('DECLINED','EXPIRED')) AS refusals
           FROM orders o JOIN merchant_stores s ON s.account_id = o.store_id
          WHERE o.rider_id IS NULL AND o.status IN ('accepted','preparing','ready')
          ORDER BY o.created_at ASC`);
      res.json({ stuck: rows });
    });
  },
};

export default dispatch;
