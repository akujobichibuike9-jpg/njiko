import { useEffect, useState, type ReactNode } from 'react';

export interface FilterGroup { id: string; label: string; }

// Floating liquid-glass top filter. Thinner than the bottom nav, and it does the
// OPPOSITE on scroll: contracts as you scroll up, expands as you scroll down.
export function TopFilterNav({ groups, active, onChange }: {
  groups: FilterGroup[]; active: string; onChange: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > last + 6 && y > 30) setExpanded(true);   // scrolling down -> expand
      else if (y < last - 6) setExpanded(false);       // scrolling up -> contract
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`tnav ${expanded ? 'wide' : ''}`}>
      {groups.map((g) => (
        <button key={g.id} className={`tnav-a ${active === g.id ? 'on' : ''}`} onClick={() => onChange(g.id)}>{g.label}</button>
      ))}
    </nav>
  );
}

export function TopNavSpacer({ children }: { children: ReactNode }) {
  return <div style={{ paddingTop: 64 }}>{children}</div>;
}
