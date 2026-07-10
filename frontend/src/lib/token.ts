// Per-role sessions. Tokens live in localStorage (shared, durable, one per role).
// The ACTIVE role lives in sessionStorage so it's PER-TAB — this lets you keep
// user / merchant / rider open in three tabs at once without them clobbering each other.
const ACTIVE = 'active_role';
const tk = (role: string) => `auth_token_${role}`;

export function setActiveRole(role: string) {
  sessionStorage.setItem(ACTIVE, role);
}
function activeRole(): string | null {
  return sessionStorage.getItem(ACTIVE);
}

export const getToken = (): string | null => {
  const r = activeRole();
  return r ? localStorage.getItem(tk(r)) : null;
};

export const setToken = (token: string, role: string) => {
  localStorage.setItem(tk(role), token);
  sessionStorage.setItem(ACTIVE, role);
};

export const clearToken = (role?: string) => {
  const r = role ?? activeRole();
  if (r) localStorage.removeItem(tk(r));
};

export const isAuthed = (role: string) => !!localStorage.getItem(tk(role));
