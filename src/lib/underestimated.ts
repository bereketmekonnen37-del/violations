import type { UnderestimatedRule } from '../features/rules/rulesSlice';

/**
 * Pull a distance in kilometres out of a Continuous "length" cell such as
 * "12.5 km", "1,204 km" or "800 m". A bare number is read as kilometres
 * (that is what the Continuous parser normalises to). Returns `null` when
 * the cell holds no usable number.
 */
export const parseKm = (raw: string): number | null => {
  const m = String(raw ?? '').match(
    /(\d[\d,]*(?:\.\d+)?)\s*(km|kilometers?|kilometres?|meters?|metres?|m)?\b/i,
  );
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  const unit = (m[2] ?? '').toLowerCase();
  const isMeters = unit === 'm' || unit.startsWith('meter') || unit.startsWith('metre');
  return isMeters ? n / 1000 : n;
};

/** True when a Continuous event is "under-estimated": long enough
 *  (duration >= rule hours) yet short on distance (distance <= rule km). */
export const isUnderestimated = (
  rule: UnderestimatedRule | null | undefined,
  durationSeconds: number,
  lengthRaw: string,
): boolean => {
  if (!rule || !(rule.minDurationSeconds > 0) || !(rule.maxKm > 0)) return false;
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return false;
  if (durationSeconds < rule.minDurationSeconds) return false;
  const km = parseKm(lengthRaw);
  return km != null && km <= rule.maxKm;
};
