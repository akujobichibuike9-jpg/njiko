import { useState, type CSSProperties } from 'react';
import { ROLE_ACCENT, type Role } from './lib/role';
import { signup, login } from './lib/auth';

const labels: Record<Role, string> = {
  user: 'Customer', merchant: 'Merchant', rider: 'Rider', admin: 'Admin',
};

export function AuthScreen({ role, onAuthed }: { role: Role; onAuthed: () => void }) {
  const a = ROLE_ACCENT[role];
  const vars = { '--accent': a.accent, '--accent-deep': a.deep, '--acctxt': a.text } as CSSProperties;

  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signup({ role, name, email: email || undefined, phone: phone || undefined, password });
      } else {
        await login({ role, identifier, password });
      }
      onAuthed();
    } catch (e: any) {
      setErr(e.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="warm-screen" style={vars}>
      <div className="warm-pad">
        <div className="brandmark">◆</div>
        <h1 className="warm-h1">{mode === 'signup' ? 'Create account' : 'Welcome back'}</h1>
        <p className="warm-sub">
          {labels[role]} · {mode === 'signup' ? 'sign up to continue' : 'log in to continue'}
        </p>

        {mode === 'signup' && (
          <div className="warm-field">
            <label>Full name</label>
            <div className="warm-input"><input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          </div>
        )}

        {mode === 'signup' ? (
          <>
            <div className="warm-field">
              <label>Email</label>
              <div className="warm-input"><input placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            </div>
            <div className="warm-field">
              <label>Phone</label>
              <div className="warm-input"><input placeholder="0803 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            </div>
          </>
        ) : (
          <div className="warm-field">
            <label>Email or phone</label>
            <div className="warm-input"><input placeholder="you@email.com" value={identifier} onChange={(e) => setIdentifier(e.target.value)} /></div>
          </div>
        )}

        <div className="warm-field">
          <label>Password</label>
          <div className="warm-input"><input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        </div>

        {err && <div className="warm-err">{err}</div>}

        <button className="warm-cta" onClick={submit} disabled={busy}>
          {busy ? '…' : mode === 'signup' ? 'Create account' : 'Log in'}
        </button>

        <p className="warm-alt" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setErr(null); }}>
          {mode === 'signup' ? <>Already have an account? <b>Log in</b></> : <>New here? <b>Create an account</b></>}
        </p>

        <div className="spacer" />
      </div>
    </div>
  );
}
