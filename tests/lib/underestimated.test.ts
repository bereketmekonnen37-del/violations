import { describe, it, expect } from 'vitest';
import { parseKm, isUnderestimated } from '../../src/lib/underestimated';

describe('parseKm', () => {
  it('parses explicit "km" values', () => {
    expect(parseKm('12.5 km')).toBe(12.5);
    expect(parseKm('120 kilometers')).toBe(120);
    expect(parseKm('120 kilometres')).toBe(120);
  });

  it('parses a bare number as kilometres', () => {
    expect(parseKm('42')).toBe(42);
    expect(parseKm('42.75')).toBe(42.75);
  });

  it('converts meters to kilometres', () => {
    expect(parseKm('800 m')).toBe(0.8);
    expect(parseKm('1500 meters')).toBe(1.5);
    expect(parseKm('250 metres')).toBe(0.25);
  });

  it('strips thousands separators before parsing', () => {
    expect(parseKm('1,204 km')).toBe(1204);
  });

  it('returns null for cells with no usable number', () => {
    expect(parseKm('')).toBeNull();
    expect(parseKm('n/a')).toBeNull();
    // @ts-expect-error nullish coalesce path
    expect(parseKm(null)).toBeNull();
    // @ts-expect-error nullish coalesce path
    expect(parseKm(undefined)).toBeNull();
  });
});

describe('isUnderestimated', () => {
  const rule = { minDurationSeconds: 5 * 3600, maxKm: 10 } as const;

  it('flags a long but short-distance continuous event', () => {
    expect(isUnderestimated(rule, 6 * 3600, '8 km')).toBe(true);
  });

  it('does not flag when duration is under the rule minimum', () => {
    expect(isUnderestimated(rule, 4 * 3600, '5 km')).toBe(false);
  });

  it('does not flag when distance is over the rule cap', () => {
    expect(isUnderestimated(rule, 6 * 3600, '25 km')).toBe(false);
  });

  it('is false-safe when the rule or its bounds are missing', () => {
    expect(isUnderestimated(null, 6 * 3600, '1 km')).toBe(false);
    expect(isUnderestimated(undefined, 6 * 3600, '1 km')).toBe(false);
    expect(
      isUnderestimated({ minDurationSeconds: 0, maxKm: 10 }, 6 * 3600, '1 km'),
    ).toBe(false);
    expect(
      isUnderestimated({ minDurationSeconds: 5 * 3600, maxKm: 0 }, 6 * 3600, '1 km'),
    ).toBe(false);
  });

  it('is false when the length cell has no usable number', () => {
    expect(isUnderestimated(rule, 6 * 3600, '')).toBe(false);
    expect(isUnderestimated(rule, 6 * 3600, 'unknown')).toBe(false);
  });

  it('boundary values pass (>= min duration, <= max km)', () => {
    expect(isUnderestimated(rule, 5 * 3600, '10 km')).toBe(true);
  });
});
