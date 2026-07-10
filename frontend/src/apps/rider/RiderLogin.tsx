import { useState, type CSSProperties } from 'react';
import { NjikoMark } from '../../ui/NjikoMark';
import { RoleBackButton } from '../../ui/RoleBackButton';
import { ForgotPassword } from '../../ui/ForgotPassword';
import { signup, login } from '../../lib/auth';

const orange = { '--accent': '#FF8A3D', '--accent-deep': '#F2671E', '--acctxt': '#2a1400' } as CSSProperties;

export function RiderLogin({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(null); setBusy(true);
    try {
      if (mode === 'signup') await signup({ role: 'rider', name, email, password });
      else await login({ role: 'rider', identifier, password });
      onDone();
    } catch (e: any) { setErr(e.message ?? 'Something went wrong'); }
    finally { setBusy(false); }
  }

  return (
    <div className="login" style={orange}>
      <RoleBackButton />
      <NjikoMark size={52} className="login-mark" />
      <h1>{mode === 'signup' ? 'Become a rider' : 'Welcome back'}</h1>
      <p className="sub">{mode === 'signup' ? 'Earn by delivering orders' : 'Log in to start delivering'}</p>
      {mode === 'signup' && <input className="din" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />}
      {mode === 'signup'
        ? <input className="din" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        : <input className="din" placeholder="Email or phone" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />}
      <input className="din" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {err && <div className="login-err">{err}</div>}
      <button className="dbtn" onClick={submit} disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}</button>
      <p className="alt" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setErr(null); }}>
        {mode === 'signup' ? <>Already a rider? <b>Log in</b></> : <>New rider? <b>Create an account</b></>}
      </p>
      <ForgotPassword role="rider" />
    </div>
  );
}
