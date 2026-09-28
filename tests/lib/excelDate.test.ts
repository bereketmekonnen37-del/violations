import { describe, it, expect } from 'vitest';
import {
  isLikelyExcelSerial,
  formatExcelSerial,
  formatSerialIfNumeric,
  formatJsDate,
  formatLocalDate,
  excelSerialToDate,
} from '../../src/lib/excelDate';

describe('isLikelyExcelSerial', () => {
  it('accepts values in the 1954–2118 range', () => {
    expect(isLikelyExcelSerial(20000)).toBe(true);
    expect(isLikelyExcelSerial(46176)).toBe(true);
    expect(isLikelyExcelSerial(80000)).toBe(true);
  });

  it('rejects values below the floor / above the ceiling', () => {
    expect(isLikelyExcelSerial(0)).toBe(false);
    expect(isLikelyExcelSerial(19999)).toBe(false);
    expect(isLikelyExcelSerial(80001)).toBe(false);
    expect(isLikelyExcelSerial(-5)).toBe(false);
  });

  it('rejects non-finite numbers', () => {
    expect(isLikelyExcelSerial(NaN)).toBe(false);
    expect(isLikelyExcelSerial(Infinity)).toBe(false);
    expect(isLikelyExcelSerial(-Infinity)).toBe(false);
  });
});

describe('formatExcelSerial', () => {
  it('returns empty for out-of-range serials', () => {
    expect(formatExcelSerial(0)).toBe('');
    expect(formatExcelSerial(100000)).toBe('');
  });

  it('returns a "yyyy-mm-dd hh:mm:ss" shape for valid serials', () => {
    // Not pinning the exact wall-clock — SheetJS decides — just the shape.
    const out = formatExcelSerial(46176.82374);
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});

describe('formatSerialIfNumeric', () => {
  it('passes through non-numeric strings unchanged', () => {
    expect(formatSerialIfNumeric('2026-06-15 12:00:00')).toBe('2026-06-15 12:00:00');
    expect(formatSerialIfNumeric('foo bar')).toBe('foo bar');
  });

  it('leaves out-of-range bare numbers unchanged', () => {
    expect(formatSerialIfNumeric('12345')).toBe('12345');
  });

  it('formats an in-range bare serial as yyyy-mm-dd hh:mm:ss', () => {
    const out = formatSerialIfNumeric('46176.82374');
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});

describe('formatJsDate / formatLocalDate', () => {
  it('return empty string for an invalid Date', () => {
    const bad = new Date('not-a-date');
    expect(formatJsDate(bad)).toBe('');
    expect(formatLocalDate(bad)).toBe('');
  });

  it('formatJsDate reads UTC accessors', () => {
    const d = new Date(Date.UTC(2026, 5, 15, 9, 8, 7));
    expect(formatJsDate(d)).toBe('2026-06-15 09:08:07');
  });

  it('formatLocalDate reads local accessors and pads to yyyy-mm-dd hh:mm:ss', () => {
    const d = new Date(2026, 0, 2, 3, 4, 5); // Jan 2, 03:04:05 local
    expect(formatLocalDate(d)).toBe('2026-01-02 03:04:05');
  });
});

describe('excelSerialToDate', () => {
  it('round-trips a whole-day serial to a proper Date', () => {
    // Excel serial 46176 is a specific calendar day; just verify it produces a valid Date.
    const d = excelSerialToDate(46176);
    expect(d).toBeInstanceOf(Date);
    expect(Number.isNaN(d.getTime())).toBe(false);
  });
});
