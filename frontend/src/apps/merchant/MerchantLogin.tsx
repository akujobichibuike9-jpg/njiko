import { useState } from 'react';
import { NjikoMark } from '../../ui/NjikoMark';
import { RoleBackButton } from '../../ui/RoleBackButton';
import { ForgotPassword } from '../../ui/ForgotPassword';
import { signup, login } from '../../lib/auth';

// Real auth: talks to the backend (/api/auth), which saves to Supabase.
export function MerchantLogin({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState(''); // email or phone (login)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signup({ role: 'merchant', name, email, password });
      } else {
        await login({ role: 'merchant', identifier, password });
      }
      onDone();
    } catch (e: any) {
      setErr(e.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <RoleBackButton />
      <NjikoMark size={52} className="login-mark" />
      <h1>{mode === 'signup' ? 'Create your store' : 'Welcome back'}</h1>
      <p className="sub">{mode === 'signup' ? 'Set up your merchant account' : 'Log in to your dashboard'}</p>

      {mode === 'signup' && (
        <input className="din" placeholder="Business name" value={name} onChange={(e) => setName(e.target.value)} />
      )}
      {mode === 'signup' ? (
        <input className="din" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      ) : (
        <input className="din" placeholder="Email or phone" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
      )}
      <input className="din" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

      {err && <div className="login-err">{err}</div>}

      <button className="dbtn" onClick={submit} disabled={busy}>
        {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
      </button>

      <p className="alt" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setErr(null); }}>
        {mode === 'signup' ? <>Already have a store? <b>Log in</b></> : <>New here? <b>Create your store</b></>}
      </p>
      <ForgotPassword role="merchant" />
    </div>
  );
}
