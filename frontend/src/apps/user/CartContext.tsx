import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface CartLine { storeId: string; storeName: string; itemId: string; name: string; price: number; image: string | null; qty: number; }
export interface StoreGroup { storeId: string; storeName: string; lines: CartLine[]; subtotal: number; }

interface CartCtx {
  lines: CartLine[];
  add: (l: Omit<CartLine, 'qty'>) => void;
  setQty: (itemId: string, qty: number) => void;
  clear: () => void;
  count: number;
  total: number;
  byStore: StoreGroup[];
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = 'user_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(lines)); }, [lines]);

  const add: CartCtx['add'] = (l) => setLines((prev) => {
    const ex = prev.find((x) => x.itemId === l.itemId);
    if (ex) return prev.map((x) => x.itemId === l.itemId ? { ...x, qty: x.qty + 1 } : x);
    return [...prev, { ...l, qty: 1 }];
  });
  const setQty: CartCtx['setQty'] = (itemId, qty) => setLines((prev) =>
    qty <= 0 ? prev.filter((x) => x.itemId !== itemId) : prev.map((x) => x.itemId === itemId ? { ...x, qty } : x));
  const clear = () => setLines([]);

  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const byStore: StoreGroup[] = Object.values(lines.reduce((acc: Record<string, StoreGroup>, l) => {
    (acc[l.storeId] ||= { storeId: l.storeId, storeName: l.storeName, lines: [], subtotal: 0 });
    acc[l.storeId].lines.push(l);
    acc[l.storeId].subtotal += l.price * l.qty;
    return acc;
  }, {}));

  return <Ctx.Provider value={{ lines, add, setQty, clear, count, total, byStore }}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCart must be used inside CartProvider');
  return c;
}
