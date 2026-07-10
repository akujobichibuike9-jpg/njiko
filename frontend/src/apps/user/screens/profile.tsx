import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearToken } from '../../../lib/token';
import { getMe, updateMe } from '../../../lib/account';
import { getProfile, setAddressAuto, setAddressManual, type UserProfile } from '../../../lib/user';

export function Profile({ onLogout }: { onLogout: () => void }) {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingAcct, setSavingAcct] = useState(false);
  const [acctMsg, setAcctMsg] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [addrErr, setAddrErr] = useState<string | null>(null);

  useEffect(() => {
    getMe().then((r) => { setName(r.account.name ?? ''); setEmail(r.account.email ?? ''); setPhone(r.account.phone ?? ''); }).catch(() => {});
    getProfile().then((r) => setProfile(r.profile)).catch(() => {});
  }, []);

  async function saveAccount() {
    setAcctMsg(null); setSavingAcct(true);
    try { await updateMe({ name: name.trim(), phone: phone.trim() }); setAcctMsg('Saved ✓'); }
    catch (e: any) { setAcctMsg(e.message ?? 'Could not save'); }
    finally { setSavingAcct(false); }
  }

  function useLoc() {
    setAddrErr(null);
    if (!navigator.geolocation) { setAddrErr('Location not available'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => { try { const { profile } = await setAddressAuto(pos.coords.latitude, pos.coords.longitude); setProfile(profile); setEditing(false); } catch (e: any) { setAddrErr(e.message); } finally { setBusy(false); } },
      () => { setBusy(false); setAddrErr('Permission denied — enter it manually.'); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }
  async function saveManual() {
    setAddrErr(null);
    if (manual.trim().length < 3) { setAddrErr('Enter your address'); return; }
    setBusy(true);
    try { const { profile } = await setAddressManual(manual.trim()); setProfile(profile); setEditing(false); }
    catch (e: any) { setAddrErr(e.message); } finally { setBusy(false); }
  }

  const sec = { fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 13, color: '#66756f', textTransform: 'uppercase' as const, letterSpacing: '.12em', marginTop: 12 } as const;
  const label = { fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '.05em', margin: '2px 0 6px' } as const;
  const ro = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 14px', fontSize: 14, color: 'var(--muted)' } as const;
  const seg = (on: boolean) => ({ flex: 1, padding: 11, borderRadius: 11, cursor: 'pointer', textAlign: 'center' as const, fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--disp)', border: '1px solid var(--border)', background: on ? 'rgba(47,224,130,.1)' : 'transparent', color: on ? 'var(--accent)' : 'var(--muted)' });

  return (
    <>
      <div className="m-header"><span className="page-title">Profile</span></div>
      <div className="u-body" style={{ gap: 12 }}>
        <div style={sec}>Account</div>
        <div><div style={label}>Name</div><input className="din" style={{ margin: 0 }} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><div style={label}>Email</div><div style={ro}>{email || '—'}</div></div>
        <div><div style={label}>Phone</div><input className="din" style={{ margin: 0 }} inputMode="tel" placeholder="Add a phone number" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        {acctMsg && <div style={{ fontSize: 13, color: acctMsg.includes('✓') ? 'var(--accent)' : '#ff6b6b' }}>{acctMsg}</div>}
        <button className="dbtn" style={{ margin: 0 }} onClick={saveAccount} disabled={savingAcct}>{savingAcct ? 'Saving…' : 'Save account'}</button>

        <div style={sec}>Delivery address</div>
        {!editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
            <span style={{ flex: 1, fontSize: 14 }}>{profile?.address ?? 'No address set'}</span>
            <span style={{ color: 'var(--accent)', fontSize: 13, cursor: 'pointer' }} onClick={() => setEditing(true)}>{profile?.address ? 'Change' : 'Set'}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={seg(mode === 'auto')} onClick={() => setMode('auto')}>Use my location</div>
              <div style={seg(mode === 'manual')} onClick={() => setMode('manual')}>Enter manually</div>
            </div>
            {mode === 'auto'
              ? <button className="dbtn" onClick={useLoc} disabled={busy}>{busy ? 'Getting location…' : 'Use my current location'}</button>
              : <><input className="din" style={{ margin: 0 }} placeholder="Street, area, city" value={manual} onChange={(e) => setManual(e.target.value)} /><button className="dbtn" onClick={saveManual} disabled={busy}>{busy ? 'Saving…' : 'Save address'}</button></>}
            {addrErr && <div className="login-err">{addrErr}</div>}
            <span style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', cursor: 'pointer' }} onClick={() => { setEditing(false); setAddrErr(null); }}>Cancel</span>
          </div>
        )}

        <div style={sec}>Activity</div>
        <button onClick={() => nav('/history')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 15, cursor: 'pointer', width: '100%', color: 'var(--text)', fontFamily: 'inherit' }}>
          <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 600 }}>Order history</span>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>

        <button className="dbtn" style={{ marginTop: 10, background: 'transparent', color: '#ff6b6b', border: '1px solid #3a2626' }} onClick={() => { clearToken(); onLogout(); }}>Log out</button>
      </div>
    </>
  );
}
