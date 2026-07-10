import { useEffect, useRef, useState } from 'react';
import { overview, globalSearch, type Overview as O, type AdminAccount, type AdminOrder } from '../../../lib/admin';
import type { GoOpts } from '../AdminApp';

export function Overview({ go }: { go: (tab: string, o?: GoOpts) => void }) {
  const [o, setO] = useState<O | null>(null);
  const [q, setQ] = useState('');
  const [res, setRes] = useState<{ accounts: AdminAccount[]; orders: AdminOrder[] } | null>(null);
  const timer = useRef<any>(null);

  useEffect(() => { overview().then(setO).catch(() => {}); }, []);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setRes(null); return; }
    timer.current = setTimeout(() => { globalSearch(q).then(setRes).catch(() => setRes(null)); }, 300);
  }, [q]);

  const cards = [
    { k: 'Customers', v: o?.users, go: () => go('people', { role: 'user' }) },
    { k: 'Merchants', v: o?.merchants, go: () => go('people', { role: 'merchant' }) },
    { k: 'Riders', v: o?.riders, go: () => go('people', { role: 'rider' }) },
    { k: 'Total orders', v: o?.orders, accent: true, go: () => go('orders', { filter: 'all' }) },
    { k: 'Delivered', v: o?.delivered, go: () => go('orders', { filter: 'delivered' }) },
    { k: 'Total order value', v: o ? `₦${Number(o.gmv).toLocaleString()}` : undefined, accent: true, go: () => go('orders', { filter: 'all' }) },
  ];

  return (
    <>
      <div className="admin-head"><h1>Overview</h1><p>Everything across the platform. Live platform numbers. Total order value is the money that has flowed through all orders.</p></div>

      <div className="admin-search">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" /><path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
        <input placeholder="Search anyone or any order number…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {res && (
        <div className="admin-panel">
          {res.accounts.length === 0 && res.orders.length === 0 ? <div className="admin-muted">No matches.</div> : (
            <>
              {res.accounts.map((a) => (
                <div className="admin-search-row" key={a.id} onClick={() => go('people', { role: a.role, openId: a.id })}>
                  <span className="admin-tagpill">{a.role}</span>
                  <b>{a.name ?? '—'}</b>
                  <span className="admin-muted">{a.email || a.phone || ''}</span>
                </div>
              ))}
              {res.orders.map((r) => (
                <div className="admin-search-row" key={r.id} onClick={() => go('orders', { filter: 'all', openId: r.id })}>
                  <span className="admin-tagpill order">order</span>
                  <b style={{ fontFamily: 'var(--mono)' }}>#{r.id.slice(0, 8)}</b>
                  <span className="admin-muted">{r.store_name ?? ''} · {r.status} · ₦{Number(r.total).toLocaleString()}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <div className="admin-cards">
        {cards.map((c) => (
          <button className={`admin-card clickable ${c.accent ? 'accent starry' : ''}`} key={c.k} onClick={c.go}>
            <div className="admin-card-k">{c.k}</div>
            <div className="admin-card-v">{c.v ?? '—'}</div>
            <span className="admin-card-go">View →</span>
          </button>
        ))}
      </div>

      <div className="admin-panel starry">
        <h2>Orders by status</h2>
        {!o ? <div className="admin-muted">Loading…</div> : o.ordersByStatus.length === 0 ? <div className="admin-muted">No orders yet.</div> : (
          <div className="admin-bars">
            {o.ordersByStatus.map((r) => {
              const max = Math.max(...o.ordersByStatus.map((x) => x.n));
              return (
                <div className="admin-bar-row" key={r.status} onClick={() => go('orders', { filter: 'all' })} style={{ cursor: 'pointer' }}>
                  <span className="admin-bar-label">{r.status}</span>
                  <div className="admin-bar-track"><div className="admin-bar-fill" style={{ width: `${(r.n / max) * 100}%` }} /></div>
                  <span className="admin-bar-n">{r.n}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
