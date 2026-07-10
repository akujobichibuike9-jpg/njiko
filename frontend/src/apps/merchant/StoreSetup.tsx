import { useState } from 'react';
import { setLocationAuto, setLocationManual, type Store } from '../../lib/merchant';

export function StoreSetup({ existing, onDone }: { existing: Store | null; onDone: (s: Store) => void }) {
  const [mode, setMode] = useState<'auto' | 'manual'>(existing?.location_mode === 'manual' ? 'manual' : 'auto');
  const [manual, setManual] = useState(existing?.address ?? '');
  const [result, setResult] = useState<Store | null>(existing?.address ? existing : null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function useMyLocation() {
    setErr(null);
    if (!navigator.geolocation) { setErr('Location is not available on this device'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { store } = await setLocationAuto(pos.coords.latitude, pos.coords.longitude);
          setResult(store);
        } catch (e: any) { setErr(e.message ?? 'Could not save location'); }
        finally { setBusy(false); }
      },
      () => { setBusy(false); setErr('Location permission denied — allow it, or enter your address manually.'); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function saveManual() {
    setErr(null);
    if (manual.trim().length < 3) { setErr('Enter your store address'); return; }
    setBusy(true);
    try {
      const { store } = await setLocationManual(manual.trim());
      setResult(store);
    } catch (e: any) { setErr(e.message ?? 'Could not save location'); }
    finally { setBusy(false); }
  }

  const chip = { background: 'rgba(46,230,198,.08)', border: '1px solid rgba(46,230,198,.3)', color: 'var(--accent)', borderRadius: 12, padding: '12px 14px', fontSize: 13, marginBottom: 12 } as const;
  const seg = (on: boolean) => ({
    flex: 1, padding: 11, borderRadius: 11, cursor: 'pointer', textAlign: 'center' as const,
    fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--disp)', border: '1px solid var(--border)',
    background: on ? 'rgba(46,230,198,.1)' : 'transparent', color: on ? 'var(--accent)' : 'var(--muted)',
  });

  return (
    <div className="login" style={{ ['--accent' as any]: '#2EE6C6', ['--accent-deep' as any]: '#12B5A4', ['--acctxt' as any]: '#04201c' }}>
      <div className="brand">◆</div>
      <h1>Set up your store</h1>
      <p className="sub">Where should riders pick up orders?</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={seg(mode === 'auto')} onClick={() => setMode('auto')}>Use my location</div>
        <div style={seg(mode === 'manual')} onClick={() => setMode('manual')}>Enter manually</div>
      </div>

      {result?.address && <div style={chip}>📍 {result.address}</div>}

      {mode === 'auto' ? (
        <button className="dbtn" onClick={useMyLocation} disabled={busy}>
          {busy ? 'Getting location…' : result ? 'Update my location' : 'Use my current location'}
        </button>
      ) : (
        <>
          <input className="din" placeholder="Street, area, city" value={manual} onChange={(e) => setManual(e.target.value)} />
          <button className="dbtn" onClick={saveManual} disabled={busy}>{busy ? 'Saving…' : 'Save address'}</button>
        </>
      )}

      {err && <div className="login-err">{err}</div>}

      {result && (
        <button className="dbtn" style={{ marginTop: 10, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }} onClick={() => onDone(result)}>
          Continue to dashboard
        </button>
      )}
    </div>
  );
}
