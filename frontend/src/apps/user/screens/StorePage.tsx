import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getStore, type StoreSummary, type CatalogItem } from '../../../lib/catalog';
import { useCart } from '../CartContext';

export function StorePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const cart = useCart();
  const [data, setData] = useState<{ store: StoreSummary; items: CatalogItem[] } | null | undefined>(undefined);

  useEffect(() => { if (id) getStore(id).then(setData).catch(() => setData(null)); }, [id]);

  if (data === undefined) return <div className="empty" style={{ paddingTop: 80 }}><div className="ed">Loading…</div></div>;
  if (data === null) return <div className="empty" style={{ paddingTop: 80 }}><div className="et">Store not found</div><Link to="/" style={{ color: 'var(--accent)' }}>Back home</Link></div>;
  const { store, items } = data;

  return (
    <>
      <div className="m-header">
        <button className="icon-btn" onClick={() => nav(-1)}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span className="page-title" style={{ marginLeft: 4 }}>{store.name ?? 'Store'}</span>
      </div>

      <div className="u-body" style={{ paddingBottom: 150 }}>
        <div className="store-banner">
          <div className="sb-thumb">🍽️</div>
          <div><div className="sb-name">{store.name ?? 'Store'}</div><div className="sb-meta">{[store.category, store.address].filter(Boolean).join(' · ')}</div></div>
        </div>

        {items.length === 0 ? (
          <div className="empty"><div className="et">No items yet</div><div className="ed">This store hasn't added anything to sell yet.</div></div>
        ) : (
          items.map((it) => (
            <div className="menu-row" key={it.id}>
              <div className="mr-thumb">{it.image_url ? <img src={it.image_url} alt="" /> : <span>🍽️</span>}</div>
              <div className="mr-info"><div className="mr-name">{it.name}</div><div className="mr-price">₦{Number(it.price).toLocaleString()}</div></div>
              <button className="add-round" onClick={() => cart.add({ storeId: store.id, storeName: store.name ?? 'Store', itemId: it.id, name: it.name, price: Number(it.price), image: it.image_url })}>+</button>
            </div>
          ))
        )}
      </div>

      {cart.count > 0 && (
        <Link to="/cart" className="cart-bar">
          <span>View cart · {cart.count} item{cart.count > 1 ? 's' : ''}</span>
          <span>₦{cart.total.toLocaleString()}</span>
        </Link>
      )}
    </>
  );
}
