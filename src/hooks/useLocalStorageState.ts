import { useCallback, useEffect, useRef, useState } from "react";

/**
 * State backed by localStorage, read synchronously on the first render.
 *
 * The synchronous read is the whole point: this backs UI chrome like section
 * collapse state, and hydrating it in an effect makes every screen flash the
 * default before snapping to the stored value.
 */
export function useLocalStorageState<T>(
  key: string,
  fallback: T,
  parse?: (raw: unknown) => T | undefined,
): [T, (next: T | ((prev: T) => T)) => void] {
  const parseRef = useRef(parse);
  parseRef.current = parse;

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      const decoded: unknown = JSON.parse(raw);
      const parsed = parseRef.current ? parseRef.current(decoded) : (decoded as T);
      return parsed === undefined ? fallback : parsed;
    } catch {
      // Corrupt or unreadable (Safari private mode throws on access) — the
      // default is always a usable answer here.
      return fallback;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Out of quota or blocked. Losing a UI preference is not worth surfacing.
    }
  }, [key, value]);

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setValue(next);
  }, []);

  return [value, set];
}
