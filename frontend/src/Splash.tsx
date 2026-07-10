import type { CSSProperties } from 'react';
import type { Role } from './lib/role';

const choices: { id: Role; label: string; hint: string }[] = [
  { id: 'user', label: 'I want to order', hint: 'Customer app' },
  { id: 'merchant', label: 'I sell food or goods', hint: 'Merchant app' },
  { id: 'rider', label: 'I deliver', hint: 'Rider app' },
];

// Neutral (no role chosen yet) — dark brand mark on the warm background.
const neutral = { '--accent': '#2C2118', '--accent-deep': '#2C2118', '--acctxt': '#fff' } as CSSProperties;

export function Splash({ onPick }: { onPick: (r: Role) => void }) {
  return (
    <div className="warm-screen" style={neutral}>
      <div className="warm-pad">
        <div className="brandmark">◆</div>
        <h1 className="warm-h1">Welcome</h1>
        <p className="warm-sub">How do you want to sign in?</p>

        <div className="role-list">
          {choices.map((c) => (
            <button key={c.id} className="role-card" onClick={() => onPick(c.id)}>
              <span className="rl">{c.label}</span>
              <span className="rh">{c.hint}</span>
            </button>
          ))}
        </div>

        <div className="spacer" />
        <p className="tiny">
          Each choice opens that app. In production it maps to a subdomain (e.g. rider.&lt;name&gt;.app).
          Returning users skip this and go straight to login.
        </p>
      </div>
    </div>
  );
}
