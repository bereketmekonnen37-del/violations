import type { NightRow } from '../types';
import { parseDurationSeconds } from './duration';

/**
 * Ethiopian "night" spans 18:00 → 06:00 next morning and is treated as ONE
 * business night. So a violation that starts at 22:00 on Jun 6 and another
 * that starts at 01:30 on Jun 7 both belong to the same night, keyed by the
 * evening's calendar date (Jun 6). The raw timestamps are assumed to already
 * be in Ethiopian local time — we no longer apply any offset.
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

const shiftDays = (p: RawParts, delta: number): RawParts => {
  const ms = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) + delta * 86_400_000;
  const dt = new Date(ms);
  return {
    y: dt.getUTCFullYear(),
    mo: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
    h: dt.getUTCHours(),
    mi: dt.getUTCMinutes(),
    s: dt.getUTCSeconds(),
  };
};

/**
 * Anything before this hour is treated as belonging to the PREVIOUS evening's
 * shift (e.g. 02:30 on Jun 7 belongs to Jun 6's night). Combined with the
 * fact that evening rows (18:00+) already carry the evening's date, this
 * gives every night a stable "YYYY-MM-DD of the evening" bucket key.
 */
const NIGHT_END_HOUR = 6;

/**
 * Bucket key (YYYY-MM-DD of the evening) for the given raw timestamp under
 * the Ethiopian night convention.
 *
 *   hour ≥ 18                → key = same day
 *   hour <  6                → key = previous day (still in the prior night)
 *   otherwise (day-time row) → key = same day (rows won't merge with a night)
 */
export const nightBucketKey = (raw: string): string | null => {
  const p = parseRaw(raw);
  if (!p) return null;
  const rolled = p.h < NIGHT_END_HOUR ? shiftDays(p, -1) : p;
  return `${rolled.y}-${pad2(rolled.mo)}-${pad2(rolled.d)}`;
};

/** Sort key: absolute epoch (ms) using the raw timestamp as UTC digits. */
const sortKey = (raw: string): number => {
  const p = parseRaw(raw);
  if (!p) return Number.POSITIVE_INFINITY;
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
};

/** Format seconds → "1h 30min 20s" (skips zero segments). */
const formatDuration = (totalSeconds: number): string => {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}min`);
  if (sec > 0 || parts.length === 0) parts.push(`${sec}s`);
  return parts.join(' ');
};

export interface MergedNightRow extends NightRow {
  /** How many raw rows this merged row represents (1 = not merged). */
  mergedCount: number;
}

/**
 * True when the row has a usable duration AND at least one position filled.
 * Rows that fail this check are excluded from Master Fleet counts entirely
 * (per the boss: "remove any data that doesn't have a duration of any
 * position in it").
 */
export const isNightRowValid = (row: NightRow): boolean => {
  const seconds = parseDurationSeconds(row.duration);
  if (!Number.isFinite(seconds) || seconds <= 0) return false;
  const hasPosition =
    Boolean(row.positionA && row.positionA.trim()) ||
    Boolean(row.positionB && row.positionB.trim());
  return hasPosition;
};

/**
 * Group consecutive rows that fall in the same Ethiopian-night bucket and
 * collapse them into a single row:
 *   - timeA / positionA = earliest row's start
 *   - timeB / positionB = latest row's end
 *   - duration          = sum of individual durations, reformatted
 *   - mergedCount       = count of raw rows folded in
 * Invalid rows (see `isNightRowValid`) are dropped before merging.
 */
export const mergeNightRows = (rows: NightRow[]): MergedNightRow[] => {
  const valid = rows.filter(isNightRowValid);
  if (valid.length === 0) return [];

  const buckets = new Map<string, NightRow[]>();
  const orphans: NightRow[] = [];
  valid.forEach((row) => {
    const key = nightBucketKey(row.timeA) ?? nightBucketKey(row.timeB);
    if (!key) {
      orphans.push(row);
      return;
    }
    const list = buckets.get(key);
    if (list) list.push(row);
    else buckets.set(key, [row]);
  });

  const merged: MergedNightRow[] = [];

  buckets.forEach((group) => {
    if (group.length === 1) {
      merged.push({ ...group[0], mergedCount: 1 });
      return;
    }
    const sorted = [...group].sort((a, b) => sortKey(a.timeA) - sortKey(b.timeA));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalSeconds = sorted.reduce(
      (acc, r) => acc + parseDurationSeconds(r.duration),
      0,
    );
    merged.push({
      id: first.id,
      timeA: first.timeA,
      positionA: first.positionA,
      timeB: last.timeB || first.timeB,
      positionB: last.positionB || first.positionB,
      duration: formatDuration(totalSeconds),
      length: first.length,
      averageSpeed: first.averageSpeed,
      maxSpeed: first.maxSpeed,
      mergedCount: sorted.length,
    });
  });

  orphans.forEach((row) => merged.push({ ...row, mergedCount: 1 }));

  merged.sort((a, b) => sortKey(a.timeA) - sortKey(b.timeA));
  return merged;
};
