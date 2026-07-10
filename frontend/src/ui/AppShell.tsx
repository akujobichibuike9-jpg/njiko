import type { CSSProperties, ReactNode } from 'react';
import { ROLE_ACCENT, type Role } from '../lib/role';

export function AppShell({ accent, children }: { accent: Role; children: ReactNode }) {
  const a = ROLE_ACCENT[accent];
  const vars = { '--accent': a.accent, '--accent-deep': a.deep, '--acctxt': a.text } as CSSProperties;
  return <div className="app-shell" style={vars}>{children}</div>;
}
