import { describe, it, expect } from 'vitest';
import {
  buildAllowedTagMatcher,
  buildAllowedVidMatcher,
  eventDateKey,
  extractRuleTag,
  normalizeTag,
  normalizeVid,
  parseCoordBlob,
  parseCoordLine,
  parseEventDate,
  toDateKey,
} from '../../src/lib/locationRules';

describe('normalizeTag / normalizeVid', () => {
  it('normalizeTag lowercases and collapses whitespace', () => {
    expect(normalizeTag('  Addis   Adama  ')).toBe('addis adama');
  });

  it('normalizeVid strips punctuation and lowercases', () => {
    expect(normalizeVid('V-123 abc.')).toBe('v123abc');
    expect(normalizeVid('')).toBe('');
  });
});

describe('parseCoordLine', () => {
  it('parses a two-number line without a tag', () => {
    const p = parseCoordLine('9.836043 °, 42.158783 °');
    expect(p).toEqual({ lat: 9.836043, lng: 42.158783, tag: '' });
  });

  it('parses a line with a tag after " - "', () => {
    const p = parseCoordLine('10.870325 °, 42.662973 ° - Djibouti');
    expect(p).not.toBeNull();
    expect(p?.tag).toBe('Djibouti');
  });

  it('accepts HTML degree entity as the separator', () => {
    const p = parseCoordLine('8.54 &deg;, 39.20 &deg;- Adama');
    expect(p).not.toBeNull();
    expect(p?.tag).toBe('Adama');
  });

  it('returns null for a non-coord line', () => {
    expect(parseCoordLine('just a place')).toBeNull();
  });
});

describe('parseCoordBlob', () => {
  it('returns one entry per coordinate line, ignoring blanks', () => {
    const blob = [
      '9.0, 42.0 - Adama',
      '',
      'not a coord',
      '10.0, 42.5 - Djibouti',
    ].join('\n');
    const out = parseCoordBlob(blob);
    expect(out.map((c) => c.tag)).toEqual(['Adama', 'Djibouti']);
  });
});

describe('extractRuleTag', () => {
  it('returns the tag portion when the input is a full coord line', () => {
    expect(extractRuleTag('10.87 °, 42.66 ° - Djibouti')).toBe('Djibouti');
  });

  it('returns the raw string when no coord present', () => {
    expect(extractRuleTag('Adama')).toBe('Adama');
  });

  it('returns "" for empty / null-ish', () => {
    expect(extractRuleTag('')).toBe('');
    // @ts-expect-error null-safe
    expect(extractRuleTag(null)).toBe('');
  });
});

describe('parseEventDate / toDateKey / eventDateKey', () => {
  it('parses "YYYY-MM-DD HH:MM:SS" style dates', () => {
    const d = parseEventDate('2026-06-15 12:34:56');
    expect(d).toBeInstanceOf(Date);
    expect(d && !Number.isNaN(d.getTime())).toBe(true);
  });

  it('parses ISO strings', () => {
    const d = parseEventDate('2026-06-15T12:34:56Z');
    expect(d).toBeInstanceOf(Date);
  });

  it('returns null for garbage', () => {
    expect(parseEventDate('')).toBeNull();
    expect(parseEventDate('not-a-date')).toBeNull();
  });

  it('toDateKey emits YYYY-MM-DD from local components', () => {
    const d = new Date(2026, 5, 15); // Jun 15 local
    expect(toDateKey(d)).toBe('2026-06-15');
  });

  it('eventDateKey falls back to the secondary field', () => {
    expect(eventDateKey('', '2026-06-15T12:00:00Z')).toBe('2026-06-15');
    expect(eventDateKey('nope', '2026-06-15T12:00:00Z')).toBe('2026-06-15');
    expect(eventDateKey('nope', 'also-nope')).toBeNull();
  });
});

describe('buildAllowedVidMatcher', () => {
  it('matches an unscoped entry on every event', () => {
    const m = buildAllowedVidMatcher([{ vid: 'V-123', dates: [] }]);
    expect(m.matches('v123', '2026-06-15')).toBe(true);
    expect(m.matches('v123', null)).toBe(true);
  });

  it('scoped entry only matches on listed dates', () => {
    const m = buildAllowedVidMatcher([
      { vid: 'V-123', dates: ['2026-06-15'] },
    ]);
    expect(m.matches('v123', '2026-06-15')).toBe(true);
    expect(m.matches('v123', '2026-06-16')).toBe(false);
    expect(m.matches('v123', null)).toBe(false);
  });

  it('unrestricted wins when a VID has both scoped and unscoped entries', () => {
    const m = buildAllowedVidMatcher([
      { vid: 'V-1', dates: ['2026-06-15'] },
      { vid: 'V-1', dates: [] },
    ]);
    expect(m.matches('v1', '2026-06-16')).toBe(true);
  });

  it('unions dates from multiple scoped entries for the same VID', () => {
    const m = buildAllowedVidMatcher([
      { vid: 'V-1', dates: ['2026-06-15'] },
      { vid: 'V-1', dates: ['2026-06-16'] },
    ]);
    expect(m.matches('v1', '2026-06-15')).toBe(true);
    expect(m.matches('v1', '2026-06-16')).toBe(true);
    expect(m.matches('v1', '2026-06-17')).toBe(false);
  });

  it('does not match an unknown VID', () => {
    const m = buildAllowedVidMatcher([{ vid: 'V-1', dates: [] }]);
    expect(m.matches('v999', '2026-06-15')).toBe(false);
  });
});

describe('buildAllowedTagMatcher', () => {
  const blob = ['9.0, 42.0 - Adama Express', '10.0, 42.5 - Djibouti'].join('\n');

  it('matches when every rule token appears in some coord tag', () => {
    const m = buildAllowedTagMatcher([{ value: 'Adama', dates: [] }]);
    expect(m.matchesBlob(blob, null)).toBe(true);
  });

  it('multi-word rule requires ALL tokens in the same tag', () => {
    const m = buildAllowedTagMatcher([{ value: 'Adama Express', dates: [] }]);
    expect(m.matchesBlob(blob, null)).toBe(true);
    const noExpress = ['9.0, 42.0 - Addis', '10.0, 42.5 - Adama'].join('\n');
    expect(m.matchesBlob(noExpress, null)).toBe(false);
  });

  it('does not match against a bare coord line with no tag', () => {
    const m = buildAllowedTagMatcher([{ value: 'Adama', dates: [] }]);
    expect(m.matchesBlob('9.0, 42.0', null)).toBe(false);
  });

  it('date-scoped rule only matches on listed dates', () => {
    const m = buildAllowedTagMatcher([
      { value: 'Adama', dates: ['2026-06-15'] },
    ]);
    expect(m.matchesBlob(blob, '2026-06-15')).toBe(true);
    expect(m.matchesBlob(blob, '2026-06-16')).toBe(false);
  });

  it('matchesPosition also matches a plain-text non-coord line', () => {
    const m = buildAllowedTagMatcher([{ value: 'Djibouti', dates: [] }]);
    expect(m.matchesPosition('Somewhere Djibouti area', null)).toBe(true);
    expect(m.matchesPosition('Somewhere Adama area', null)).toBe(false);
  });

  it('drops rules that reduce to zero tokens', () => {
    const m = buildAllowedTagMatcher([
      { value: '', dates: [] },
      { value: '   ', dates: [] },
      { value: '9.0, 42.0', dates: [] }, // coord with no tag
    ]);
    expect(m.size).toBe(0);
    expect(m.matchesBlob(blob, null)).toBe(false);
  });
});
