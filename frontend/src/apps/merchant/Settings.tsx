import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { clearToken } from '../../lib/token';
import { updateProfile, type Store } from '../../lib/merchant';

export function Settings({ store, onStoreChange, onBack, onEditLocation, onLoggedOut }: {
  store: Store; onStoreChange: (s: Store) => void; onBack: () => void; onEditLocation: () => void; onLoggedOut: () => void;
}) {
  const [account, setAccount] = useState<{ email?: string; phone?: string; name?: string }>({});
  const [name, setName] = useState(store.name ?? '');
  const [category, setCategory] = useState(store.category ?? '');
  const [bank, setBank] = useState(store.payout_bank ?? '');
  const [acct, setAcct] = useState(store.payout_account ?? '');
  const [acctName, setAcctName] = useState(store.payout_name ?? '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { api<{ account: any }>('/auth/me').then((r) => setAccount(r.account)).catch(() => {}); }, []);

  async function save() {
    setErr(null); setSaved(false); setBusy(true);
    try {
      const { store: updated } = await updateProfile({ name, category, payout_bank: bank, payout_account: acct, payout_name: acctName });
      onStoreChange(updated); setSaved(true);
    } catch (e: any) { setErr(e.message ?? 'Could not save'); }
    finally { setBusy(false); }
  }

  const label = { fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '.05em', margin: '2px 0 6px' };
  const sec = { fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 13, color: 'var(--muted2, #566360)', textTransform: 'uppercase' as const, letterSpacing: '.12em', marginTop: 10 } as const;
  const ro = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 14px', fontSize: 14, color: 'var(--muted)' } as const;
  const rowBtn = { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px', cursor: 'pointer' } as const;

  return (
    <div style={{ maxWidth: 448, margin: '0 auto', minHeight: '100vh', background: 'var(--bg)', ['--accent' as any]: '#2EE6C6', ['--accent-deep' as any]: '#12B5A4', ['--acctxt' as any]: '#04201c' } as any}>
      <div className="m-header">
        <button className="icon-btn" onClick={onBack}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span className="page-title" style={{ marginLeft: 4 }}>Settings</span>
      </div>

      <div className="m-body" style={{ gap: 12 }}>
        <div style={sec}>Store</div>
        <div><div style={label}>Store name</div><input className="din" style={{ margin: 0 }} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><div style={label}>Category</div><input className="din" style={{ margin: 0 }} placeholder="e.g. Restaurant, Provisions" value={category} onChange={(e) => setCategory(e.target.value)} /></div>
        <div><div style={label}>Location</div>
          <div style={rowBtn} onClick={onEditLocation}>
            <span style={{ flex: 1, fontSize: 14 }}>{store.address ?? 'Set your location'}</span>
            <span style={{ color: 'var(--accent)', fontSize: 13 }}>Change</span>
          </div>
        </div>

        <div style={sec}>Account</div>
        <div><div style={label}>Email</div><div style={ro}>{account.email ?? '—'}</div></div>
        <div><div style={label}>Phone</div><div style={ro}>{account.phone ?? '—'}</div></div>

        <div style={sec}>Payout</div>
        <div><div style={label}>Bank name</div><input className="din" style={{ margin: 0 }} value={bank} onChange={(e) => setBank(e.target.value)} /></div>
        <div><div style={label}>Account number</div><input className="din" style={{ margin: 0 }} inputMode="numeric" value={acct} onChange={(e) => setAcct(e.target.value)} /></div>
        <div><div style={label}>Account name</div><input className="din" style={{ margin: 0 }} value={acctName} onChange={(e) => setAcctName(e.target.value)} /></div>

        <div style={sec}>Verification</div>
        <div style={{ ...rowBtn, cursor: 'default', opacity: 0.6 }}>
          <span style={{ flex: 1, fontSize: 14 }}>Not verified</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Coming soon</span>
        </div>

        {err && <div className="login-err">{err}</div>}
        {saved && <div style={{ color: 'var(--accent)', fontSize: 13 }}>Saved ✓</div>}

        <button className="dbtn" style={{ marginTop: 6 }} onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        <button className="dbtn" style={{ marginTop: 4, background: 'transparent', color: '#ff6b6b', border: '1px solid #3a2626' }} onClick={() => { clearToken(); onLoggedOut(); }}>Log out</button>
      </div>
    </div>
  );
}
