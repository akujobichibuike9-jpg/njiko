import { useEffect, useState } from 'react';
import { flaggedDeliveries, deliveryAudit, adminOrderDetail, type DeliveryAudit } from '../../../lib/admin';
import { TrackMap } from '../../../ui/TrackMap';

/**
 * Deliveries the engine flagged: the rider ended the ride outside the delivery
 * radius, or their GPS went dark before completing. Click one to see the path
 * they ACTUALLY drove and exactly where they stopped.
 */
export function Flagged() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [audit, setAudit] = useState<DeliveryAudit | null>(null);

  useEffect(() => { flaggedDeliveries().then((r) => setRows(r.flagged)).catch(() => setRows([])); }, []);

  function open(id: string) {
    setAudit(null);
    adminOrderDetail(id).then(setDetail).catch(() => {});
    deliveryAudit(id).then(setAudit).catch(() => setAudit(null));
  }

  return (
    <>
      <div className="admin-head">
        <h1>Flagged deliveries</h1>
        <p>Rides ended away from the customer, or with GPS gone dark.</p>
      </div>

      {rows === null ? <div className="admin-muted">Loading…</div>
        : rows.length === 0 ? (
          <div className="admin-panel starry"><div className="admin-muted">No flagged deliveries. Every ride ended where it should have.</div></div>
        ) : (
          <div className="admin-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="admin-table">
              <thead><tr><th>Order</th><th>Rider</th><th>Store</th><th>Ended</th><th>When</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="admin-row" onClick={() => open(r.id)}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>#{String(r.id).slice(0, 8)}</td>
                    <td>{r.rider_name ?? '—'}</td>
                    <td>{r.store_name}</td>
                    <td><span className="admin-pill red">{r.delivered_gap_m}m away</span></td>
                    <td className="admin-muted">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {detail && (
        <div className="admin-drawer" onClick={() => { setDetail(null); setAudit(null); }}>
          <div className="admin-drawer-card wide" onClick={(e) => e.stopPropagation()}>
            <button className="admin-drawer-x" onClick={() => { setDetail(null); setAudit(null); }}>✕</button>
            <h2>Order #{String(detail.order.id).slice(0, 8)}</h2>

            <div style={{ height: 300, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--a-line)', margin: '12px 0' }}>
              {detail.tracking ? (
                <TrackMap
                  pickup={detail.tracking.pickup}
                  dropoff={detail.tracking.dropoff}
                  route={detail.tracking.route}
                  trail={audit?.trail ?? null}
                  endedAt={audit?.order?.delivered_lat != null ? { lat: audit.order.delivered_lat, lng: audit.order.delivered_lng } : null}
                  fitKey={detail.order.id}
                />
              ) : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#8592a4', fontSize: 12 }}>No location data</div>}
            </div>

            {audit && audit.gap_m != null && (
              <div className="pod bad">
                <div className="pod-head"><b>Delivery flagged</b><span>{audit.gap_m}m from customer</span></div>
                <div className="pod-body">
                  Ride ended {audit.gap_m}m away — outside the {audit.radius_m}m radius.{' '}
                  Rider drove {audit.travelled_km}km · {audit.points} GPS points.
                  {audit.ended_at && <> Last ping {new Date(audit.ended_at).toLocaleTimeString()}.</>}
                </div>
                <div className="pod-key">
                  <span><i className="k-route" /> planned route</span>
                  <span><i className="k-trail" /> actual path driven</span>
                  <span><i className="k-end" /> ride ended here</span>
                </div>
              </div>
            )}

            <div className="admin-kv"><span>Rider</span><b>{detail.order.rider_name ?? '—'}</b></div>
            <div className="admin-kv"><span>Store</span><b>{detail.order.store_name ?? '—'}</b></div>
            <div className="admin-kv"><span>Customer</span><b>{detail.order.customer_name ?? '—'}</b></div>
            <div className="admin-kv"><span>Dropoff</span><b style={{ maxWidth: 220, textAlign: 'right' }}>{detail.order.delivery_address ?? '—'}</b></div>
            <div className="admin-kv"><span>Total</span><b>₦{Number(detail.order.total).toLocaleString()}</b></div>
          </div>
        </div>
      )}
    </>
  );
}
