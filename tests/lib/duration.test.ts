import { describe, it, expect } from 'vitest';
import {
  parseDurationSeconds,
  SPEED_MIN_SECONDS,
  NIGHTS_MIN_SECONDS,
  CONTINUOUS_MIN_SECONDS,
} from '../../src/lib/duration';

describe('parseDurationSeconds — text form', () => {
  it('parses "1 hr 30 min 20 sec" as a speed-style triple', () => {
    expect(parseDurationSeconds('1 hr 30 min 20 sec')).toBe(3600 + 30 * 60 + 20);
  });

  it('parses "1h 30min 20s" as a nights/continuous-style triple', () => {
    expect(parseDurationSeconds('1h 30min 20s')).toBe(3600 + 30 * 60 + 20);
  });

  it('parses partial tokens ("45 sec", "5 min")', () => {
    expect(parseDurationSeconds('45 sec')).toBe(45);
    expect(parseDurationSeconds('5 min')).toBe(300);
    expect(parseDurationSeconds('2 hrs')).toBe(7200);
  });

  it('handles decimals inside a text token', () => {
    expect(parseDurationSeconds('1.5 hr')).toBe(5400);
  });

  it('is case-insensitive across token forms', () => {
    expect(parseDurationSeconds('1 HR 30 MIN')).toBe(5400);
    expect(parseDurationSeconds('1Hour 30Minutes 5Seconds')).toBe(5405);
  });
});

describe('parseDurationSeconds — colon form', () => {
  it('parses H:MM:SS', () => {
    expect(parseDurationSeconds('01:30:20')).toBe(3600 + 30 * 60 + 20);
    expect(parseDurationSeconds('1:30:00')).toBe(5400);
  });

  it('treats "1:30" as one hour thirty minutes (H:MM)', () => {
    expect(parseDurationSeconds('1:30')).toBe(5400);
    expect(parseDurationSeconds('01:30')).toBe(5400);
  });

  it('treats "0:45" as forty-five seconds (MM:SS collapses)', () => {
    expect(parseDurationSeconds('0:45')).toBe(45);
  });
});

describe('parseDurationSeconds — edge cases', () => {
  it('returns NaN for empty / garbage input', () => {
    expect(parseDurationSeconds('')).toBeNaN();
    expect(parseDurationSeconds('   ')).toBeNaN();
    expect(parseDurationSeconds('not a duration')).toBeNaN();
  });

  it('treats a bare integer as seconds', () => {
    expect(parseDurationSeconds('120')).toBe(120);
  });

  it('is null/undefined-safe (via String coercion)', () => {
    // @ts-expect-error deliberate null
    expect(parseDurationSeconds(null)).toBeNaN();
    // @ts-expect-error deliberate undefined
    expect(parseDurationSeconds(undefined)).toBeNaN();
  });
});

describe('threshold constants', () => {
  it('match the values documented in the module', () => {
    expect(SPEED_MIN_SECONDS).toBe(60);
    expect(NIGHTS_MIN_SECONDS).toBe(90 * 60);
    expect(CONTINUOUS_MIN_SECONDS).toBe(5 * 3600);
  });
});
