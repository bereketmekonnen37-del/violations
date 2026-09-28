import { describe, it, expect } from 'vitest';
import {
  isNightRowValid,
  mergeNightRows,
  nightBucketKey,
} from '../../src/lib/nightsMerger';
import type { NightRow } from '../../src/types';

const row = (over: Partial<NightRow>): NightRow => ({
  id: 'x',
  timeA: '',
  positionA: '',
  timeB: '',
  positionB: '',
  duration: '',
  length: '',
  averageSpeed: '',
  maxSpeed: '',
  ...over,
});

describe('nightBucketKey — Ethiopian 18:00→06:00 shift', () => {
  it('evening timestamp buckets under the same date', () => {
    expect(nightBucketKey('2026-06-06 22:00:00')).toBe('2026-06-06');
    expect(nightBucketKey('2026-06-06 18:00:00')).toBe('2026-06-06');
  });

  it('pre-dawn timestamp buckets under the PREVIOUS date', () => {
    expect(nightBucketKey('2026-06-07 01:30:00')).toBe('2026-06-06');
    expect(nightBucketKey('2026-06-07 05:59:00')).toBe('2026-06-06');
  });

  it('day-time row uses its own date (no shift)', () => {
    expect(nightBucketKey('2026-06-07 12:00:00')).toBe('2026-06-07');
  });

  it('accepts ISO T separator, /-slashed dates, and no-seconds', () => {
    expect(nightBucketKey('2026-06-07T01:30')).toBe('2026-06-06');
    expect(nightBucketKey('2026/06/06 22:00')).toBe('2026-06-06');
  });

  it('returns null for unparseable input', () => {
    expect(nightBucketKey('')).toBeNull();
    expect(nightBucketKey('nope')).toBeNull();
  });
});

describe('isNightRowValid', () => {
  it('requires at least one non-empty position', () => {
    expect(isNightRowValid(row({ duration: '1h', positionA: '', positionB: '' }))).toBe(false);
    expect(isNightRowValid(row({ duration: '1h', positionA: '9,42' }))).toBe(true);
    expect(isNightRowValid(row({ duration: '1h', positionB: '9,42' }))).toBe(true);
  });

  it('requires a positive duration by default', () => {
    expect(isNightRowValid(row({ duration: '', positionA: '9,42' }))).toBe(false);
    expect(isNightRowValid(row({ duration: 'garbage', positionA: '9,42' }))).toBe(false);
  });

  it('requireDuration=false skips the duration check', () => {
    expect(isNightRowValid(row({ duration: '', positionA: '9,42' }), false)).toBe(true);
  });
});

describe('mergeNightRows', () => {
  it('collapses two rows in the same 18–06 shift into one', () => {
    const rows: NightRow[] = [
      row({
        id: 'r1',
        timeA: '2026-06-06 22:00:00',
        positionA: '9.0, 42.0 - Adama',
        timeB: '2026-06-06 23:00:00',
        positionB: '9.1, 42.1',
        duration: '1h',
      }),
      row({
        id: 'r2',
        timeA: '2026-06-07 01:30:00',
        positionA: '9.5, 42.5',
        timeB: '2026-06-07 03:00:00',
        positionB: '9.6, 42.6 - Djibouti',
        duration: '1h 30min',
      }),
    ];
    const merged = mergeNightRows(rows);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('r1');
    expect(merged[0].mergedCount).toBe(2);
    expect(merged[0].timeA).toBe('2026-06-06 22:00:00');
    expect(merged[0].timeB).toBe('2026-06-07 03:00:00');
    expect(merged[0].positionA).toBe('9.0, 42.0 - Adama');
    expect(merged[0].positionB).toBe('9.6, 42.6 - Djibouti');
    // 1h + 1h 30min = 2h 30min → "2h 30min"
    expect(merged[0].duration).toBe('2h 30min');
  });

  it('leaves rows on separate nights un-merged', () => {
    const rows: NightRow[] = [
      row({
        id: 'a',
        timeA: '2026-06-06 22:00:00',
        positionA: '9,42',
        duration: '30min',
      }),
      row({
        id: 'b',
        timeA: '2026-06-08 22:00:00',
        positionA: '9,42',
        duration: '30min',
      }),
    ];
    const merged = mergeNightRows(rows);
    expect(merged.map((m) => m.id)).toEqual(['a', 'b']);
    expect(merged.every((m) => m.mergedCount === 1)).toBe(true);
  });

  it('enabled=false keeps every valid row un-collapsed, sorted', () => {
    const rows: NightRow[] = [
      row({
        id: 'b',
        timeA: '2026-06-07 01:00:00',
        positionA: '9,42',
        duration: '30min',
      }),
      row({
        id: 'a',
        timeA: '2026-06-06 22:00:00',
        positionA: '9,42',
        duration: '30min',
      }),
    ];
    const out = mergeNightRows(rows, false);
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.id)).toEqual(['a', 'b']);
    expect(out.every((r) => r.mergedCount === 1)).toBe(true);
  });

  it('drops invalid rows (no position AND no usable duration)', () => {
    const rows: NightRow[] = [
      row({ id: 'ghost', timeA: '2026-06-06 22:00:00' }),
    ];
    expect(mergeNightRows(rows)).toEqual([]);
  });
});
