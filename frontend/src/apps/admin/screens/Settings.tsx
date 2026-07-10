import { useEffect, useState } from 'react';
import { platformStatus, setMaintenance } from '../../../lib/admin';

export function Settings() {
  const [maint, setMaint] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { platformStatus().then((s) => setMaint(!!s.maintenance)); }, []);

  async function toggle() {
    setBusy(true);
    try { const r = await setMaintenance(!maint); setMaint(r.maintenance); } finally { setBusy(false); }
  }

  return (
    <>
      <div className="admin-head"><h1>Controls</h1><p>Platform-wide switches.</p></div>

      <div className={`admin-panel admin-kill ${maint ? 'on' : ''}`}>
        <div style={{ flex: 1 }}>
          <h2>{maint ? 'Platform is OFFLINE' : 'Platform is live'}</h2>
          <p className="admin-muted">{maint ? 'Customers, merchants and riders currently see the maintenance screen. Admin still works.' : 'Turning this off shows everyone a maintenance screen. Only /ultimate stays accessible.'}</p>
        </div>
        <button className={`admin-switch ${maint ? 'on' : ''}`} onClick={toggle} disabled={busy}><span /></button>
      </div>

      <div className="admin-panel">
        <h2>Coming next</h2>
        <p className="admin-muted">Transactions &amp; balances, ad banner manager (photo/video), sub-admin accounts (approve requests, issue &amp; revoke credentials), and driver route replay — these bolt on in the next admin passes.</p>
      </div>
    </>
  );
}
