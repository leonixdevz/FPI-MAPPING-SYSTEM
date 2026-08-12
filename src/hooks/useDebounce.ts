import { useEffect, useState } from 'react';

/**
 * Debounce a value by `delay` ms. Returns the latest value once the
 * caller has stopped updating it for the delay window. Used by the
 * search input so we don't re-filter on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
