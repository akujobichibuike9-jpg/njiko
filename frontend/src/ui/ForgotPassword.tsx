import { useState } from 'react';
import type { Role } from '../lib/role';
import { forgotPassword } from '../lib/auth';

export function ForgotPassword({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null); setBusy(true);
    try { await forgotPassword(role, email.trim()); setSent(true); }
    catch (e: any) { setErr(e.message ?? 'Something went wrong'); }
    finally { setBusy(false); }
  }
  function close() { setOpen(false); setSent(false); setEmail(''); setErr(null); }

  return (
    <>
      <p className="alt" style={{ marginTop: 6 }} onClick={() => setOpen(true)}><b>Forgot password?</b></p>
      {open && (
        <div className="fp-overlay" onClick={close}>
          <div className="fp-card" onClick={(e) => e.stopPropagation()}>
            {sent ? (
              <>
                <h3>Check your email</h3>
                <p>If that email is registered, a reset link is on its way. It expires in 1 hour.</p>
                <button className="dbtn" onClick={close}>Done</button>
              </>
            ) : (
              <>
                <h3>Reset your password</h3>
                <p>Enter the email on your account and we'll send you a reset link.</p>
                <input className="din" type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
                {err && <div className="login-err">{err}</div>}
                <button className="dbtn" onClick={submit} disabled={busy || !email.trim()}>{busy ? 'Sending…' : 'Send reset link'}</button>
                <p className="alt" onClick={close}>Cancel</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
