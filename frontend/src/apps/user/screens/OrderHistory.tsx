import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerOrders, statusMeta, type Order } from '../../../lib/orders';

export function OrderHistory() {
  const nav = useNavigate();
  const [orders, setOrders] = useState<Order[] | null>(null);
  useEffect(() => { customerOrders().then((r) => setOrders(r.orders)).catch(() => setOrders([])); }, []);

  return (
    <>
      <div className="m-header">
        <button className="icon-btn" onClick={() => nav(-1)}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span className="page-title" style={{ marginLeft: 4 }}>Order history</span>
      </div>
      <div className="u-body">
        {orders === null ? (
          <div className="empty"><div className="ed">Loading…</div></div>
        ) : orders.length === 0 ? (
          <div className="empty"><div className="et">No orders yet</div><div className="ed">Your past orders will be listed here.</div></div>
        ) : (
          orders.map((o) => {
            const s = statusMeta[o.status] ?? statusMeta.placed;
            const d = new Date(o.created_at);
            const when = `${d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            return (
              <div key={o.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 15, display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 14 }}>{o.store_name ?? 'Store'}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, padding: '4px 9px', borderRadius: 999, background: s.bg, color: s.color }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{when} · #{o.id.slice(0, 8)}</div>
                <div style={{ fontSize: 12.5, color: '#aab8b5', borderTop: '1px solid var(--border)', paddingTop: 9 }}>{o.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 15 }}>₦{Number(o.total).toLocaleString()}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.delivery_address ?? ''}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
