import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Point } from '../lib/tracking';

const KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
// MapTiler dark style when a key is present; free CARTO dark as a safe fallback.
const STYLE: any = KEY
  ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${KEY}`
  : { version: 8, sources: { c: { type: 'raster', tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', 'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap © CARTO' } }, layers: [{ id: 'c', type: 'raster', source: 'c' }] };

function dot(color: string, pulse = false) {
  const el = document.createElement('div');
  el.style.cssText = `width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 ${pulse ? 6 : 5}px ${color}33`;
  return el;
}

export function TrackMap({ pickup, dropoff, rider, route }: {
  pickup?: Point; dropoff?: Point; rider?: { lat: number; lng: number } | null; route?: [number, number][] | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!ref.current) return;
    const m = new maplibregl.Map({ container: ref.current, style: STYLE, center: [7.03, 5.48], zoom: 12, attributionControl: false });
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      // route line
      const line: any = { type: 'Feature', geometry: { type: 'LineString', coordinates: route ?? [] } };
      const src = m.getSource('route') as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(line);
      else {
        m.addSource('route', { type: 'geojson', data: line });
        m.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#2FE082', 'line-width': 4, 'line-opacity': 0.9 } });
      }
      // markers
      markers.current.forEach((mk) => mk.remove());
      markers.current = [];
      const pts: [number, number][] = [];
      const add = (p: Point | undefined | null, color: string, pulse = false) => {
        if (!p || p.lat == null || p.lng == null) return;
        markers.current.push(new maplibregl.Marker({ element: dot(color, pulse) }).setLngLat([p.lng, p.lat]).addTo(m));
        pts.push([p.lng, p.lat]);
      };
      add(pickup, '#2EE6C6');
      add(dropoff, '#2FE082');
      if (rider) add(rider as Point, '#FF8A3D', true);
      (route ?? []).forEach((c) => pts.push(c));
      if (pts.length === 1) m.easeTo({ center: pts[0], zoom: 14, duration: 500 });
      else if (pts.length > 1) {
        const b = new maplibregl.LngLatBounds(pts[0], pts[0]);
        pts.forEach((p) => b.extend(p));
        m.fitBounds(b, { padding: { top: 70, bottom: 40, left: 50, right: 50 }, maxZoom: 15, duration: 600 });
      }
    };
    if (m.isStyleLoaded()) apply(); else m.once('load', apply);
  }, [pickup, dropoff, rider, route]);

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
}
