import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { isAuthed, setActiveRole } from '../../lib/token';
import { AppShell } from '../../ui/AppShell';
import { IconHome, IconOrders } from '../../ui/icons';
import { CartProvider, useCart } from './CartContext';
import { UserLogin } from './UserLogin';
import { Home } from './screens/Home';
import { StorePage } from './screens/StorePage';
import { CartPage } from './screens/CartPage';
import { Orders } from './screens/Orders';
import { Profile } from './screens/Profile';
import { OrderHistory } from './screens/OrderHistory';
import { Track } from './screens/Track';

const cartIcon = (<svg viewBox="0 0 24 24" fill="none"><path d="M5 7h14l-1.5 11a2 2 0 01-2 1.8H8.5a2 2 0 01-2-1.8L5 7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M9 7a3 3 0 016 0" stroke="currentColor" strokeWidth="1.7" /></svg>);
const profileIcon = (<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" /><path d="M5 20a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.7" /></svg>);

// Web approximation of the native edge-swipe-back gesture.
function SwipeBack() {
  const nav = useNavigate();
  useEffect(() => {
    let x = 0, y = 0, edge = false;
    const start = (e: TouchEvent) => { const t = e.touches[0]; x = t.clientX; y = t.clientY; edge = x < 40; };
    const end = (e: TouchEvent) => {
      if (!edge) return;
      const t = e.changedTouches[0];
      if (t.clientX - x > 70 && Math.abs(t.clientY - y) < 55) nav(-1);
      edge = false;
    };
    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchend', end, { passive: true });
    return () => { window.removeEventListener('touchstart', start); window.removeEventListener('touchend', end); };
  }, [nav]);
  return null;
}

// Floating liquid-glass pill nav that collapses to icons on scroll-down, expands on scroll-up.
function UserNav() {
  const cart = useCart();
  const loc = useLocation();
  if (loc.pathname.startsWith('/track')) return null;
  const [mini, setMini] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const yy = window.scrollY;
      if (yy > last + 6 && yy > 70) setMini(true);
      else if (yy < last - 6) setMini(false);
      last = yy;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const cls = ({ isActive }: { isActive: boolean }) => `gnav-a ${isActive ? 'on' : ''}`;
  return (
    <nav className={`gnav ${mini ? 'mini' : ''}`}>
      <NavLink to="/" end className={cls}><IconHome /><span className="lbl">Home</span></NavLink>
      <NavLink to="/orders" className={cls}><IconOrders /><span className="lbl">Orders</span></NavLink>
      <NavLink to="/cart" className={cls}>
        <span style={{ position: 'relative', display: 'flex' }}>{cartIcon}{cart.count > 0 && <span className="gnav-badge">{cart.count}</span>}</span>
        <span className="lbl">Cart</span>
      </NavLink>
      <NavLink to="/profile" className={cls}>{profileIcon}<span className="lbl">Profile</span></NavLink>
    </nav>
  );
}

export function UserApp() {
  setActiveRole('user');
  const [authed, setAuthed] = useState(isAuthed('user'));
  if (!authed) return <UserLogin onDone={() => setAuthed(true)} />;

  return (
    <CartProvider>
      <BrowserRouter>
        <AppShell accent="user">
          <SwipeBack />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/store/:id" element={<StorePage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/profile" element={<Profile onLogout={() => setAuthed(false)} />} />
            <Route path="/history" element={<OrderHistory />} />
            <Route path="/track/:id" element={<Track />} />
            <Route path="*" element={<Home />} />
          </Routes>
          <UserNav />
        </AppShell>
      </BrowserRouter>
    </CartProvider>
  );
}
