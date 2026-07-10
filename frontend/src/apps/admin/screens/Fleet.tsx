import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { fleet, type FleetRider } from '../../../lib/admin';
import { etaMinutes } from '../../../lib/tracking';

const KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
const STYLE: any = KEY
  ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${KEY}`
  : { version: 8, sources: { c: { type: 'raster', tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', 'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap © CARTO' } }, layers: [{ id: 'c', type: 'raster', source: 'c' }] };

function bikeEl(active: boolean) {
  const el = document.createElement('div');
  el.className = 'fleet-marker' + (active ? ' pulse' : '');
  el.innerHTML = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#2a1400" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M5.5 17.5l4-9h4l3 9M9.5 8.5h5"/></svg>`;
  return el;
}
const etaFor = (r: FleetRider) => {
  const dest = r.status === 'assigned' ? { lat: r.store_lat, lng: r.store_lng } : { lat: r.store_lat, lng: r.store_lng };
  return etaMinutes({ lat: r.rider_lat, lng: r.rider_lng }, dest);
};
const initials = (n: string | null) => (n ?? '?').trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();

export function Fleet() {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Record<string, maplibregl.Marker>>({});
  const [riders, setRiders] = useState<FleetRider[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'active'>('all');

  useEffect(() => {
    if (!ref.current) return;
    const m = new maplibregl.Map({ container: ref.current, style: STYLE, center: [7.03, 5.48], zoom: 12.5, attributionControl: false });
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const load = () => fleet().then((r) => setRiders(r.riders)).catch(() => {});
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const seen = new Set<string>();
    riders.forEach((r) => {
      seen.add(r.rider_id);
      const active = r.status === 'picked_up';
      if (markers.current[r.rider_id]) markers.current[r.rider_id].setLngLat([r.rider_lng, r.rider_lat]);
      else {
        const el = bikeEl(active);
        el.addEventListener('click', () => setSel(r.rider_id));
        markers.current[r.rider_id] = new maplibregl.Marker({ element: el }).setLngLat([r.rider_lng, r.rider_lat]).addTo(m);
      }
    });
    Object.keys(markers.current).forEach((id) => { if (!seen.has(id)) { markers.current[id].remove(); delete markers.current[id]; } });
  }, [riders]);

  function focus(r: FleetRider) { setSel(r.rider_id); map.current?.easeTo({ center: [r.rider_lng, r.rider_lat], zoom: 15, duration: 600 }); }

  const list = riders.filter((r) => (filter === 'all' || (filter === 'active' && r.status === 'picked_up')) && (!q.trim() || (r.rider_name ?? '').toLowerCase().includes(q.toLowerCase())));
  const selected = riders.find((r) => r.rider_id === sel);
  const onDelivery = riders.filter((r) => r.status === 'picked_up').length;

  return (
    <div className="fleet">
      <div className="fleet-map"><div ref={ref} style={{ position: 'absolute', inset: 0 }} />
        <div className="fleet-live"><span className="fleet-dot" /> LIVE · Owerri fleet</div>
        <div className="fleet-stats">
          <div className="fleet-stat"><b>{riders.length}</b><span>ONLINE</span></div>
          <div className="fleet-stat"><b style={{ color: 'var(--orange2)' }}>{onDelivery}</b><span>ON DELIVERY</span></div>
          <div className="fleet-stat"><b>{riders.length - onDelivery}</b><span>ASSIGNED</span></div>
        </div>
      </div>

      <aside className="fleet-panel">
        {!selected ? (
          <>
            <h2>Fleet</h2>
            <p className="admin-muted">Tap a rider to see their trip.</p>
            <div className="fleet-search"><svg viewBox="0 0 24 24" width="16" height="16" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" /><path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg><input placeholder="Search rider…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="fleet-tabs">
              <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All</button>
              <button className={filter === 'active' ? 'on' : ''} onClick={() => setFilter('active')}>On delivery</button>
            </div>
            <div className="fleet-list">
              {list.length === 0 ? <div className="admin-muted" style={{ padding: 16 }}>No riders live right now. Riders appear here while their app is open on an active delivery.</div>
                : list.map((r) => {
                  const eta = etaFor(r);
                  return (
                    <div className="fleet-row" key={r.rider_id} onClick={() => focus(r)}>
                      <div className="fleet-av">{initials(r.rider_name)}<i /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="fleet-name">{r.rider_name ?? 'Rider'}</div>
                        <div className="fleet-sub">{r.status === 'picked_up' ? 'On delivery' : 'Heading to pickup'}{eta != null ? ` · ETA ${eta} min` : ''}</div>
                      </div>
                      {eta != null && <span className="fleet-eta">{eta}'</span>}
                    </div>
                  );
                })}
            </div>
          </>
        ) : (
          <div className="fleet-detail">
            <button className="fleet-back" onClick={() => setSel(null)}>← Fleet</button>
            <div className="fleet-av big">{initials(selected.rider_name)}<i /></div>
            <h2>{selected.rider_name ?? 'Rider'}</h2>
            <div className="admin-muted" style={{ marginBottom: 16 }}>{selected.rider_phone ?? 'No phone'}</div>
            <div className="fleet-badge">{selected.status === 'picked_up' ? 'On delivery' : 'Heading to pickup'}{etaFor(selected) != null ? ` · ETA ${etaFor(selected)} min` : ''}</div>
            <div className="fleet-kv"><span>Order</span><b style={{ fontFamily: 'var(--mono)' }}>#{selected.order_id.slice(0, 8)}</b></div>
            <div className="fleet-kv"><span>Customer</span><b>{selected.customer_name ?? '—'}</b></div>
            <h3>Route</h3>
            <div className="fleet-route">
              <div className="fleet-route-row"><span className="fleet-pin teal" /><div><b>Pickup</b><div className="admin-muted">{selected.store_name ?? '—'}{selected.store_address ? ` · ${selected.store_address}` : ''}</div></div></div>
              <div className="fleet-route-line" />
              <div className="fleet-route-row"><span className="fleet-pin green" /><div><b>Dropoff</b><div className="admin-muted">{selected.delivery_address ?? '—'}</div></div></div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
