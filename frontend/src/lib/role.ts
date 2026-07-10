export type Role = 'user' | 'merchant' | 'rider' | 'admin';

// Path-based role routing (single domain, no subdomains).
// /customer -> user, /rider -> rider, /merchant -> merchant.
const PATHS: Record<string, Role> = { '/customer': 'user', '/rider': 'rider', '/merchant': 'merchant' };
export function roleFromPath(): Role | null {
  const p = window.location.pathname;
  for (const k of Object.keys(PATHS)) if (p.startsWith(k)) return PATHS[k];
  return null;
}

// This device remembers its role so reopening skips the landing page.
const DEVICE_ROLE = 'njiko_device_role';
export function rememberedRole(): Role | null {
  const r = localStorage.getItem(DEVICE_ROLE);
  return r === 'user' || r === 'merchant' || r === 'rider' ? r : null;
}
export function rememberRole(r: Role) { localStorage.setItem(DEVICE_ROLE, r); }
export function forgetRole() { localStorage.removeItem(DEVICE_ROLE); }

export const ROLE_ACCENT: Record<Role, { accent: string; deep: string; text: string }> = {
  user: { accent: '#2FE082', deep: '#14B86A', text: '#04231a' },
  merchant: { accent: '#2EE6C6', deep: '#12B5A4', text: '#04231a' },
  rider: { accent: '#FF8A3D', deep: '#F2671E', text: '#2a1400' },
  admin: { accent: '#f2671e', deep: '#d24a12', text: '#fff' },
};
