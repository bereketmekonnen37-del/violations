/**
 * useLocalStorage
 *
 * Simple localStorage-backed useState. Handles SSR/no-storage cases and
 * JSON serialisation for us.
 */

import { useCallback, useEffect, useState } from 'react';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useLocalStorage<T>(
  key: string,
  fallback: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return fallback;
    return safeParse(window.localStorage.getItem(key), fallback);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked; ignore */
    }
  }, [key, value]);

  const setter = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => (typeof next === 'function' ? (next as (prev: T) => T)(prev) : next));
    },
    [],
  );

  return [value, setter];
}
