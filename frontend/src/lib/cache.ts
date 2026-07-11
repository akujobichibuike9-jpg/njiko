import { useEffect, useRef, useState } from 'react';

// In-memory cache shared across screens for the session.
// Screens read the last value INSTANTLY (no flash), then revalidate in the background.
const store = new Map<string, unknown>();

export function cacheGet<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}
export function cacheSet<T>(key: string, value: T) {
  store.set(key, value);
}
export function cacheClear(prefix?: string) {
  if (!prefix) return store.clear();
  for (const k of [...store.keys()]) if (k.startsWith(prefix)) store.delete(k);
}

/**
 * Stale-while-revalidate.
 * - Returns cached data immediately on repeat visits (screen paints with content, no blank/spinner).
 * - Always refetches in the background and updates if the data changed.
 * - `loading` is only true on the very first fetch, when there is nothing to show yet.
 */
export function useCached<T>(key: string, fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | undefined>(() => cacheGet<T>(key));
  const [loading, setLoading] = useState(() => cacheGet<T>(key) === undefined);
  const [error, setError] = useState<unknown>(null);
  const alive = useRef(true);
  const fn = useRef(fetcher);
  fn.current = fetcher;

  useEffect(() => {
    alive.current = true;
    const cached = cacheGet<T>(key);
    if (cached !== undefined) { setData(cached); setLoading(false); }
    else setLoading(true);

    fn.current()
      .then((r) => {
        if (!alive.current) return;
        cacheSet(key, r);
        setData(r);
        setError(null);
      })
      .catch((e) => { if (alive.current) setError(e); })
      .finally(() => { if (alive.current) setLoading(false); });

    return () => { alive.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps]);

  // Manual refresh (e.g. after an action changes server state).
  async function refresh() {
    try {
      const r = await fn.current();
      if (!alive.current) return;
      cacheSet(key, r);
      setData(r);
    } catch (e) { if (alive.current) setError(e); }
  }

  return { data, loading, error, refresh, setData };
}
