import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatDateTime, initials, newId, truncate } from '../../src/lib/utils';

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('drops falsy values (false, null, undefined, "")', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('returns empty when everything is falsy', () => {
    expect(cn(false, null, undefined, '')).toBe('');
  });
});

describe('initials', () => {
  it('takes the first letter of the first two words, uppercased', () => {
    expect(initials('Leul Mekonnen')).toBe('LM');
    expect(initials('yoseph tesfaye')).toBe('YT');
  });

  it('is limited to two initials', () => {
    expect(initials('Yosef Girma Tesfaye')).toBe('YG');
  });

  it('handles single-word names', () => {
    expect(initials('Naomi')).toBe('N');
  });

  it('collapses extra whitespace', () => {
    expect(initials('  Leul   Mekonnen  ')).toBe('LM');
  });

  it('returns empty for empty input', () => {
    expect(initials('')).toBe('');
  });
});

describe('truncate', () => {
  it('leaves short strings alone', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('adds an ellipsis when over the limit', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
  });
});

describe('newId', () => {
  it('has the id_<time>_<rand> shape', () => {
    expect(newId()).toMatch(/^id_[a-z0-9]+_[a-z0-9]+$/);
  });

  it('is unique across successive calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newId()));
    expect(ids.size).toBe(50);
  });
});

describe('formatDate / formatDateTime', () => {
  it('returns the input unchanged when the ISO does not parse', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
    expect(formatDateTime('not-a-date')).toBe('not-a-date');
  });

  it('formats a real ISO date into a non-empty string', () => {
    const out = formatDate('2026-06-15T12:00:00Z');
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });

  it('formatDateTime includes hours and minutes', () => {
    const out = formatDateTime('2026-06-15T14:30:00Z');
    expect(typeof out).toBe('string');
    // We do not pin the locale; just assert some digits made it through.
    expect(out).toMatch(/\d/);
  });
});
