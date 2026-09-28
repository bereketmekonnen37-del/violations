import { describe, it, expect } from 'vitest';
import {
  buildDriverLookup,
  buildDriverProfileLookup,
  NOT_FOUND,
} from '../../src/lib/driverLookup';
import type { DriverRecord } from '../../src/types';

const rec = (over: Partial<DriverRecord>): DriverRecord => ({
  id: 'x',
  vid: '',
  driverName: '',
  transporter: '',
  ...over,
});

describe('buildDriverLookup', () => {
  it('returns the driver name for a known VID', () => {
    const lookup = buildDriverLookup([rec({ vid: 'V-123', driverName: 'Alice' })]);
    expect(lookup('V-123')).toBe('Alice');
  });

  it('normalises punctuation, case, and spacing when matching', () => {
    const lookup = buildDriverLookup([rec({ vid: 'V-123', driverName: 'Alice' })]);
    expect(lookup('v.123')).toBe('Alice');
    expect(lookup(' v 123 ')).toBe('Alice');
    expect(lookup('V123')).toBe('Alice');
  });

  it('returns "" for an unknown VID', () => {
    const lookup = buildDriverLookup([rec({ vid: 'V-123', driverName: 'Alice' })]);
    expect(lookup('V-999')).toBe('');
  });

  it('keeps the first occurrence when duplicates share a normalised VID', () => {
    const lookup = buildDriverLookup([
      rec({ vid: 'V-1', driverName: 'First' }),
      rec({ vid: 'v.1', driverName: 'Second' }),
    ]);
    expect(lookup('V-1')).toBe('First');
  });

  it('skips records with blank / unusable VIDs', () => {
    const lookup = buildDriverLookup([
      rec({ vid: '', driverName: 'Ghost' }),
      rec({ vid: '   ', driverName: 'Spacey' }),
    ]);
    expect(lookup('')).toBe('');
  });
});

describe('buildDriverProfileLookup', () => {
  it('returns { driverName, transporter } for a known VID', () => {
    const lookup = buildDriverProfileLookup([
      rec({ vid: 'V-1', driverName: 'Alice', transporter: 'AcmeCo' }),
    ]);
    expect(lookup('V-1')).toEqual({ driverName: 'Alice', transporter: 'AcmeCo' });
  });

  it('returns empty strings for an unknown VID', () => {
    const lookup = buildDriverProfileLookup([]);
    expect(lookup('V-1')).toEqual({ driverName: '', transporter: '' });
  });

  it('normalises the query VID', () => {
    const lookup = buildDriverProfileLookup([
      rec({ vid: 'V.1-A', driverName: 'A', transporter: 'T' }),
    ]);
    expect(lookup('v1a')).toEqual({ driverName: 'A', transporter: 'T' });
  });
});

describe('NOT_FOUND sentinel', () => {
  it('is exported and equals "Not found"', () => {
    expect(NOT_FOUND).toBe('Not found');
  });
});
