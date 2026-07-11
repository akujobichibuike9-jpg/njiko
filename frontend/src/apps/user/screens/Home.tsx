import { useMemo, useState } from 'react';
import { useCached } from '../../../lib/cache';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api';
import { getProfile } from '../../../lib/user';
import { listStores, type StoreSummary } from '../../../lib/catalog';

const PALETTE = ['#FF8A3D', '#2FE082', '#4CC9F0', '#F72585', '#FBA94C', '#9B5DE5', '#00BBF9', '#F15BB5'];
function colorFor(str: string) {
  let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

const bell = (<svg viewBox="0 0 24 24" width="19" height="19" fill="none"><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" stroke="currentColor" strokeWidth="1.6" /><path d="M10 20a2 2 0 004 0" stroke="currentColor" strokeWidth="1.6" /></svg>);
const pin = (<svg viewBox="0 0 24 24" width="12" height="12" fill="none"><path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.7" /></svg>);

export function Home() {
  const [cat, setCat] = useState('All');

  // Cached: revisiting Home paints instantly from the last data, then refreshes in the background.
  const me = useCached('me', () => api<{ account: any }>('/auth/me'));
  const prof = useCached('profile', () => getProfile());
  const st = useCached('stores', () => listStores());

  const name = (me.data?.account?.name ?? '').split(' ')[0];
  const address = prof.data?.profile?.address ?? null;
  const stores: StoreSummary[] | null = st.data ? st.data.stores : (st.loading ? null : []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    (stores ?? []).forEach((s) => s.category && set.add(s.category));
    return ['All', ...Array.from(set)];
  }, [stores]);

  const filtered = (stores ?? []).filter((s) => cat === 'All' || s.category === cat);

  return (
    <div className="uhome">
      <header className="uh-top">
        <div>
          <div className="uh-hi">Hey{name ? ` ${name}` : ''} <span style={{ WebkitTextFillColor: 'initial' }}>👋</span></div>
          <div className="uh-loc">{pin}<span>{address ?? 'Set your delivery address'}</span></div>
        </div>
        <button className="uh-bell">{bell}</button>
      </header>

      <div className="uh-search">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" /><path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
        <span>Search food or stores…</span>
      </div>

      <div className="uh-chips">
        {categories.map((c, i) => {
          const on = c === cat;
          const color = c === 'All' ? 'var(--accent)' : colorFor(c);
          return (
            <button key={c} className={`uchip ${on ? 'on' : ''}`} onClick={() => setCat(c)}
              style={on ? { background: color, borderColor: 'transparent', color: '#04150f' } : { color }}>
              {c}
            </button>
          );
        })}
      </div>

      <div className="uh-sec">Stores near you</div>

      {stores === null ? (
        <div className="empty"><div className="ed">Loading…</div></div>
      ) : filtered.length === 0 ? (
        <div className="empty"><div className="et">No stores yet</div><div className="ed">Stores show up here once merchants set up shop.</div></div>
      ) : (
        <div className="uh-stores">
          {filtered.map((s) => {
            const color = colorFor(s.id);
            const initial = (s.name ?? '?').trim().charAt(0).toUpperCase();
            return (
              <Link to={`/store/${s.id}`} className="ustore" key={s.id}>
                <div className="ustore-cover" style={{ background: `linear-gradient(135deg, ${color}, ${color}77)` }}>
                  <span className="ustore-init">{initial}</span>
                  <span className={`ustore-pill ${s.online ? 'open' : 'closed'}`}>{s.online ? 'OPEN' : 'CLOSED'}</span>
                </div>
                <div className="ustore-info">
                  <div className="ustore-nm">{s.name ?? 'Store'}</div>
                  <div className="ustore-mt">{[s.category, s.address].filter(Boolean).join(' · ') || 'Food'}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
