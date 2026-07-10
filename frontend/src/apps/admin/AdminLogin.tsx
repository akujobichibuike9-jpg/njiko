import { useState } from 'react';
import { NjikoMark } from '../../ui/NjikoMark';
import { adminLogin } from '../../lib/admin';

export function AdminLogin({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(null); setBusy(true);
    try { await adminLogin(username.trim(), password); onDone(); }
    catch (e: any) { setErr(e.message ?? 'Login failed'); }
    finally { setBusy(false); }
  }

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <div className="admin-login-brand"><NjikoMark size={40} /><span className="admin-login-word">Njiko</span></div>
        <div className="admin-login-badge">◆ Ultimate</div>
        <h1>Admin access</h1>
        <p>Restricted. Authorized personnel only.</p>
        <input className="ain" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="ain" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        {err && <div className="admin-err">{err}</div>}
        <button className="abtn" onClick={submit} disabled={busy}>{busy ? 'Verifying…' : 'Enter'}</button>
      </div>
    </div>
  );
}
