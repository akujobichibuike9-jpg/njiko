import { useState } from 'react';
import { isAuthed, clearToken, setActiveRole } from '../../lib/token';
import { NjikoMark } from '../../ui/NjikoMark';
import { AdminLogin } from './AdminLogin';
import { Overview } from './screens/Overview';
import { People } from './screens/People';
import { Orders } from './screens/Orders';
import { Fleet } from './screens/Fleet';
import { Flagged } from './screens/Flagged';
import { Settings } from './screens/Settings';

export interface GoOpts { role?: string; filter?: string; openId?: string; }

const nav = [
  { id: 'overview', label: 'Overview', icon: 'M4 11l8-7 8 7v8a1 1 0 01-1 1h-5v-6h-4v6H5a1 1 0 01-1-1z' },
  { id: 'people', label: 'People', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0' },
  { id: 'orders', label: 'Orders', icon: 'M4 5h16M4 12h16M4 19h10' },
  { id: 'fleet', label: 'Live map', icon: 'M9 20l-5.5 2V6L9 4m0 16l6-2m-6 2V4m6 14l5.5 2V4L15 6m0 12V6m0 0L9 4' },
  { id: 'flagged', label: 'Flagged', icon: 'M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z' },
  { id: 'settings', label: 'Controls', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM4 12h2m12 0h2M12 4v2m0 12v2' },
];
const logoutIcon = 'M14 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2v-2M9 12h12m0 0l-3-3m3 3l-3 3';

export function AdminApp() {
  setActiveRole('admin');
  const [authed, setAuthed] = useState(isAuthed('admin'));
  const [tab, setTab] = useState('overview');
  const [peopleRole, setPeopleRole] = useState('user');
  const [ordersFilter, setOrdersFilter] = useState('live');
  const [openAcct, setOpenAcct] = useState<string | undefined>();
  const [openOrder, setOpenOrder] = useState<string | undefined>();
  const [min, setMin] = useState(false);

  function go(t: string, o: GoOpts = {}) {
    if (o.role) setPeopleRole(o.role);
    if (o.filter) setOrdersFilter(o.filter);
    if (t === 'people') setOpenAcct(o.openId);
    if (t === 'orders') setOpenOrder(o.openId);
    setTab(t);
  }

  if (!authed) return <AdminLogin onDone={() => setAuthed(true)} />;

  return (
    <div className="admin">
      <nav className={`admin-nav ${min ? 'min' : ''}`}>
        <div className="admin-nav-logo"><NjikoMark size={22} /><span className="nav-label">Njiko</span></div>
        {nav.map((n) => (
          <button key={n.id} className={`admin-nav-a ${tab === n.id ? 'on' : ''}`} onClick={() => go(n.id)}>
            <svg viewBox="0 0 24 24" fill="none" width="19" height="19"><path d={n.icon} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="nav-label">{n.label}</span>
          </button>
        ))}
        <div className="admin-nav-foot">
          <button className="admin-nav-a" onClick={() => { clearToken('admin'); setAuthed(false); }}>
            <svg viewBox="0 0 24 24" fill="none" width="19" height="19"><path d={logoutIcon} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="nav-label">Log out</span>
          </button>
        </div>
      </nav>
      <main className="admin-main" onScroll={(e) => setMin((e.target as HTMLElement).scrollTop > 40)}>
        {tab === 'overview' && <Overview go={go} />}
        {tab === 'people' && <People initialRole={peopleRole} openId={openAcct} />}
        {tab === 'orders' && <Orders initialFilter={ordersFilter} openId={openOrder} />}
        {tab === 'fleet' && <Fleet />}
        {tab === 'flagged' && <Flagged />}
        {tab === 'settings' && <Settings />}
      </main>
    </div>
  );
}
