/**
 * Overspeed position lines look like:
 *   9.836043 °, 42.158783 °
 *   8.832883 °, 38.890138 ° - Addis Adama Express
 *   10.870325 °, 42.662973 ° - Djibouti
 *
 * A rule is matched against the tag AFTER " - ". Match is case- and
 * whitespace-insensitive but *exact-tag*: "Adama" does NOT match
 * "Adama Express".
 */

export interface ParsedCoord {
  lat: number;
  lng: number;
  /** Raw tag as parsed from the source, trimmed. Empty when none. */
  tag: string;
}

/**
 * Depending on the export, the "°" separator in a coordinate line comes
 * through as a literal degree/ordinal glyph OR as an HTML entity that the
 * parser never decoded (e.g. `8.54 &deg;, 39.20 &deg;- Adama`). Strip all
 * of those so the coord-line regex can find the numbers and the tag after
 * the dash regardless of source formatting.
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

/**
 * Build a Set of normalized rule tags. Empty inputs are ignored.
 */
export const buildAllowedTagSet = (rules: string[]): Set<string> => {
  const set = new Set<string>();
  rules.forEach((r) => {
    const tag = normalizeTag(extractRuleTag(r));
    if (tag) set.add(tag);
  });
  return set;
};

/**
 * Given a parsed overspeed-position blob and the allowed-tag set, return
 * true when ANY coordinate in the blob carries a tag that matches (exact,
 * case/whitespace-insensitive) one of the allowed tags.
 */
export const blobHasAllowedTag = (
  blob: string,
  allowed: Set<string>,
): boolean => {
  if (allowed.size === 0) return false;
  const coords = parseCoordBlob(blob);
  for (const c of coords) {
    if (!c.tag) continue;
    if (allowed.has(normalizeTag(c.tag))) return true;
  }
  return false;
};

/**
 * Broader match for the free-form Position A / Position B fields on the
 * Nights and Continuous sheets. These may be:
 *   - A coordinate line ("11.58 °, 43.07 ° - Djibouti")
 *   - A plain text location ("Djibouti", "Metehara")
 *   - Multi-line combinations of the above
 * Returns true when any coordinate tag OR any plain-text line matches
 * one of the allowed tags (case/whitespace-insensitive).
 */
export const positionHasAllowedTag = (
  position: string,
  allowed: Set<string>,
): boolean => {
  if (allowed.size === 0) return false;
  const raw = stripDegreeMarkers(String(position ?? ''));
  if (!raw.trim()) return false;
  if (blobHasAllowedTag(raw, allowed)) return true;
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const cleaned = line.trim();
    if (!cleaned) continue;
    // If the line parses as a coord, `blobHasAllowedTag` already handled it.
    if (parseCoordLine(cleaned)) continue;
    if (allowed.has(normalizeTag(cleaned))) return true;
  }
  return false;
};

/** Normalize a VID for equality comparison (strip punctuation, lowercase). */
export const normalizeVid = (vid: string): string =>
  String(vid ?? '')
    .replace(/[^0-9a-zA-Z]+/g, '')
    .toLowerCase();

/** Build a Set of normalized allowed VIDs. */
export const buildAllowedVidSet = (vids: string[]): Set<string> => {
  const set = new Set<string>();
  vids.forEach((v) => {
    const n = normalizeVid(v);
    if (n) set.add(n);
  });
  return set;
};
