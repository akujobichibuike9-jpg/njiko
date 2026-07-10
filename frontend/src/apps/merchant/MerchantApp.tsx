import { useEffect, useState } from 'react';
import { isAuthed, clearToken, setActiveRole } from '../../lib/token';
import { getStore, type Store } from '../../lib/merchant';
import { AppShell } from '../../ui/AppShell';
import { BottomNav, type Tab } from '../../ui/BottomNav';
import { IconHome, IconOrders, IconMenu, IconEarnings } from '../../ui/icons';
import { MerchantLogin } from './MerchantLogin';
import { StoreSetup } from './StoreSetup';
import { Settings } from './Settings';
import { Dashboard } from './screens/Dashboard';
import { Orders } from './screens/Orders';
import { Menu } from './screens/Menu';
import { Earnings } from './screens/Earnings';

const tabs: Tab[] = [
  { id: 'home', label: 'Home', icon: <IconHome /> },
  { id: 'orders', label: 'Orders', icon: <IconOrders /> },
  { id: 'menu', label: 'Menu', icon: <IconMenu /> },
  { id: 'earnings', label: 'Earnings', icon: <IconEarnings /> },
];

export function MerchantApp() {
  setActiveRole('merchant');
  const [authed, setAuthed] = useState(isAuthed('merchant'));
  const [store, setStore] = useState<Store | null | undefined>(undefined);
  const [editingLocation, setEditingLocation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab] = useState('home');

  useEffect(() => {
    if (!authed) { setStore(undefined); return; }
    let alive = true;
    getStore().then((r) => { if (alive) setStore(r.store); }).catch(() => { if (alive) setStore(null); });
    return () => { alive = false; };
  }, [authed]);

  function logout() { clearToken(); setAuthed(false); setStore(undefined); setShowSettings(false); }

  if (!authed) return <MerchantLogin onDone={() => setAuthed(true)} />;
  if (store === undefined) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#7E8C8A' }}>Loading…</div>;
  if (!store || !store.address || editingLocation) {
    return <StoreSetup existing={store} onDone={(s) => { setStore(s); setEditingLocation(false); }} />;
  }
  if (showSettings) {
    return (
      <Settings
        store={store}
        onStoreChange={setStore}
        onBack={() => setShowSettings(false)}
        onEditLocation={() => { setShowSettings(false); setEditingLocation(true); }}
        onLoggedOut={logout}
      />
    );
  }

  return (
    <AppShell accent="merchant">
      {tab === 'home' && <Dashboard store={store} onEditLocation={() => setEditingLocation(true)} onOpenSettings={() => setShowSettings(true)} onOpenOrders={() => setTab('orders')} onStoreChange={setStore} />}
      {tab === 'orders' && <Orders />}
      {tab === 'menu' && <Menu />}
      {tab === 'earnings' && <Earnings />}
      <BottomNav tabs={tabs} active={tab} onChange={setTab} />
    </AppShell>
  );
}
