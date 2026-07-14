import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

const KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
const STYLE = KEY
  ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${KEY}`
  : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

/**
 * Drag the pin to the exact gate/door. The customer knows where they live —
 * a geocoder guessing from a typed address does not.
 */
export function PinDrop({
  start, onConfirm, onClose,
}: {
  start?: { lat: number; lng: number } | null;
  onConfirm: (p: { lat: number; lng: number }) => void;
  onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const mk = useRef<maplibregl.Marker | null>(null);
  // Owerri centre as a last resort if we know nothing at all
  const [pin, setPin] = useState({ lat: start?.lat ?? 5.4836, lng: start?.lng ?? 7.0333 });
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!box.current || map.current) return;
    const m = new maplibregl.Map({
      container: box.current,
      style: STYLE,
      center: [pin.lng, pin.lat],
      zoom: start ? 16 : 13,
      attributionControl: false,
    });
    map.current = m;

    const el = document.createElement('div');
    el.className = 'pin-marker';
    const marker = new maplibregl.Marker({ element: el, draggable: true, anchor: 'bottom' })
      .setLngLat([pin.lng, pin.lat])
      .addTo(m);
    mk.current = marker;

    marker.on('dragend', () => {
      const p = marker.getLngLat();
      setPin({ lat: p.lat, lng: p.lng });
    });
    // tapping the map moves the pin too
    m.on('click', (e) => {
      marker.setLngLat(e.lngLat);
      setPin({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    return () => { m.remove(); map.current = null; };
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPin(p);
        mk.current?.setLngLat([p.lng, p.lat]);
        map.current?.flyTo({ center: [p.lng, p.lat], zoom: 17 });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="pindrop">
      <div className="pindrop-card">
        <div className="pindrop-top">
          <b>Drop your delivery pin</b>
          <button className="chat-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="pindrop-hint">Drag the pin (or tap the map) to your exact gate or door.</p>

        <div className="pindrop-map" ref={box} />

        <div className="pindrop-coords">
          <span>{pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</span>
          <button className="pindrop-gps" onClick={useMyLocation} disabled={locating}>
            {locating ? 'Locating…' : 'Use my location'}
          </button>
        </div>

        <button className="dbtn" onClick={() => onConfirm(pin)}>Confirm this spot</button>
      </div>
    </div>
  );
}
