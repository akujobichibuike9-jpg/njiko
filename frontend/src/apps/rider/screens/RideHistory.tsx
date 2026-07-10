import { useEffect, useState } from 'react';
import { riderHistory, orderEvents, statusMeta, type Order, type OrderEvent } from '../../../lib/orders';

const back = (<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const fmt = (ts: string) => { const d = new Date(ts); return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`; };

function RideCard({ o }: { o: Order }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<OrderEvent[] | null>(null);
  const d = new Date(o.created_at);
  function toggle() { const n = !open; setOpen(n); if (n && !events) orderEvents(o.id).then((r) => setEvents(r.events)).catch(() => setEvents([])); }

  return (
    <div onClick={toggle} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 15, padding: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 14 }}>{o.store_name ?? 'Store'}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, padding: '4px 9px', borderRadius: 999, background: '#2b3a37', color: '#7fe0c0' }}>DELIVERED</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{fmt(o.created_at)}</div>
      <div style={{ fontSize: 12, color: '#aab8b5', borderTop: '1px solid var(--border)', paddingTop: 9 }}>{o.store_address ?? 'Pickup'} → {o.delivery_address ?? 'Dropoff'}</div>
      <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 14 }}>₦{Number(o.total).toLocaleString()}</span>
      {open && (
        <div className="otl">
          {events === null ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>Loading timeline…</div>
            : events.map((e, i) => {
              const es = statusMeta[e.status] ?? statusMeta.placed;
              return (<div className="otl-row" key={i}><div className="otl-dot"><i style={{ background: es.bg }} /><span /></div><div className="otl-body"><div className="otl-t">{es.label}{e.actor_name ? ` · ${e.actor_name}` : ''}</div><div className="otl-m">{fmt(e.created_at)}</div></div></div>);
            })}
        </div>
      )}
    </div>
  );
}

export function RideHistory({ onBack }: { onBack: () => void }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  useEffect(() => { riderHistory().then((r) => setOrders(r.orders)).catch(() => setOrders([])); }, []);

  return (
    <>
      <div className="m-header">
        <button className="icon-btn" onClick={onBack}>{back}</button>
        <span className="page-title" style={{ marginLeft: 4 }}>Ride history</span>
      </div>
      <div className="m-body">
        {orders === null ? (
          <div className="empty"><div className="ed">Loading…</div></div>
        ) : orders.length === 0 ? (
          <div className="empty"><div className="et">No rides yet</div><div className="ed">Your completed deliveries will be listed here — tap one to see its full timeline.</div></div>
        ) : (
          orders.map((o) => <RideCard key={o.id} o={o} />)
        )}
      </div>
    </>
  );
}
