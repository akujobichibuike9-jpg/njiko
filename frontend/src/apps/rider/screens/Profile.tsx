import { useEffect, useState } from 'react';
import { getMe } from '../../../lib/account';

const chevron = (<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);

export function Profile({ onOpenSettings, onOpenHistory, onLogout }: {
  onOpenSettings: () => void; onOpenHistory: () => void; onLogout: () => void;
}) {
  const [acct, setAcct] = useState<{ name?: string; email?: string; phone?: string }>({});
  useEffect(() => { getMe().then((r) => setAcct(r.account)).catch(() => {}); }, []);

  const row = (labelText: string, onClick: () => void) => (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: 15, cursor: 'pointer', width: '100%', color: 'var(--text)', fontFamily: 'inherit' }}>
      <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 600, fontFamily: 'var(--disp)' }}>{labelText}</span>
      {chevron}
    </button>
  );

  return (
    <>
      <div className="m-header"><span className="page-title">Profile</span></div>
      <div className="m-body" style={{ gap: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'linear-gradient(135deg,#3a2416,#241408)', border: '1px solid #4a3220', borderRadius: 18, padding: 18 }}>
          <div style={{ width: 52, height: 52, borderRadius: 15, background: 'linear-gradient(135deg,var(--accent),var(--accent-deep))', display: 'grid', placeItems: 'center', fontFamily: 'var(--disp)', fontWeight: 700, fontSize: 22, color: 'var(--acctxt)' }}>
            {(acct.name ?? '?').trim().charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 17 }}>{acct.name ?? 'Rider'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{acct.phone || acct.email || '—'}</div>
          </div>
        </div>

        {row('Settings', onOpenSettings)}
        {row('Ride history', onOpenHistory)}

        <button className="dbtn" style={{ marginTop: 8, background: 'transparent', color: '#ff6b6b', border: '1px solid #3a2626' }} onClick={onLogout}>Log out</button>
      </div>
    </>
  );
}
