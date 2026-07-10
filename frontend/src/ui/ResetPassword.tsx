import { useState } from 'react';
import { resetPassword } from '../lib/auth';

export function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (pw.length < 6) return setErr('Password must be at least 6 characters');
    if (pw !== pw2) return setErr('Passwords do not match');
    setBusy(true);
    try { await resetPassword(token, pw); setDone(true); }
    catch (e: any) { setErr(e.message ?? 'Invalid or expired link'); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', padding: 24 }}>
      <div className="login-card" style={{ maxWidth: 360 }}>
        {!token ? (
          <><h1>Invalid link</h1><p className="sub">This reset link is missing or broken. Request a new one from the app.</p></>
        ) : done ? (
          <><h1>Password updated</h1><p className="sub">You can now log in with your new password. You can close this page and open the app.</p></>
        ) : (
          <>
            <h1>Set a new password</h1>
            <p className="sub">Choose a strong password you'll remember.</p>
            <input className="din" type="password" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <input className="din" type="password" placeholder="Confirm new password" value={pw2} onChange={(e) => setPw2(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
            {err && <div className="login-err">{err}</div>}
            <button className="dbtn" onClick={submit} disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
          </>
        )}
      </div>
    </div>
  );
}
