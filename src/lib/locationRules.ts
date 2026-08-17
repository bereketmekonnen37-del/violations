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
 */

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

/**
 * Compiled representation of the allowed-locations list.
 *   `size`       — number of rules that produced at least one token.
 *   `ruleTokens` — per-rule list of tokens (all required to match a tag).
 */
export interface AllowedTagMatcher {
  size: number;
  ruleTokens: string[][];
}

/**
 * Compile a list of boss-entered rules into an `AllowedTagMatcher`.
 * Empty rules and rules that reduce to zero tokens after tokenizing are
 * dropped. Returned shape is `.size`-compatible with the legacy
 * `Set<string>` signature so callers can still do `matcher.size > 0`.
 */
export const buildAllowedTagSet = (rules: string[]): AllowedTagMatcher => {
  const ruleTokens: string[][] = [];
  rules.forEach((r) => {
    const tokens = tokenize(extractRuleTag(r));
    if (tokens.length > 0) ruleTokens.push(tokens);
  });
  return { size: ruleTokens.length, ruleTokens };
};

const tagTokensMatch = (
  tagTokens: string[],
  matcher: AllowedTagMatcher,
): boolean => {
  if (matcher.size === 0 || tagTokens.length === 0) return false;
  const tagSet = new Set(tagTokens);
  for (const rule of matcher.ruleTokens) {
    // Every token in the rule must appear as a whole word in the tag.
    let all = true;
    for (const t of rule) {
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
 * True when any coordinate tag inside the blob whole-word-matches an
 * allowed rule. Non-coord lines are ignored — use `positionHasAllowedTag`
 * for those.
 */
export const blobHasAllowedTag = (
  blob: string,
  allowed: AllowedTagMatcher,
): boolean => {
  if (allowed.size === 0) return false;
  const coords = parseCoordBlob(blob);
  for (const c of coords) {
    if (!c.tag) continue;
    if (tagTokensMatch(tokenize(c.tag), allowed)) return true;
  }
  return false;
};

/**
 * Broader match for the free-form Position A / Position B fields on the
 * Nights and Continuous sheets. These may be:
 *   - A coordinate line ("11.58 °, 43.07 ° - Djibouti")
 *   - A plain text location ("Djibouti", "Metehara", "Addis Adama Express")
 *   - Multi-line combinations of the above
 * Returns true when the tokens on any coord-tag OR any plain-text line
 * satisfy an allowed rule.
 */
export const positionHasAllowedTag = (
  position: string,
  allowed: AllowedTagMatcher,
): boolean => {
  if (allowed.size === 0) return false;
  const raw = stripDegreeMarkers(String(position ?? ''));
  if (!raw.trim()) return false;
  if (blobHasAllowedTag(raw, allowed)) return true;
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const cleaned = line.trim();
    if (!cleaned) continue;
    // Coord lines were already handled above via blobHasAllowedTag.
    if (parseCoordLine(cleaned)) continue;
    if (tagTokensMatch(tokenize(cleaned), allowed)) return true;
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
