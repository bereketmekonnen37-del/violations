import {
  ETHIOPIAN_DAY_ROLLOVER_HOUR,
  ETHIOPIAN_OFFSET_HOURS,
  type TimeMode,
} from '../features/timeMode/timeModeSlice';

/**
 * The raw timestamp strings across the app look like
 *   "2026-06-05 10:26:49"
 * or an ISO variant. This is a lightweight parser that reuses the same
 * lax logic the rest of the codebase already applies (see
 * `lib/locationRules.ts::parseEventDate`) but stays timezone-agnostic —
 * we treat the raw digits as wall-clock components and preserve them
 * regardless of the browser's timezone. That way "add 6 hours" produces
 * a stable result across users.
 */
interface RawParts {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
  s: number;
}

const RAW_RE =
  /^\s*(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?/;

const parseRaw = (raw: string): RawParts | null => {
  if (!raw) return null;
  const m = RAW_RE.exec(raw.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const s = m[6] ? Number(m[6]) : 0;
  if (![y, mo, d, h, mi, s].every(Number.isFinite)) return null;
  return { y, mo, d, h, mi, s };
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

const formatParts = (p: RawParts): string =>
  `${p.y}-${pad2(p.mo)}-${pad2(p.d)} ${pad2(p.h)}:${pad2(p.mi)}:${pad2(p.s)}`;

/** Add whole hours to a RawParts, rolling over days/months/years cleanly. */
const shiftHours = (p: RawParts, delta: number): RawParts => {
  // Use UTC math to avoid host-timezone drift; we only care about the wall-clock digits.
  const utcMs = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) + delta * 3_600_000;
  const shifted = new Date(utcMs);
  return {
    y: shifted.getUTCFullYear(),
    mo: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
    h: shifted.getUTCHours(),
    mi: shifted.getUTCMinutes(),
    s: shifted.getUTCSeconds(),
  };
};

/**
 * Convert a raw timestamp string to Ethiopian time (raw + offset). Leaves
 * the input untouched when the mode is 'default' or the string does not
 * parse as a recognizable timestamp.
 */
export const displayTime = (raw: string, mode: TimeMode): string => {
  if (mode !== 'ethiopian') return raw;
  const p = parseRaw(raw);
  if (!p) return raw;
  return formatParts(shiftHours(p, ETHIOPIAN_OFFSET_HOURS));
};

/**
 * The date-key an event should be attributed to for analytics grouping.
 *
 *   default   → the raw calendar date (YYYY-MM-DD from the raw string).
 *   ethiopian → the Ethiopian calendar date, with the business-day rule
 *               that anything in the 00:00–05:59 ET window rolls back to
 *               the previous day (so an overnight shift stays as one day).
 *
 * Returns `null` when both timestamps fail to parse.
 */
export const businessDayKey = (
  primary: string,
  secondary: string | undefined,
  mode: TimeMode,
): string | null => {
  const source =
    parseRaw(primary) ?? (secondary ? parseRaw(secondary) : null);
  if (!source) return null;
  if (mode !== 'ethiopian') {
    return `${source.y}-${pad2(source.mo)}-${pad2(source.d)}`;
  }
  const et = shiftHours(source, ETHIOPIAN_OFFSET_HOURS);
  const rolled =
    et.h < ETHIOPIAN_DAY_ROLLOVER_HOUR ? shiftHours(et, -24) : et;
  return `${rolled.y}-${pad2(rolled.mo)}-${pad2(rolled.d)}`;
};

/**
 * Human-friendly label for a business-day key ("YYYY-MM-DD" → "Fri Jun 5, 2026").
 * Deliberately does not depend on the current locale to keep output stable
 * across the app.
 */
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const formatBusinessDay = (key: string): string => {
  const [y, mo, d] = key.split('-').map(Number);
  if (!y || !mo || !d) return key;
  // Anchor to UTC noon so DST/timezone shifts can't move the weekday.
  const dt = new Date(Date.UTC(y, mo - 1, d, 12));
  return `${WEEKDAYS[dt.getUTCDay()]}, ${MONTHS[mo - 1]} ${d}, ${y}`;
};
