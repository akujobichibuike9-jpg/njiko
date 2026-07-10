import { useEffect, useRef, useState } from 'react';
import { listAccounts, accountDetail, blockAccount, unblockAccount, deleteAccount, type AdminAccount } from '../../../lib/admin';

const tabs = [{ id: 'user', label: 'Customers' }, { id: 'merchant', label: 'Merchants' }, { id: 'rider', label: 'Riders' }];
const sorts = [{ id: 'recent', label: 'Newest' }, { id: 'oldest', label: 'Oldest' }, { id: 'name', label: 'Name A–Z' }];
const fmt = (ts: string) => new Date(ts).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });

export function People({ initialRole, openId }: { initialRole: string; openId?: string }) {
  const [role, setRole] = useState(initialRole);
  const [sort, setSort] = useState('recent');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<AdminAccount[] | null>(null);
  const [sel, setSel] = useState<{ account: AdminAccount; orders: any[] } | null>(null);
  const timer = useRef<any>(null);

  const load = () => { setRows(null); listAccounts(role, q, sort).then((r) => setRows(r.accounts)).catch(() => setRows([])); };
  useEffect(() => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(load, 250); }, [role, sort, q]);
  useEffect(() => { setRole(initialRole); }, [initialRole]);
  useEffect(() => { if (openId) accountDetail(openId).then(setSel).catch(() => {}); }, [openId]);

  async function open(id: string) { const d = await accountDetail(id); setSel(d); }
  async function act(fn: (id: string) => Promise<any>, id: string) { await fn(id); load(); if (sel?.account.id === id) open(id); }
  async function remove(id: string) { if (!confirm('Permanently delete this account and all its data?')) return; await deleteAccount(id); setSel(null); load(); }

  return (
    <>
      <div className="admin-head"><h1>People</h1><p>Every account on the platform.</p></div>

      <div className="admin-toolbar">
        <div className="admin-seg">
          {tabs.map((t) => <button key={t.id} className={`admin-seg-a ${role === t.id ? 'on' : ''}`} onClick={() => setRole(t.id)}>{t.label}</button>)}
        </div>
        <div className="admin-search sm">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" /><path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          <input placeholder="Search name, email, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="admin-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          {sorts.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      <div className="admin-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Contact</th><th>Joined</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows === null ? <tr><td colSpan={5} className="admin-muted" style={{ padding: 20 }}>Loading…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={5} className="admin-muted" style={{ padding: 20 }}>No accounts.</td></tr>
              : rows.map((a) => (
                <tr key={a.id} onClick={() => open(a.id)} className="admin-row">
                  <td><b>{a.name ?? '—'}</b></td>
                  <td>{a.email || a.phone || '—'}</td>
                  <td>{fmt(a.created_at)}</td>
                  <td>{a.blocked ? <span className="admin-pill red">Blocked</span> : <span className="admin-pill green">Active</span>}</td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    {a.blocked ? <button className="admin-mini" onClick={() => act(unblockAccount, a.id)}>Unblock</button> : <button className="admin-mini" onClick={() => act(blockAccount, a.id)}>Block</button>}
                    <button className="admin-mini danger" onClick={() => remove(a.id)}>Delete</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {sel && (
        <div className="admin-drawer" onClick={() => setSel(null)}>
          <div className="admin-drawer-card" onClick={(e) => e.stopPropagation()}>
            <button className="admin-drawer-x" onClick={() => setSel(null)}>✕</button>
            <h2>{sel.account.name ?? '—'}</h2>
            <div className="admin-kv"><span>Role</span><b>{sel.account.role}</b></div>
            <div className="admin-kv"><span>Email</span><b>{sel.account.email ?? '—'}</b></div>
            <div className="admin-kv"><span>Phone</span><b>{sel.account.phone ?? '—'}</b></div>
            <div className="admin-kv"><span>Joined</span><b>{fmt(sel.account.created_at)}</b></div>
            <div className="admin-kv"><span>Status</span><b>{sel.account.blocked ? 'Blocked' : 'Active'}</b></div>
            <div className="admin-kv"><span>Account ID</span><b style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{sel.account.id.slice(0, 12)}</b></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {sel.account.blocked ? <button className="admin-mini" onClick={() => act(unblockAccount, sel.account.id)}>Unblock</button> : <button className="admin-mini" onClick={() => act(blockAccount, sel.account.id)}>Block</button>}
              <button className="admin-mini danger" onClick={() => remove(sel.account.id)}>Delete</button>
            </div>
            <h3 style={{ marginTop: 20 }}>Order history ({sel.orders.length})</h3>
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {sel.orders.length === 0 ? <div className="admin-muted">None.</div> : sel.orders.map((o) => (
                <div className="admin-order-row" key={o.id}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>#{o.id.slice(0, 8)}</span>
                  <span>{o.status}</span>
                  <span>₦{Number(o.total).toLocaleString()}</span>
                  <span className="admin-muted" style={{ fontSize: 12 }}>{fmt(o.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
