import { useState } from 'react';
import { PinDrop } from '../../../ui/PinDrop';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../CartContext';
import { getProfile } from '../../../lib/user';
import { checkout } from '../../../lib/orders';

export function CartPage() {
  const cart = useCart();
  const nav = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [note, setNote] = useState('');   // customer -> merchant
  // Optional precise drop-off. If they don't drop a pin we use their saved location.
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [picking, setPicking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function doCheckout() {
    setMsg(null);
    setPlacing(true);
    try {
      const { profile } = await getProfile();
      if (!profile?.address) { setMsg('Set a delivery address in Profile first.'); setPlacing(false); return; }
      const lines = cart.lines.map((l) => ({ itemId: l.itemId, qty: l.qty }));
      await checkout(profile.address, lines, note.trim() || undefined, pin);
      cart.clear();
      nav('/orders');
    } catch (e: any) {
      setMsg(e.message ?? 'Could not place order');
    } finally { setPlacing(false); }
  }

  if (cart.count === 0) {
    return (
      <>
        <div className="m-header"><span className="page-title">Your cart</span></div>
        <div className="u-body">
          <div className="empty">
            <div className="et">Your cart is empty</div>
            <div className="ed">Add items from any store — you can mix stores in one cart.</div>
            <Link to="/" style={{ color: 'var(--accent)', fontSize: 13, marginTop: 6 }}>Browse stores</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="m-header">
        <button className="icon-btn" onClick={() => nav(-1)}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span className="page-title" style={{ marginLeft: 4 }}>Your cart</span>
      </div>

      <div className="u-body" style={{ paddingBottom: 170 }}>
        {cart.byStore.map((g) => (
          <div className="cart-group" key={g.storeId}>
            <div className="cart-store">{g.storeName}</div>
            {g.lines.map((l) => (
              <div className="cart-line" key={l.itemId}>
                <div className="cl-info">
                  <div className="cl-name">{l.name}</div>
                  <div className="cl-price">₦{(l.price * l.qty).toLocaleString()}</div>
                </div>
                <div className="u-stepper">
                  <button onClick={() => cart.setQty(l.itemId, l.qty - 1)}>−</button>
                  <span>{l.qty}</span>
                  <button onClick={() => cart.setQty(l.itemId, l.qty + 1)}>+</button>
                </div>
              </div>
            ))}
            <div className="cart-sub">Subtotal <b>₦{g.subtotal.toLocaleString()}</b></div>
          </div>
        ))}

        {/* A dropped pin beats a typed address — especially where streets aren't well mapped. */}
        <div className={`pin-row ${pin ? 'set' : ''}`}>
          <span className="pin-ico">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.7"/></svg>
          </span>
          <div className="pin-txt">
            <b>{pin ? 'Delivery pin set' : 'Drop a pin for exact delivery'}</b>
            <span>{pin ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)} — rider routes here` : 'Optional. Otherwise we use your saved address.'}</span>
          </div>
          <button className="pin-btn" onClick={() => setPicking(true)}>{pin ? 'Change' : 'Drop pin'}</button>
          {pin && <button className="pin-clear" onClick={() => setPin(null)} aria-label="Remove pin">✕</button>}
        </div>

        {/* Anything the kitchen needs to know: "no pepper", "call at the gate" */}
        <div className="note-box">
          <label htmlFor="order-note">Note for the store <span>(optional)</span></label>
          <textarea id="order-note" className="note-in" rows={2} maxLength={300}
            placeholder="e.g. no pepper, extra sachet, call me at the gate…"
            value={note} onChange={(e) => setNote(e.target.value)} />
          <i>{note.length}/300 · sent to every store in this order</i>
        </div>

        <div className="cart-total"><span>Total</span><b>₦{cart.total.toLocaleString()}</b></div>
        {msg && <div className="login-err" style={{ textAlign: 'center' }}>{msg}</div>}
        <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
          Each store is prepared, delivered and paid separately. Payment: cash on delivery for now.
        </p>
      </div>

      {picking && (
        <PinDrop
          start={pin ?? (profile?.lat != null && profile?.lng != null ? { lat: profile.lat, lng: profile.lng } : null)}
          onConfirm={(p) => { setPin(p); setPicking(false); }}
          onClose={() => setPicking(false)}
        />
      )}

      <div className="checkout-bar">
        <button className="dbtn" onClick={doCheckout} disabled={placing}>
          {placing ? 'Placing order…' : `Place order · ₦${cart.total.toLocaleString()}`}
        </button>
      </div>
    </>
  );
}
