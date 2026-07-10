import { useEffect, useState, type ReactNode } from 'react';

export interface Tab { id: string; label: string; icon: ReactNode; }

// Shared floating liquid-glass pill nav (collapses to icons on scroll-down).
export function BottomNav({ tabs, active, onChange }: {
  tabs: Tab[]; active: string; onChange: (id: string) => void;
}) {
  const [mini, setMini] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > last + 6 && y > 70) setMini(true);
      else if (y < last - 6) setMini(false);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`gnav ${mini ? 'mini' : ''}`}>
      {tabs.map((t) => (
        <button key={t.id} className={`gnav-a ${active === t.id ? 'on' : ''}`} onClick={() => onChange(t.id)}>
          {t.icon}<span className="lbl">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
