import type { Role } from './lib/role';
import { NjikoMark } from './ui/NjikoMark';
import { Wordmark } from './ui/Wordmark';

const bag = <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 8h12l-1 12H7L6 8z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 8V6a3 3 0 016 0v2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const shop = <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 9l1.2-4h13.6L20 9M4 9v10h16V9M4 9h16" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 19v-5h6v5" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/></svg>;
const bike = <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="5.5" cy="17.5" r="3.2" stroke="#fff" strokeWidth="1.7"/><circle cx="18.5" cy="17.5" r="3.2" stroke="#fff" strokeWidth="1.7"/><path d="M5.5 17.5l4-9h4l3.5 9M9 8.5h5.5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;

const roles: { id: Role; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'user', label: 'Continue as Customer', desc: 'Order from stores near you', icon: bag },
  { id: 'merchant', label: 'Continue as Merchant', desc: 'Sell and manage your store', icon: shop },
  { id: 'rider', label: 'Continue as Rider', desc: 'Earn by delivering orders', icon: bike },
];

export function Landing({ onPick }: { onPick: (r: Role) => void }) {
  return (
    <div className="njk-landing">
      <div className="njk-glow" />
      <div className="njk-landing-in">
        <div className="njk-landing-mark"><NjikoMark size={72} /></div>
        <Wordmark className="njk-landing-name" />
        <p className="njk-sub">Built to connect</p>

        <div className="njk-roles">
          {roles.map((r) => (
            <button key={r.id} className={`njk-role-btn ${r.id}`} onClick={() => onPick(r.id)}>
              <span className="njk-role-icon">{r.icon}</span>
              <span className="njk-role-text">
                <span className="njk-role-label">{r.label}</span>
                <span className="njk-role-desc">{r.desc}</span>
              </span>
              <svg className="njk-role-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ))}
        </div>
        <div className="njk-foot">By Chivera</div>
      </div>
    </div>
  );
}
