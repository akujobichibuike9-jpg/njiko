import { useState } from 'react';
import { isAuthed, clearToken, setActiveRole } from '../../lib/token';
import { AppShell } from '../../ui/AppShell';
import { BottomNav, type Tab } from '../../ui/BottomNav';
import { IconOrders, IconPin, IconEarnings } from '../../ui/icons';
import { RiderLogin } from './RiderLogin';
import { Jobs } from './screens/Jobs';
import { Active } from './screens/Active';
import { Profile } from './screens/Profile';
import { Settings } from './screens/Settings';
import { RideHistory } from './screens/RideHistory';

const profileIcon = (<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" /><path d="M5 20a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.7" /></svg>);

const tabs: Tab[] = [
  { id: 'jobs', label: 'Jobs', icon: <IconOrders /> },
  { id: 'active', label: 'Active', icon: <IconPin /> },
  { id: 'earnings', label: 'Earnings', icon: <IconEarnings /> },
  { id: 'profile', label: 'Profile', icon: profileIcon },
];

function Earnings() {
  return (
    <>
      <div className="m-header"><span className="page-title">Earnings</span></div>
      <div className="m-body">
        <div className="bal-card">
          <div className="bl">Available to withdraw</div>
          <div className="bv">₦0</div>
          <button className="wbtn">Withdraw</button>
        </div>
        <div className="empty"><div className="et">No earnings yet</div><div className="ed">Completed deliveries will show up here.</div></div>
      </div>
    </>
  );
}

export function RiderApp() {
  setActiveRole('rider');
  const [authed, setAuthed] = useState(isAuthed('rider'));
  const [tab, setTab] = useState('jobs');
  const [profileView, setProfileView] = useState<null | 'settings' | 'history'>(null);

  if (!authed) return <RiderLogin onDone={() => setAuthed(true)} />;

  const logout = () => { clearToken(); setAuthed(false); };

  return (
    <AppShell accent="rider">
      {tab === 'jobs' && <Jobs />}
      {tab === 'active' && <Active />}
      {tab === 'earnings' && <Earnings />}
      {tab === 'profile' && (
        profileView === 'settings' ? <Settings onBack={() => setProfileView(null)} />
          : profileView === 'history' ? <RideHistory onBack={() => setProfileView(null)} />
            : <Profile onOpenSettings={() => setProfileView('settings')} onOpenHistory={() => setProfileView('history')} onLogout={logout} />
      )}
      <BottomNav tabs={tabs} active={tab} onChange={(id) => { setTab(id); setProfileView(null); }} />
    </AppShell>
  );
}
