/**
 * Parse a duration string into seconds.
 *
 * Accepts the shapes produced by the unfiltered parsers:
 *   - "1 hr 30 min 20 sec" / "1 hr 30 min" / "45 sec"        (speed)
 *   - "1h 30min 20s" / "1h 30min" / "45s"                    (nights / continuous)
 *   - "01:30:00" / "1:30:00"   →  H:MM:SS
 *   - "01:30"     / "1:30"     →  H:MM   (≥ 1 hour is treated as h:mm)
 *   - "0:45"                   →  M:SS   (zero hours collapses to minutes:seconds)
 *
 * Returns `NaN` when nothing parses, so callers can decide whether to keep
 * or drop the row.
 */
export const parseDurationSeconds = (raw: string): number => {
  const s = String(raw ?? '').trim();
  if (!s) return Number.NaN;

  // Colon form: HH:MM:SS or H:MM(:SS) or MM:SS
  const colon = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colon) {
    const a = Number(colon[1]);
    const b = Number(colon[2]);
    const c = colon[3] !== undefined ? Number(colon[3]) : undefined;
    if (c !== undefined) {
      // H:MM:SS
      return a * 3600 + b * 60 + c;
    }
    // Two-segment: prefer H:MM when first part is >= 1 (matches the user's
    // "1:30 = 1 hour 30 minutes" threshold), otherwise MM:SS.
    if (a >= 1) return a * 3600 + b * 60;
    return b;
  }

  // Text form: pull out hours / minutes / seconds tokens individually.
  let total = 0;
  let matched = false;

  const hr = s.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i);
  if (hr) {
    total += Number(hr[1]) * 3600;
    matched = true;
  }

  const min = s.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/i);
  if (min) {
    total += Number(min[1]) * 60;
    matched = true;
  }

  const sec = s.match(/(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)\b/i);
  if (sec) {
    total += Number(sec[1]);
    matched = true;
  }

  if (matched) return total;

  // Last resort: bare number → seconds.
  const bare = s.match(/^(\d+(?:\.\d+)?)$/);
  if (bare) return Number(bare[1]);

  return Number.NaN;
};

export const SPEED_MIN_SECONDS = 60; // 1 minute
export const NIGHTS_MIN_SECONDS = 90 * 60; // 1 hour 30 minutes
export const CONTINUOUS_MIN_SECONDS = 5 * 3600; // 5 hours
