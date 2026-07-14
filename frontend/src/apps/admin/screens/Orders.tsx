import { useEffect, useRef, useState } from 'react';
import { allOrders, adminOrderDetail, deliveryAudit, type AdminOrder, type DeliveryAudit } from '../../../lib/admin';
import { statusMeta } from '../../../lib/orders';
import { TrackMap } from '../../../ui/TrackMap';

const filters = [{ id: 'live', label: 'Live' }, { id: 'delivered', label: 'Delivered' }, { id: 'cancelled', label: 'Cancelled' }, { id: 'all', label: 'All' }];
const fmt = (ts: string) => `${new Date(ts).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} · ${new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

export function Orders({ initialFilter, openId }: { initialFilter: string; openId?: string }) {
  const [filter, setFilter] = useState(initialFilter);
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<AdminOrder[] | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const timer = useRef<any>(null);

  const load = () => { setRows(null); allOrders(filter, q).then((r) => setRows(r.orders)).catch(() => setRows([])); };
  useEffect(() => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(load, 250); }, [filter, q]);
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);
  const [audit, setAudit] = useState<DeliveryAudit | null>(null);
  useEffect(() => { if (openId) adminOrderDetail(openId).then(setDetail).catch(() => {}); }, [openId]);
  // pull the rider's ACTUAL travelled path + where they ended the ride
  useEffect(() => {
    if (!detail?.order?.id) { setAudit(null); return; }
    deliveryAudit(detail.order.id).then(setAudit).catch(() => setAudit(null));
  }, [detail?.order?.id]);

  function open(id: string) { setAudit(null); adminOrderDetail(id).then(setDetail).catch(() => {}); }

  return (
    <>
      <div className="admin-head"><h1>Orders</h1><p>Every order across the platform — for oversight &amp; investigation.</p></div>

      <div className="admin-toolbar">
        <div className="admin-seg">
          {filters.map((f) => <button key={f.id} className={`admin-seg-a ${filter === f.id ? 'on' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>)}
        </div>
        <div className="admin-search sm">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" /><path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          <input placeholder="Search order # or customer/merchant/rider…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="admin-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="admin-table">
          <thead><tr><th>Order</th><th>Store</th><th>Customer</th><th>Rider</th><th>Total</th><th>Status</th><th>When</th></tr></thead>
          <tbody>
            {rows === null ? <tr><td colSpan={7} className="admin-muted" style={{ padding: 20 }}>Loading…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={7} className="admin-muted" style={{ padding: 20 }}>No orders.</td></tr>
              : rows.map((o) => {
                const s = statusMeta[o.status] ?? statusMeta.placed;
                return (
                  <tr key={o.id} className="admin-row" onClick={() => open(o.id)}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>#{o.id.slice(0, 8)}</td>
                    <td><b>{o.store_name ?? '—'}</b></td>
                    <td>{o.customer_name ?? '—'}</td>
                    <td>{o.rider_name ?? '—'}</td>
                    <td>₦{Number(o.total).toLocaleString()}</td>
                    <td><span className="admin-pill" style={{ background: s.bg, color: s.color }}>{s.label}</span></td>
                    <td className="admin-muted" style={{ fontSize: 12 }}>{fmt(o.created_at)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="admin-drawer" onClick={() => setDetail(null)}>
          <div className="admin-drawer-card wide" onClick={(e) => e.stopPropagation()}>
            <button className="admin-drawer-x" onClick={() => setDetail(null)}>✕</button>
            <h2 style={{ fontFamily: 'var(--mono)', fontSize: 18 }}>#{detail.order.id.slice(0, 8)}</h2>
            <div style={{ height: 200, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)', margin: '12px 0 16px' }}>
              {detail.tracking && (detail.tracking.pickup?.lat != null || detail.tracking.dropoff?.lat != null)
                ? <TrackMap
                    pickup={detail.tracking.pickup}
                    dropoff={detail.tracking.dropoff}
                    rider={detail.tracking.rider}
                    route={detail.tracking.route}
                    trail={audit?.trail ?? null}
                    endedAt={audit?.order?.delivered_lat != null ? { lat: audit.order.delivered_lat, lng: audit.order.delivered_lng } : null}
                    fitKey={detail.order.id}
                  />
                : <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#8592a4', fontSize: 12 }}>No location data for this order</div>}
            </div>
            {/* Proof of delivery: where the rider actually ended the ride. */}
            {audit && audit.gap_m != null && (
              <div className={`pod ${audit.flagged ? 'bad' : 'ok'}`}>
                <div className="pod-head">
                  <b>{audit.flagged ? 'Delivery flagged' : 'Delivery verified'}</b>
                  <span>{audit.gap_m}m from customer</span>
                </div>
                <div className="pod-body">
                  {audit.flagged
                    ? `Ride ended ${audit.gap_m}m away — outside the ${audit.radius_m}m delivery radius.`
                    : `Ride ended at the customer (within ${audit.radius_m}m).`}
                  {' '}Rider drove {audit.travelled_km}km · {audit.points} GPS points.
                </div>
                <div className="pod-key">
                  <span><i className="k-route" /> planned route</span>
                  <span><i className="k-trail" /> actual path driven</span>
                  <span><i className="k-end" /> ride ended here</span>
                </div>
              </div>
            )}
            <div className="admin-kv"><span>Store</span><b>{detail.order.store_name ?? '—'}</b></div>
            <div className="admin-kv"><span>Customer</span><b>{detail.order.customer_name ?? '—'} {detail.order.customer_phone ? `· ${detail.order.customer_phone}` : ''}</b></div>
            <div className="admin-kv"><span>Rider</span><b>{detail.order.rider_name ?? '—'}</b></div>
            <div className="admin-kv"><span>Dropoff</span><b style={{ maxWidth: 220, textAlign: 'right' }}>{detail.order.delivery_address ?? '—'}</b></div>
            <div className="admin-kv"><span>Total</span><b>₦{Number(detail.order.total).toLocaleString()} ({detail.order.payment_method})</b></div>
            <h3 style={{ marginTop: 16 }}>Items</h3>
            {detail.items.map((i: any, k: number) => <div key={k} className="admin-muted" style={{ fontSize: 13, padding: '3px 0' }}>{i.qty}× {i.name} — ₦{Number(i.price).toLocaleString()}</div>)}
            <h3 style={{ marginTop: 16 }}>Timeline</h3>
            <div className="otl" style={{ borderTop: 'none', paddingTop: 4 }}>
              {detail.events.length === 0 ? <div className="admin-muted">No events.</div> : detail.events.map((e: any, i: number) => {
                const es = statusMeta[e.status] ?? statusMeta.placed;
                return (<div className="otl-row" key={i}><div className="otl-dot"><i style={{ background: es.bg }} /><span /></div><div className="otl-body"><div className="otl-t" style={{ color: '#16233a' }}>{es.label}{e.actor_name ? ` · ${e.actor_name}` : ''}</div><div className="otl-m">{fmt(e.created_at)}</div></div></div>);
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
