import { useEffect, useState } from 'react';
import { rememberedRole, roleFromPath, rememberRole, type Role } from './lib/role';
import { platformStatus } from './lib/admin';
import { Landing } from './Landing';
import { SplashScreen } from './ui/SplashScreen';
import { MerchantApp } from './apps/merchant/MerchantApp';
import { UserApp } from './apps/user/UserApp';
import { RiderApp } from './apps/rider/RiderApp';
import { AdminApp } from './apps/admin/AdminApp';
import { ResetPassword } from './ui/ResetPassword';

function Maintenance() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', color: 'var(--text)', padding: 24, textAlign: 'center' }}>
      <div style={{ maxWidth: 340 }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>🛠️</div>
        <h1 style={{ fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 24 }}>We'll be back soon</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 10 }}>Njiko is down for maintenance. Please check back shortly.</p>
      </div>
    </div>
  );
}

const path = window.location.pathname;
const isUltimate = path.startsWith('/ultimate');
const isReset = path.startsWith('/reset');

export function App() {
  const [role, setRole] = useState<Role | null>(rememberedRole() ?? roleFromPath());
  const [maint, setMaint] = useState(false);
  const [splashing, setSplashing] = useState(!isUltimate && !isReset);

  useEffect(() => {
    if (!splashing) return;
    const t = setTimeout(() => setSplashing(false), 1900);
    return () => clearTimeout(t);
  }, [splashing]);
  useEffect(() => { if (!isUltimate) platformStatus().then((s) => setMaint(!!s.maintenance)); }, []);

  if (isReset) return <ResetPassword />;
  if (isUltimate) return <AdminApp />;
  if (splashing) return <SplashScreen />;
  if (maint) return <Maintenance />;

  if (!role) return <Landing onPick={(r) => { rememberRole(r); setRole(r); }} />;
  if (role === 'merchant') return <MerchantApp />;
  if (role === 'user') return <UserApp />;
  if (role === 'rider') return <RiderApp />;
  return null;
}
