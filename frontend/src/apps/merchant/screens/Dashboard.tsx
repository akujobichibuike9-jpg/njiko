import { useEffect, useState } from 'react';
import { cacheGet, cacheSet } from '../../../lib/cache';
import { IconBell, IconPin, IconInbox } from '../../../ui/icons';
import { setOnline as apiSetOnline, type Store } from '../../../lib/merchant';
import { merchantOrders, type Order } from '../../../lib/orders';

export function Dashboard({ store, onEditLocation, onOpenSettings, onOpenOrders, onStoreChange }: {
  store: Store; onEditLocation: () => void; onOpenSettings: () => void; onOpenOrders: () => void; onStoreChange: (s: Store) => void;
}) {
  const [online, setOnline] = useState(store.online);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => { setOnline(store.online); }, [store.online]);
  useEffect(() => {
    const load = () => merchantOrders().then((r) => { cacheSet('merchantOrders', r.orders); setOrders(r.orders); }).catch(() => {});
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  async function toggle() {
    const next = !online;
    setOnline(next);
    try { const { store: u } = await apiSetOnline(next); onStoreChange(u); }
    catch { setOnline(!next); }
  }

  const incoming = orders.filter((o) => o.status === 'placed');
  const expected = orders.filter((o) => o.status !== 'rejected').reduce((s, o) => s + Number(o.total), 0);

  return (
    <>
      <div className="m-header">
        <div className="m-ava" onClick={onOpenSettings} style={{ cursor: 'pointer' }}>◆</div>
        <div className="m-store">
          <span className="nm">{store.name ?? 'Your store'}</span>
          <span className="loc" onClick={onEditLocation} style={{ cursor: 'pointer' }}><IconPin /> {store.address ?? 'Add your location'}</span>
        </div>
        <button className="icon-btn ml-auto"><IconBell /></button>
      </div>

      <div className="m-body">
        <div className={`status-card ${online ? 'on' : ''}`} onClick={toggle}>
          <span className="pulse" />
          <div>
            <div className="t">{online ? "You're online" : "You're offline"}</div>
            <div className="d">{online ? 'Accepting orders' : 'Tap to start taking orders'}</div>
          </div>
          <div className="switch2"><span className="k" /></div>
        </div>

        <div className="stat-row">
          <div className="stat"><span className="k">Orders</span><span className="v accent">{orders.length}</span></div>
          <div className="stat"><span className="k">Expected</span><span className="v">₦{expected.toLocaleString()}</span></div>
          <div className="stat"><span className="k">New</span><span className="v">{incoming.length}</span></div>
        </div>

        <div className="sec-head">
          <span className="h">Incoming</span>
          {incoming.length > 0 && <span style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer' }} onClick={onOpenOrders}>See all</span>}
        </div>

        {incoming.length === 0 ? (
          <div className="empty">
            <div className="ec"><IconInbox /></div>
            <div className="et">No new orders</div>
            <div className="ed">New orders appear here once customers start ordering.</div>
          </div>
        ) : (
          incoming.slice(0, 3).map((o) => (
            <div key={o.id} onClick={onOpenOrders} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>#{o.id.slice(0, 8)}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 600, padding: '4px 9px', borderRadius: 999, background: 'var(--accent)', color: 'var(--acctxt)' }}>NEW</span>
              </div>
              <div style={{ fontSize: 12.5, color: '#aab8b5' }}>{o.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}</div>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 15 }}>₦{Number(o.total).toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
