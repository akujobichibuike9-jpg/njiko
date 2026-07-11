import { useEffect, useState } from 'react';
import { cacheGet, cacheSet } from '../../../lib/cache';
import { IconInbox } from '../../../ui/icons';
import { TopFilterNav } from '../../../ui/TopFilterNav';
import { merchantOrders, setOrderStatus, orderEvents, statusMeta, groupOf, type Order, type OrderEvent } from '../../../lib/orders';

const groups = [
  { id: 'live', label: 'Live' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
];
const fmt = (ts: string) => { const d = new Date(ts); return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`; };
const btn = (primary: boolean) => ({ flex: 1, padding: '11px', borderRadius: 11, border: primary ? 'none' : '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 13, background: primary ? 'linear-gradient(100deg,var(--accent),var(--accent-deep))' : 'transparent', color: primary ? 'var(--acctxt)' : 'var(--muted)' } as const);

function OrderCard({ o, onAct }: { o: Order; onAct: (id: string, status: string) => void }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<OrderEvent[] | null>(null);
  const s = statusMeta[o.status] ?? statusMeta.placed;
  function toggle() { const n = !open; setOpen(n); if (n && !events) orderEvents(o.id).then((r) => setEvents(r.events)).catch(() => setEvents([])); }
  const act = (e: React.MouseEvent, status: string) => { e.stopPropagation(); onAct(o.id, status); };

  return (
    <div onClick={toggle} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 15, padding: 13, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>#{o.id.slice(0, 8)}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>{o.delivery_address ?? '—'}</div>
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, padding: '4px 9px', borderRadius: 999, background: s.bg, color: s.color }}>{s.label}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12.5, color: '#8f9c99', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>{o.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}</span>
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 15 }}>₦{Number(o.total).toLocaleString()}</span>
      </div>

      {open && (
        <div className="otl">
          {events === null ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>Loading timeline…</div>
            : events.map((e, i) => {
              const es = statusMeta[e.status] ?? statusMeta.placed;
              return (<div className="otl-row" key={i}><div className="otl-dot"><i style={{ background: es.bg }} /><span /></div><div className="otl-body"><div className="otl-t">{es.label}{e.actor_name ? ` · ${e.actor_name}` : ''}</div><div className="otl-m">{fmt(e.created_at)}</div></div></div>);
            })}
        </div>
      )}

      {o.status === 'placed' && (
        <div style={{ display: 'flex', gap: 9 }}>
          <button style={{ ...btn(false), borderColor: '#ff6b6b', color: '#ff6b6b' }} onClick={(e) => act(e, 'rejected')}>Reject</button>
          <button style={{ ...btn(true), flex: 2 }} onClick={(e) => act(e, 'accepted')}>Accept</button>
        </div>
      )}
      {(o.status === 'accepted' || o.status === 'preparing') && <button style={btn(true)} onClick={(e) => act(e, 'ready')}>Mark ready for pickup</button>}
      {o.status === 'ready' && <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>Ready — waiting for a rider</div>}
      {o.status === 'assigned' && <div style={{ fontSize: 12, color: '#FF8A3D', textAlign: 'center' }}>Rider {o.rider_name ?? ''} assigned</div>}
      {o.status === 'picked_up' && <div style={{ fontSize: 12, color: '#FF8A3D', textAlign: 'center' }}>Picked up — on the way</div>}
      {o.status === 'delivered' && <div style={{ fontSize: 12, color: '#7fe0c0', textAlign: 'center' }}>Delivered ✓</div>}
      {o.status === 'cancelled' && <div style={{ fontSize: 12, color: '#ff9b9b', textAlign: 'center' }}>Cancelled by customer</div>}
    </div>
  );
}

export function Orders() {
  const [orders, setOrders] = useState<Order[] | null>(() => cacheGet<Order[]>('merchantOrders') ?? null);
  const [group, setGroup] = useState('live');
  const load = () => merchantOrders().then((r) => { cacheSet('merchantOrders', r.orders); setOrders(r.orders); }).catch(() => setOrders((prev) => prev ?? []));
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);
  async function act(id: string, status: string) { await setOrderStatus(id, status); load(); }

  const list = (orders ?? []).filter((o) => group === 'all' || groupOf(o.status) === group);

  return (
    <>
      <TopFilterNav groups={groups} active={group} onChange={setGroup} />
      <div className="m-body has-tnav">
        {orders === null ? (
          <div className="empty"><div className="ed">Loading…</div></div>
        ) : list.length === 0 ? (
          <div className="empty"><div className="ec"><IconInbox /></div><div className="et">Nothing here</div><div className="ed">No {group === 'all' ? '' : group} orders.</div></div>
        ) : (
          list.map((o) => <OrderCard key={o.id} o={o} onAct={act} />)
        )}
      </div>
    </>
  );
}
