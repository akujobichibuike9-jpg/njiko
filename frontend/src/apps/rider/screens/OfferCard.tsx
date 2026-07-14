import { useEffect, useState } from 'react';
import { currentOffer, acceptOffer, declineOffer, type Offer } from '../../../lib/dispatch';

/**
 * The rider sees ONE offer at a time, with a countdown.
 * They never get a list to cherry-pick from — the engine decides what is safe to offer.
 */
export function OfferCard({ onAccepted }: { onAccepted: () => void }) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const pull = () => currentOffer().then((r) => setOffer(r.offer)).catch(() => {});
    pull();
    const t = setInterval(pull, 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!offer) return setLeft(0);
    const tick = () => setLeft(Math.max(0, Math.round((new Date(offer.expires_at).getTime() - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [offer?.order_id, offer?.expires_at]);

  if (!offer) return null;

  const accept = async () => {
    setBusy(true); setMsg(null);
    try { await acceptOffer(offer.order_id); setOffer(null); onAccepted(); }
    catch (e: any) { setMsg(e.message ?? 'Too slow — that job is gone'); setOffer(null); }
    finally { setBusy(false); }
  };
  const decline = async () => {
    setBusy(true);
    try { await declineOffer(offer.order_id); } catch {}
    setOffer(null); setBusy(false);
  };

  const pct = Math.max(0, Math.min(100, (left / 20) * 100));

  return (
    <div className="offer">
      <div className="offer-timer"><div className="offer-timer-fill" style={{ width: `${pct}%` }} /></div>
      <div className="offer-head">
        <span className="offer-tag">New delivery</span>
        <span className="offer-left">{left}s</span>
      </div>
      <div className="offer-pay">₦{Number(offer.delivery_fee ?? 0).toLocaleString()}</div>
      <div className="offer-leg">
        <span className="leg-dot pickup" />
        <div><b>{offer.store_name}</b><span>{offer.store_address}</span></div>
      </div>
      <div className="offer-leg">
        <span className="leg-dot dropoff" />
        <div><b>Customer</b><span>{offer.delivery_address}</span></div>
      </div>
      {msg && <div className="offer-msg">{msg}</div>}
      <div className="offer-btns">
        <button className="offer-no" disabled={busy} onClick={decline}>Pass</button>
        <button className="offer-yes" disabled={busy || left === 0} onClick={accept}>{busy ? '…' : 'Accept'}</button>
      </div>
    </div>
  );
}
