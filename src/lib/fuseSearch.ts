import Fuse, { type IFuseOptions } from 'fuse.js';

export const buildFuse = <T>(
  items: T[],
  keys: IFuseOptions<T>['keys'],
  threshold = 0.4,
): Fuse<T> =>
  new Fuse(items, {
    threshold,
    ignoreLocation: true,
    minMatchCharLength: 1,
    includeScore: false,
    keys,
  });

export const tokensMatch = (haystack: string, needle: string): boolean => {
  const h = haystack.toLowerCase();
  const tokens = needle
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return needle.trim() === '' || h.includes(needle.toLowerCase());
  let hits = 0;
  for (const t of tokens) {
    if (h.includes(t)) hits++;
  }
  // 2-word tolerance — at least N-1 tokens (min 1) must match.
  const required = Math.max(1, tokens.length - 1);
  return hits >= required;
};
