import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopFilterNav } from '../../../ui/TopFilterNav';
import { customerOrders, cancelOrder, orderEvents, statusMeta, groupOf, type Order, type OrderEvent } from '../../../lib/orders';

const groups = [
  { id: 'live', label: 'Live' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
];

function fmt(ts: string) {
  const d = new Date(ts);
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function OrderCard({ o, onChanged }: { o: Order; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<OrderEvent[] | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const s = statusMeta[o.status] ?? statusMeta.placed;
  const canCancel = o.status === 'placed' || o.status === 'accepted';
  const canTrack = groupOf(o.status) === 'live';

  function toggle() {
    const n = !open; setOpen(n);
    if (n && !events) orderEvents(o.id).then((r) => setEvents(r.events)).catch(() => setEvents([]));
  }
  async function cancel(e: React.MouseEvent) {
    e.stopPropagation(); setBusy(true);
    try { await cancelOrder(o.id); onChanged(); } catch { /* ignore */ } finally { setBusy(false); }
  }

  return (
    <div onClick={toggle} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 15, padding: 13, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 14 }}>{o.store_name ?? 'Store'}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, padding: '4px 9px', borderRadius: 999, background: s.bg, color: s.color }}>{s.label}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#8f9c99', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{o.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}</span>
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 14 }}>₦{Number(o.total).toLocaleString()}</span>
      </div>

      {open && (
        <>
          <div className="otl">
            {events === null ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>Loading timeline…</div>
              : events.length === 0 ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>No history.</div>
              : events.map((e, i) => {
                const es = statusMeta[e.status] ?? statusMeta.placed;
                return (
                  <div className="otl-row" key={i}>
                    <div className="otl-dot"><i style={{ background: es.bg }} /><span /></div>
                    <div className="otl-body">
                      <div className="otl-t">{es.label}{e.actor_name ? ` · ${e.actor_name}` : ''}</div>
                      <div className="otl-m">{fmt(e.created_at)}</div>
                    </div>
                  </div>
                );
              })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>#{o.id.slice(0, 8)} · {o.delivery_address ?? ''}</div>
          {canTrack && (
            <button onClick={(e) => { e.stopPropagation(); nav(`/track/${o.id}`); }} style={{ marginTop: 4, padding: '11px', borderRadius: 11, border: 'none', background: 'linear-gradient(100deg,var(--accent),var(--accent-deep))', color: 'var(--acctxt)', fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Track on map</button>
          )}
          {canCancel && (
            <button onClick={cancel} disabled={busy} style={{ marginTop: 4, padding: '11px', borderRadius: 11, border: '1px solid #4a2a2a', background: 'rgba(255,107,107,.08)', color: '#ff6b6b', fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              {busy ? 'Cancelling…' : 'Cancel order'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function Orders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [group, setGroup] = useState('live');

  const load = () => customerOrders().then((r) => setOrders(r.orders)).catch(() => setOrders((prev) => prev ?? []));
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);

  const list = (orders ?? []).filter((o) => group === 'all' || groupOf(o.status) === group);

  return (
    <>
      <TopFilterNav groups={groups} active={group} onChange={setGroup} />
      <div className="u-body has-tnav">
        {orders === null ? (
          <div className="empty"><div className="ed">Loading…</div></div>
        ) : list.length === 0 ? (
          <div className="empty"><div className="et">Nothing here</div><div className="ed">No {group === 'all' ? '' : group} orders to show.</div></div>
        ) : (
          list.map((o) => <OrderCard key={o.id} o={o} onChanged={load} />)
        )}
      </div>
    </>
  );
}
