import { useEffect, useState } from 'react';
import { IconMenu } from '../../../ui/icons';
import { listItems, createItem, toggleItem, deleteItem, uploadImage, type MenuItem } from '../../../lib/menu';

export function Menu() {
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { load(); }, []);
  async function load() {
    try { const { items } = await listItems(); setItems(items); }
    catch { setItems([]); }
  }

  async function add() {
    setErr(null);
    if (!name.trim()) { setErr('Enter an item name'); return; }
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) { setErr('Enter a valid price'); return; }
    setBusy(true);
    try {
      let image_url: string | null = null;
      if (file) image_url = await uploadImage(file);
      await createItem({ name: name.trim(), price: p, image_url });
      setName(''); setPrice(''); setFile(null); setAdding(false);
      await load();
    } catch (e: any) { setErr(e.message ?? 'Could not add item'); }
    finally { setBusy(false); }
  }

  const thumb = (url: string | null) => (
    <div style={{ width: 46, height: 46, borderRadius: 11, flexShrink: 0, overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', color: 'var(--muted2, #566360)' }}>
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 18 }}>🍽️</span>}
    </div>
  );
  const availBtn = (on: boolean) => ({
    fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 600, padding: '5px 9px', borderRadius: 999,
    border: 'none', cursor: 'pointer',
    background: on ? 'var(--accent)' : '#222a2c', color: on ? 'var(--acctxt)' : 'var(--muted)',
  } as const);

  return (
    <>
      <div className="m-header"><span className="page-title">Menu</span></div>
      <div className="m-body">
        {adding ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 15 }}>
            <input className="din" style={{ margin: 0 }} placeholder="Item name (e.g. Jollof Rice)" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="din" style={{ margin: 0 }} type="number" inputMode="decimal" placeholder="Price (₦)" value={price} onChange={(e) => setPrice(e.target.value)} />
            <label style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              Photo (optional)
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: 12, color: 'var(--muted)' }} />
            </label>
            {err && <div className="login-err">{err}</div>}
            <div style={{ display: 'flex', gap: 9 }}>
              <button className="dbtn" style={{ flex: 2, margin: 0 }} onClick={add} disabled={busy}>{busy ? 'Saving…' : 'Save item'}</button>
              <button className="dbtn" style={{ flex: 1, margin: 0, background: 'var(--surface2, #182023)', color: 'var(--text)', border: '1px solid var(--border)' }} onClick={() => { setAdding(false); setErr(null); }} disabled={busy}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="add-btn" onClick={() => setAdding(true)}>+ Add item</button>
        )}

        {items === null ? (
          <div className="empty"><div className="ed">Loading…</div></div>
        ) : items.length === 0 && !adding ? (
          <div className="empty">
            <div className="ec"><IconMenu /></div>
            <div className="et">No items yet</div>
            <div className="ed">Add what you sell so customers can order it.</div>
          </div>
        ) : (
          items.map((it) => (
            <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 15, padding: 12, opacity: it.available ? 1 : 0.55 }}>
              {thumb(it.image_url)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 14 }}>{it.name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--accent)', marginTop: 2 }}>₦{Number(it.price).toLocaleString()}</div>
              </div>
              <button style={availBtn(it.available)} onClick={async () => { await toggleItem(it.id, !it.available); load(); }}>
                {it.available ? 'Available' : 'Sold out'}
              </button>
              <button onClick={async () => { await deleteItem(it.id); load(); }} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, padding: 4 }}>✕</button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
