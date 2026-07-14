import { Fragment, useEffect, useState } from 'react';
import { ChatPanel } from '../../../ui/ChatPanel';
import { useParams, useNavigate } from 'react-router-dom';
import { TrackMap } from '../../../ui/TrackMap';
import { getTracking, etaMinutes, type Tracking } from '../../../lib/tracking';
import { statusMeta } from '../../../lib/orders';

const STEPS = ['Placed', 'Preparing', 'On the way', 'Delivered'];
function stepOf(status?: string) {
  if (status === 'delivered') return 3;
  if (status === 'assigned' || status === 'picked_up') return 2;
  if (status === 'accepted' || status === 'preparing' || status === 'ready') return 1;
  return 0;
}

export function Track() {
  const [chat, setChat] = useState(false);
  const { id } = useParams();
  const nav = useNavigate();
  const [t, setT] = useState<Tracking | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    const load = () => getTracking(id).then(setT).catch(() => setT(null));
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [id]);

  const s = t ? (statusMeta[t.status] ?? statusMeta.placed) : null;
  const eta = t ? (t.eta_min ?? etaMinutes(t.rider ?? t.pickup, t.dropoff)) : null;
  const step = stepOf(t?.status);
  const hasCoords = t && (t.pickup.lat != null || t.dropoff.lat != null || t.rider);

  return (
    <div style={{ position: 'relative', height: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', flex: '0 0 52%' }}>
        {hasCoords ? <TrackMap pickup={t!.pickup} dropoff={t!.dropoff} rider={t!.rider} route={t!.route} fitKey={`${id}:${t?.status ?? ''}`} />
          : <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 13 }}>{t === undefined ? 'Loading map…' : 'Location not available yet'}</div>}
        <button onClick={() => nav(-1)} style={{ position: 'absolute', top: 16, left: 16, width: 42, height: 42, borderRadius: 13, background: 'rgba(9,12,13,.72)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.14)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', zIndex: 5 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      <div style={{ flex: 1, marginTop: -24, position: 'relative', background: 'var(--surface)', borderRadius: '24px 24px 0 0', border: '1px solid var(--border)', borderBottom: 'none', padding: '16px 20px 24px', overflowY: 'auto', boxShadow: '0 -14px 44px -10px rgba(0,0,0,.7)' }}>
        <div style={{ width: 42, height: 4, borderRadius: 999, background: 'var(--border)', margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Order</div>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 18, marginTop: 2 }}>#{id?.slice(0, 8)}</div>
          </div>
          {s && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 999, background: s.bg, color: s.color }}>{s.label}</span>}
        </div>

        <div style={{ fontSize: 13, color: 'var(--accent)', fontFamily: 'var(--disp)', fontWeight: 600, marginBottom: 18 }}>
          {eta != null ? `~${eta} min away` : 'Estimating…'}{t?.distance_km != null ? ` · ${t.distance_km} km` : ''}
        </div>

        {/* stepper */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 7 }}>
          {STEPS.map((_, i) => (
            <Fragment key={i}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', background: i <= step ? 'var(--accent)' : 'var(--border)', color: i <= step ? 'var(--acctxt)' : 'transparent', fontSize: 12, fontWeight: 700 }}>✓</div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 3, background: i < step ? 'var(--accent)' : 'var(--border)' }} />}
            </Fragment>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          {STEPS.map((label, i) => <span key={i} style={{ fontSize: 10, color: i <= step ? 'var(--text)' : 'var(--muted)', flex: i === 0 ? '0 0 auto' : i === STEPS.length - 1 ? '0 0 auto' : 1, textAlign: i === 0 ? 'left' : i === STEPS.length - 1 ? 'right' : 'center' }}>{label}</span>)}
        </div>

        {/* from / to */}
        <div style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#2EE6C6' }} />
            <span style={{ width: 2, flex: 1, background: 'var(--border)', margin: '4px 0' }} />
            <span style={{ width: 9, height: 9, borderRadius: '50%', border: '2px solid #2FE082' }} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Pickup</div><div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>{t?.store_name ?? '—'}</div></div>
            <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Dropoff</div><div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>{t?.delivery_address ?? '—'}</div></div>
          </div>
        </div>

        {/* courier */}
        {t?.rider && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg,#FF8A3D,#F2671E)', display: 'grid', placeItems: 'center', fontFamily: 'var(--disp)', fontWeight: 700, fontSize: 19, color: '#2a1400' }}>{(t.rider.name ?? 'R').charAt(0).toUpperCase()}</div>
            <div style={{ flex: 1 }}><div style={{ fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 15 }}>{t.rider.name ?? 'Your rider'}</div><div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Courier</div></div>
            <button
              onClick={() => { if (t.rider?.phone) window.location.href = `tel:${t.rider.phone}`; }}
              disabled={!t.rider?.phone}
              title={t.rider?.phone ? `Call ${t.rider.phone}` : 'No number available'}
              style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg,#2FE082,#14B86A)', color: '#04231a', display: 'grid', placeItems: 'center', cursor: t.rider?.phone ? 'pointer' : 'not-allowed', opacity: t.rider?.phone ? 1 : .5 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 5c0 8 7 15 15 15l2-3-4-2-2 2c-3-1.5-6-4.5-7.5-7.5l2-2-2-4-3 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
            </button>
            <button onClick={() => setChat(true)}
              style={{ width: 42, height: 42, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 3v-3H6a2 2 0 01-2-2V6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
            </button>
          </div>
        )}
      </div>
      {chat && id && <ChatPanel orderId={id} me="user" onClose={() => setChat(false)} />}
    </div>
  );
}
