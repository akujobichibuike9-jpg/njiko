import { useEffect, useState } from 'react';
import { IconInbox } from '../../../ui/icons';
import { availableJobs, acceptJob, type Order } from '../../../lib/orders';

export function Jobs() {
  const [online, setOnline] = useState(true);
  const [jobs, setJobs] = useState<Order[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => availableJobs().then((r) => setJobs(r.orders)).catch(() => setJobs([]));
  useEffect(() => { load(); const t = setInterval(load, 6000); return () => clearInterval(t); }, []);

  async function accept(id: string) {
    setBusy(id);
    try { await acceptJob(id); } catch { /* taken by someone else */ }
    finally { setBusy(null); load(); }
  }

  return (
    <>
      <div className="m-header"><span className="page-title">Available jobs</span></div>
      <div className="m-body">
        <div className={`status-card ${online ? 'on' : ''}`} onClick={() => setOnline(!online)}>
          <span className="pulse" />
          <div>
            <div className="t">{online ? "You're online" : "You're offline"}</div>
            <div className="d">{online ? 'Looking for jobs near you' : 'Go online to see jobs'}</div>
          </div>
          <div className="switch2"><span className="k" /></div>
        </div>

        {!online ? null : jobs === null ? (
          <div className="empty"><div className="ed">Loading…</div></div>
        ) : jobs.length === 0 ? (
          <div className="empty">
            <div className="ec"><IconInbox /></div>
            <div className="et">No jobs right now</div>
            <div className="ed">Ready orders waiting for pickup will appear here.</div>
          </div>
        ) : (
          jobs.map((o) => (
            <div key={o.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 15, display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--accent)', marginTop: 2 }}>●</span>
                  <div><div style={{ fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--disp)' }}>{o.store_name ?? 'Store'}</div><div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{o.store_address ?? 'Pickup'}</div></div>
                </div>
                <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <span style={{ color: '#888', marginTop: 2 }}>○</span>
                  <div><div style={{ fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--disp)' }}>Customer</div><div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{o.delivery_address ?? 'Dropoff'}</div></div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#aab8b5', borderTop: '1px solid var(--border)', paddingTop: 10 }}>{o.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}</div>
              <button className="dbtn" style={{ margin: 0 }} onClick={() => accept(o.id)} disabled={busy === o.id}>{busy === o.id ? 'Accepting…' : 'Accept delivery'}</button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
