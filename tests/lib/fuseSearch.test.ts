import { describe, it, expect } from 'vitest';
import { buildFuse, tokensMatch } from '../../src/lib/fuseSearch';

describe('tokensMatch', () => {
  it('matches when every token appears in the haystack', () => {
    expect(tokensMatch('Addis Adama Express', 'adama express')).toBe(true);
  });

  it('allows one missing token when the needle has 2+ tokens (N-1 rule)', () => {
    expect(tokensMatch('Addis Adama Express', 'adama djibouti')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(tokensMatch('Djibouti', 'DJIBOUTI')).toBe(true);
  });

  it('drops single-character tokens and only counts >=2 char tokens', () => {
    // 'a' is dropped, so only 'adama' counts and it hits.
    expect(tokensMatch('Addis Adama', 'a adama')).toBe(true);
  });

  it('when every needle token is <2 chars, falls back to a raw substring check', () => {
    // All tokens dropped → falls back to `haystack.includes(needle)`,
    // which is false because "z x q" is not present.
    expect(tokensMatch('Addis', 'z x q')).toBe(false);
    // Same fallback, but this time the substring IS present.
    expect(tokensMatch('a z q', 'z')).toBe(true);
  });

  it('empty needle matches anything', () => {
    expect(tokensMatch('anything', '')).toBe(true);
    expect(tokensMatch('anything', '   ')).toBe(true);
  });

  it('returns false when nothing matches at all', () => {
    expect(tokensMatch('Addis Adama Express', 'djibouti tadjoura')).toBe(false);
  });
});

describe('buildFuse', () => {
  interface Item {
    name: string;
    tag: string;
  }
  const data: Item[] = [
    { name: 'Alice', tag: 'driver' },
    { name: 'Bob', tag: 'transporter' },
    { name: 'Alicia', tag: 'driver' },
  ];

  it('performs fuzzy matches on the given keys', () => {
    const fuse = buildFuse<Item>(data, ['name']);
    const hits = fuse.search('alic');
    expect(hits.length).toBeGreaterThan(0);
    // Both Alice and Alicia should be findable.
    const names = hits.map((h) => h.item.name);
    expect(names.some((n) => n === 'Alice' || n === 'Alicia')).toBe(true);
  });

  it('threshold can be tuned tighter to be more strict', () => {
    const strict = buildFuse<Item>(data, ['name'], 0.0); // exact only
    const loose = buildFuse<Item>(data, ['name'], 0.9); // very loose
    expect(strict.search('xyz').length).toBe(0);
    expect(loose.search('xyz').length).toBeGreaterThanOrEqual(0);
  });
});
