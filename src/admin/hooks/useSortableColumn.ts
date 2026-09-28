/**
 * useSortableColumn
 *
 * Manages a single sort descriptor for a table. The consumer calls
 * `toggle(key)` and receives a stable descriptor to feed into service
 * calls.
 */

import { useCallback, useMemo, useState } from 'react';
import { nextSortState } from '../utils/sortUtils';
import type { SortDescriptor } from '../utils/sortUtils';

export function useSortableColumn<T>(initial?: SortDescriptor<T>) {
  const [descriptor, setDescriptor] = useState<SortDescriptor<T> | undefined>(
    initial,
  );

  const toggle = useCallback((key: keyof T | ((row: T) => unknown)) => {
    setDescriptor((current) => nextSortState(current, key));
  }, []);

  const list = useMemo(() => (descriptor ? [descriptor] : []), [descriptor]);

  return { descriptor, list, toggle };
}
