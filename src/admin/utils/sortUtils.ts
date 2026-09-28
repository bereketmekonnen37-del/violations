/**
 * Sorting helpers.
 *
 * Sortable table columns share a common sort strategy. These helpers make
 * comparators composable and locale-aware.
 */

export type SortDirection = 'asc' | 'desc';

export interface SortDescriptor<T> {
  key: keyof T | ((row: T) => unknown);
  direction: SortDirection;
}

function normalizeKey<T>(
  key: keyof T | ((row: T) => unknown),
): (row: T) => unknown {
  return typeof key === 'function' ? key : (row) => row[key];
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === undefined || a === null) return 1;
  if (b === undefined || b === null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return String(a).localeCompare(String(b));
}

export function compareWith<T>(descriptor: SortDescriptor<T>) {
  const getter = normalizeKey(descriptor.key);
  const multiplier = descriptor.direction === 'desc' ? -1 : 1;
  return (a: T, b: T): number => compareValues(getter(a), getter(b)) * multiplier;
}

export function sortBy<T>(
  rows: readonly T[],
  descriptor: SortDescriptor<T>,
): T[] {
  const copy = rows.slice();
  copy.sort(compareWith(descriptor));
  return copy;
}

export function sortByMultiple<T>(
  rows: readonly T[],
  descriptors: readonly SortDescriptor<T>[],
): T[] {
  if (!descriptors.length) return rows.slice();
  const copy = rows.slice();
  copy.sort((a, b) => {
    for (const descriptor of descriptors) {
      const result = compareWith(descriptor)(a, b);
      if (result !== 0) return result;
    }
    return 0;
  });
  return copy;
}

export function toggleDirection(current: SortDirection | undefined): SortDirection {
  if (current === 'asc') return 'desc';
  return 'asc';
}

export function nextSortState<T>(
  current: SortDescriptor<T> | undefined,
  nextKey: keyof T | ((row: T) => unknown),
): SortDescriptor<T> {
  if (!current || current.key !== nextKey) {
    return { key: nextKey, direction: 'asc' };
  }
  return { key: nextKey, direction: toggleDirection(current.direction) };
}
