import { forgetRole } from '../lib/role';

// Returns to the role-picker landing (forgets the remembered role for this device).
export function RoleBackButton() {
  return (
    <button className="role-back" aria-label="Back to role selection" onClick={() => { forgetRole(); window.location.assign('/'); }}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}
