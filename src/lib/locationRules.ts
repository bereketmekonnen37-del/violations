/**
 * Overspeed position lines look like:
 *   9.836043 °, 42.158783 °
 *   8.832883 °, 38.890138 ° - Addis Adama Express
 *   10.870325 °, 42.662973 ° - Djibouti
 *
 * A rule is matched against the tag AFTER " - ", falling back to the whole
 * plain-text line for Nights/Continuous positions. Match is whole-word,
 * case- and whitespace-insensitive:
 *   rule "Adama"          matches "Adama", "Adama Express", "Addis Adama Express"
 *   rule "Express"        matches "Addis Adama Express"
 *   rule "Adama Express"  matches "Adama Express" and "Addis Adama Express"
 *                         (every rule token must appear as a whole word).
 *
 * Each rule may also carry an optional list of ISO YYYY-MM-DD dates. When
 * present, the rule only fires when the event's own date is in that set.
 * An empty date list means "applies to every event."
 */

import type {
  AllowedLocationEntry,
  AllowedVidEntry,
} from '../features/rules/rulesSlice';

export interface ParsedCoord {
  lat: number;
  lng: number;
  /** Raw tag as parsed from the source, trimmed. Empty when none. */
  tag: string;
}

/**
 * Some exports leave the "°" separator in a coordinate line as a literal
 * degree/ordinal glyph, others as an undecoded HTML entity (e.g.
 * `8.54 &deg;, 39.20 &deg;- Adama`). Strip both so the coord-line regex
 * and the tag tokenizer see a clean string.
 */
const DEGREE_MARKER_RE = /°|º|&(?:deg|ordm|#0*176|#[xX]0*b0);/gi;

const stripDegreeMarkers = (raw: string): string =>
  raw.replace(DEGREE_MARKER_RE, '');

const COORD_LINE_RE =
  /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*(?:[-–—]\s*(.+))?\s*$/;

/** Normalize a tag for equality comparison: lowercase + collapse whitespace. */
export const normalizeTag = (raw: string): string =>
  String(raw ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Split a location string into lowercase whole-word tokens. Non-alphanumeric
 * chars (spaces, dashes, punctuation, HTML degree entities, digits from
 * coord numbers) act as delimiters. Empty tokens are dropped.
 */
const tokenize = (raw: string): string[] => {
  if (!raw) return [];
  const cleaned = stripDegreeMarkers(String(raw)).toLowerCase();
  const out: string[] = [];
  cleaned.split(/[^a-z0-9]+/i).forEach((t) => {
    // Drop pure numeric tokens — coord latitudes/longitudes would create
    // noise and false matches otherwise.
    if (!t) return;
    if (/^\d+$/.test(t)) return;
    out.push(t);
  });
  return out;
};

/**
 * Parse a single line of an overspeed-position string.
 * Returns null when the line is not a valid coordinate line.
 */
export const parseCoordLine = (line: string): ParsedCoord | null => {
  const m = COORD_LINE_RE.exec(stripDegreeMarkers(line));
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const tag = (m[3] ?? '').trim();
  return { lat, lng, tag };
};

/** Parse every coordinate line inside an overspeed-position blob. */
export const parseCoordBlob = (blob: string): ParsedCoord[] => {
  if (!blob) return [];
  const out: ParsedCoord[] = [];
  blob.split(/\r?\n/).forEach((line) => {
    const p = parseCoordLine(line);
    if (p) out.push(p);
  });
  return out;
};

/**
 * Extract the tag portion from a boss-entered rule. The boss might type
 * just "Djibouti", or paste an entire coordinate line
 * ("10.87 °, 42.66 ° - Djibouti"). We accept both.
 */
export const extractRuleTag = (input: string): string => {
  const raw = String(input ?? '').trim();
  if (!raw) return '';
  const parsed = parseCoordLine(raw);
  if (parsed && parsed.tag) return parsed.tag;
  // If the line parses as a coord but has no tag, treat the whole input
  // as-is (probably user intended a name that happens to look numeric).
  return raw;
};

/** Normalize a VID for equality comparison (strip punctuation, lowercase). */
export const normalizeVid = (vid: string): string =>
  String(vid ?? '')
    .replace(/[^0-9a-zA-Z]+/g, '')
    .toLowerCase();

/** Parse a raw event date string ("YYYY-MM-DD HH:MM:SS" or ISO) into a
 *  Date. Returns null when the string doesn't parse. */
export const parseEventDate = (raw: string): Date | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  const withT = new Date(
    trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T'),
  );
  if (!Number.isNaN(withT.getTime())) return withT;
  const plain = new Date(trimmed);
  return Number.isNaN(plain.getTime()) ? null : plain;
};

/** Return the local calendar date key (YYYY-MM-DD) for the given Date. */
export const toDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Convenience: get the date key from a raw event date field. */
export const eventDateKey = (
  primary: string,
  secondary?: string,
): string | null => {
  const d = parseEventDate(primary) ?? (secondary ? parseEventDate(secondary) : null);
  return d ? toDateKey(d) : null;
};

/* ── VID matcher (with per-entry date scope) ──────────────────────── */

export interface AllowedVidMatcher {
  /** Number of distinct VIDs in the compiled matcher. */
  size: number;
  /**
   * True when the (normalized) VID key has an allow entry AND either the
   * entry is unscoped or the event date matches one of the entry's dates.
   */
  matches(vidKey: string, eventDateKey: string | null): boolean;
}

/**
 * Compile a list of allowed-VID entries into a matcher.
 *
 * The internal map keeps, per normalized VID:
 *   - `null` → unrestricted (matches every event)
 *   - `Set<YYYY-MM-DD>` → only matches when the event date is in the set
 * Merging two entries for the same VID follows the union semantics:
 * "unrestricted wins."
 */
export const buildAllowedVidMatcher = (
  entries: readonly AllowedVidEntry[],
): AllowedVidMatcher => {
  const byVid = new Map<string, Set<string> | null>();
  for (const e of entries) {
    const key = normalizeVid(e.vid);
    if (!key) continue;
    const dates = (e.dates ?? []).filter(Boolean);
    const current = byVid.get(key);
    if (current === null) continue;
    if (dates.length === 0) {
      byVid.set(key, null);
      continue;
    }
    if (current === undefined) {
      byVid.set(key, new Set(dates));
    } else {
      dates.forEach((d) => current.add(d));
    }
  }
  return {
    size: byVid.size,
    matches(vidKey, evtKey) {
      const v = byVid.get(vidKey);
      if (v === undefined) return false;
      if (v === null) return true;
      if (!evtKey) return false;
      return v.has(evtKey);
    },
  };
};

/* ── Location tag matcher (with per-entry date scope) ────────────── */

interface CompiledLocationRule {
  tokens: string[];
  /** null = unscoped. */
  dates: Set<string> | null;
}

export interface AllowedTagMatcher {
  /** Number of compiled rules (rules with no tokens are dropped). */
  size: number;
  /** True when any coord-tag in the blob matches an active rule. */
  matchesBlob(blob: string, eventDateKey: string | null): boolean;
  /** True when any coord-tag OR any plain-text line matches an active rule. */
  matchesPosition(position: string, eventDateKey: string | null): boolean;
}

const ruleApplies = (
  r: CompiledLocationRule,
  evtKey: string | null,
): boolean => {
  if (r.dates === null) return true;
  if (!evtKey) return false;
  return r.dates.has(evtKey);
};

const anyRuleMatches = (
  rules: CompiledLocationRule[],
  tagTokens: string[],
  evtKey: string | null,
): boolean => {
  if (tagTokens.length === 0) return false;
  const tagSet = new Set(tagTokens);
  for (const r of rules) {
    if (!ruleApplies(r, evtKey)) continue;
    let all = true;
    for (const t of r.tokens) {
      if (!tagSet.has(t)) {
        all = false;
        break;
      }
    }
    if (all) return true;
  }
  return false;
};

/**
 * Compile a list of boss-entered location rules into an `AllowedTagMatcher`.
 * Rules that reduce to zero tokens after tokenizing (empty strings, pure
 * coord lines with no tag, etc.) are dropped.
 */
export const buildAllowedTagMatcher = (
  entries: readonly AllowedLocationEntry[],
): AllowedTagMatcher => {
  const rules: CompiledLocationRule[] = [];
  entries.forEach((e) => {
    const tokens = tokenize(extractRuleTag(e.value));
    if (tokens.length === 0) return;
    const dates = (e.dates ?? []).filter(Boolean);
    rules.push({
      tokens,
      dates: dates.length === 0 ? null : new Set(dates),
    });
  });

  return {
    size: rules.length,
    matchesBlob(blob, evtKey) {
      if (rules.length === 0) return false;
      const coords = parseCoordBlob(blob);
      for (const c of coords) {
        if (!c.tag) continue;
        if (anyRuleMatches(rules, tokenize(c.tag), evtKey)) return true;
      }
      return false;
    },
    matchesPosition(position, evtKey) {
      if (rules.length === 0) return false;
      const raw = stripDegreeMarkers(String(position ?? ''));
      if (!raw.trim()) return false;
      const coords = parseCoordBlob(raw);
      for (const c of coords) {
        if (!c.tag) continue;
        if (anyRuleMatches(rules, tokenize(c.tag), evtKey)) return true;
      }
      const lines = raw.split(/\r?\n/);
      for (const line of lines) {
        const cleaned = line.trim();
        if (!cleaned) continue;
        if (parseCoordLine(cleaned)) continue;
        if (anyRuleMatches(rules, tokenize(cleaned), evtKey)) return true;
      }
      return false;
    },
  };
};
