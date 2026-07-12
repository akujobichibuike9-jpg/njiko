import { useEffect, useRef, useState } from 'react';
import { cacheGet, cacheSet } from '../../../lib/cache';
import { IconPin } from '../../../ui/icons';
import { TrackMap } from '../../../ui/TrackMap';
import { riderJobs, riderSetStatus, statusMeta, type Order } from '../../../lib/orders';
import { postRiderLocation, getTracking, type Tracking } from '../../../lib/tracking';

// Hand navigation off to Google Maps for the current leg — riders already know it,
// it has live traffic, and it's better than anything we'd build in-app.
function navigateTo(t: Tracking) {
  const dest = t.leg_to === 'pickup' ? t.pickup : t.dropoff;
  if (!dest || dest.lat == null || dest.lng == null) return;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`;
  window.open(url, '_blank', 'noopener');
}

export function Active() {
  const [jobs, setJobs] = useState<Order[] | null>(() => cacheGet<Order[]>('riderActive') ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const lastPost = useRef(0);

  const load = () => riderJobs().then((r) => { cacheSet('riderActive', r.orders); setJobs(r.orders); }).catch(() => setJobs((prev) => prev ?? []));
  useEffect(() => { load(); const t = setInterval(load, 6000); return () => clearInterval(t); }, []);

  // Share live GPS while on the Active screen so the customer can track the rider.
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setMe({ lat, lng });
        const now = Date.now();
        if (now - lastPost.current > 4000) { lastPost.current = now; postRiderLocation(lat, lng).catch(() => {}); }
      },
      () => {}, { enableHighAccuracy: true, maximumAge: 4000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  async function upd(id: string, status: string) {
    setBusy(id);
    try { await riderSetStatus(id, status); } finally { setBusy(null); load(); }
  }

  const current = (jobs ?? [])[0];

  // Pull the real road route for this delivery: rider → store → customer (before pickup),
  // then rider → customer once collected. Refreshes as the rider moves.
  const [trk, setTrk] = useState<Tracking | null>(null);
  const [mapBig, setMapBig] = useState(false);
  useEffect(() => {
    if (!current) { setTrk(null); return; }
    let alive = true;
    const pull = () => getTracking(current.id).then((t) => { if (alive) setTrk(t); }).catch(() => {});
    pull();
    const t = setInterval(pull, 10000);
    return () => { alive = false; clearInterval(t); };
  }, [current?.id, current?.status]);

  return (
    <>
      <div className="m-header"><span className="page-title">Active delivery</span></div>
      <div className="m-body">
        {jobs === null ? (
          <div className="empty"><div className="ed">Loading…</div></div>
        ) : jobs.length === 0 ? (
          <div className="empty"><div className="ec"><IconPin /></div><div className="et">No active delivery</div><div className="ed">Accept a job from the Jobs tab to start delivering.</div></div>
        ) : (
          <>
            {current && (current.store_lat != null || current.dropoff_lat != null || me) && (
              <>
                <div className={`rmap ${mapBig ? 'big' : ''}`}>
                  <TrackMap pickup={{ lat: current.store_lat ?? null, lng: current.store_lng ?? null }} dropoff={{ lat: current.dropoff_lat ?? null, lng: current.dropoff_lng ?? null }} rider={me} route={trk?.route ?? null} fitKey={`${current.id}:${current.status}`} />
                  {/* pull the map open to fill the screen; pull it down to bring the details back */}
                  <button className="rmap-grip" onClick={() => setMapBig((v) => !v)} aria-label={mapBig ? 'Shrink map' : 'Expand map'}>
                    <span />
                  </button>
                </div>
                {trk && (
                  <div className="leg-bar">
                    <span className={`leg-dot ${trk.leg_to}`} />
                    <div className="leg-txt">
                      <b>{trk.leg_to === 'pickup' ? `Head to ${trk.store_name ?? 'the store'}` : 'Head to the customer'}</b>
                      <span>{trk.leg_to === 'pickup' ? 'Collect the order' : (trk.delivery_address ?? 'Delivery address')}</span>
                    </div>
                    {trk.leg_eta_min != null && (
                      <div className="leg-eta"><b>{trk.leg_eta_min}</b><span>min{trk.leg_distance_km != null ? ` · ${trk.leg_distance_km}km` : ''}</span></div>
                    )}
                    <button className="leg-nav" onClick={() => navigateTo(trk)} aria-label="Open directions">
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none"><path d="M12 2l9 20-9-5-9 5 9-20z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                      Navigate
                    </button>
                  </div>
                )}
              </>
            )}
            {!mapBig && jobs.map((o) => {
              const s = statusMeta[o.status] ?? statusMeta.assigned;
              return (
                <div key={o.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 15, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>#{o.id.slice(0, 8)}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 600, padding: '4px 9px', borderRadius: 999, background: s.bg, color: s.color }}>{s.label}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}><span style={{ color: 'var(--accent)', marginTop: 2 }}>●</span><div><div style={{ fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--disp)' }}>Pick up · {o.store_name ?? 'Store'}</div><div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{o.store_address ?? '—'}</div></div></div>
                    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}><span style={{ color: '#888', marginTop: 2 }}>○</span><div><div style={{ fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--disp)' }}>Drop off · Customer</div><div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{o.delivery_address ?? '—'}</div></div></div>
                  </div>
                  <div style={{ fontSize: 12, color: '#aab8b5', borderTop: '1px solid var(--border)', paddingTop: 10 }}>{o.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')} · ₦{Number(o.total).toLocaleString()}</div>
                  {o.status === 'assigned' && <button className="dbtn" style={{ margin: 0 }} onClick={() => upd(o.id, 'picked_up')} disabled={busy === o.id}>{busy === o.id ? '…' : 'Mark picked up'}</button>}
                  {o.status === 'picked_up' && <button className="dbtn" style={{ margin: 0 }} onClick={() => upd(o.id, 'delivered')} disabled={busy === o.id}>{busy === o.id ? '…' : 'Mark delivered'}</button>}
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
