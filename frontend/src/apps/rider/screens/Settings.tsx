import { useEffect, useState } from 'react';
import { getMe, updateMe } from '../../../lib/account';

const back = (<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);

export function Settings({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { getMe().then((r) => { setName(r.account.name ?? ''); setEmail(r.account.email ?? ''); setPhone(r.account.phone ?? ''); }).catch(() => {}); }, []);

  async function save() {
    setMsg(null); setBusy(true);
    try { await updateMe({ name: name.trim(), phone: phone.trim() }); setMsg('Saved ✓'); }
    catch (e: any) { setMsg(e.message ?? 'Could not save'); }
    finally { setBusy(false); }
  }

  const label = { fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '.05em', margin: '2px 0 6px' } as const;
  const ro = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 14px', fontSize: 14, color: 'var(--muted)' } as const;

  return (
    <>
      <div className="m-header">
        <button className="icon-btn" onClick={onBack}>{back}</button>
        <span className="page-title" style={{ marginLeft: 4 }}>Settings</span>
      </div>
      <div className="m-body" style={{ gap: 12 }}>
        <div><div style={label}>Name</div><input className="din" style={{ margin: 0 }} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><div style={label}>Email</div><div style={ro}>{email || '—'}</div></div>
        <div><div style={label}>Phone</div><input className="din" style={{ margin: 0 }} inputMode="tel" placeholder="Add a phone number" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        {msg && <div style={{ fontSize: 13, color: msg.includes('✓') ? 'var(--accent)' : '#ff6b6b' }}>{msg}</div>}
        <button className="dbtn" style={{ margin: 0 }} onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
    </>
  );
}
