/**
 * Date helpers.
 *
 * The admin dashboard renders dates in many places: audit log timestamps,
 * user creation dates, "last active" columns, chart axes, and export
 * filenames. These helpers centralise all of that formatting.
 */

const MS_PER_SECOND = 1_000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_WEEK = 7 * MS_PER_DAY;

export function parseDate(input: string | number | Date): Date {
  if (input instanceof Date) return input;
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date input: ${String(input)}`);
  }
  return parsed;
}

export function toIsoDate(value: Date | string | number): string {
  return parseDate(value).toISOString();
}

export function formatDate(
  value: Date | string | number,
  locale = 'en-US',
): string {
  const date = parseDate(value);
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function formatDateTime(
  value: Date | string | number,
  locale = 'en-US',
): string {
  const date = parseDate(value);
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(
  value: Date | string | number,
  locale = 'en-US',
): string {
  const date = parseDate(value);
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(
  value: Date | string | number,
  now: Date = new Date(),
): string {
  const then = parseDate(value);
  const diff = then.getTime() - now.getTime();
  const absDiff = Math.abs(diff);
  const suffix = diff <= 0 ? 'ago' : 'from now';

  if (absDiff < MS_PER_MINUTE) return `just now`;
  if (absDiff < MS_PER_HOUR) {
    const minutes = Math.round(absDiff / MS_PER_MINUTE);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ${suffix}`;
  }
  if (absDiff < MS_PER_DAY) {
    const hours = Math.round(absDiff / MS_PER_HOUR);
    return `${hours} hour${hours === 1 ? '' : 's'} ${suffix}`;
  }
  if (absDiff < MS_PER_WEEK) {
    const days = Math.round(absDiff / MS_PER_DAY);
    return `${days} day${days === 1 ? '' : 's'} ${suffix}`;
  }
  return formatDate(then);
}

export function startOfDay(value: Date | string | number): Date {
  const date = parseDate(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(value: Date | string | number): Date {
  const date = parseDate(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function addDays(value: Date | string | number, days: number): Date {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return date;
}

export function daysBetween(
  a: Date | string | number,
  b: Date | string | number,
): number {
  const start = startOfDay(a).getTime();
  const end = startOfDay(b).getTime();
  return Math.round((end - start) / MS_PER_DAY);
}

export function isSameDay(
  a: Date | string | number,
  b: Date | string | number,
): boolean {
  const da = parseDate(a);
  const db = parseDate(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function isPast(value: Date | string | number, now: Date = new Date()): boolean {
  return parseDate(value).getTime() < now.getTime();
}

export function isFuture(value: Date | string | number, now: Date = new Date()): boolean {
  return parseDate(value).getTime() > now.getTime();
}

export function isWithin(
  value: Date | string | number,
  since: Date | string | number,
  until: Date | string | number,
): boolean {
  const t = parseDate(value).getTime();
  return t >= parseDate(since).getTime() && t <= parseDate(until).getTime();
}

export function filenameTimestamp(value: Date | string | number = new Date()): string {
  const d = parseDate(value);
  const pad = (n: number, w = 2) => n.toString().padStart(w, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

export function formatIsoDayRange(since: Date, until: Date): string {
  return `${formatDate(since)} → ${formatDate(until)}`;
}

export function toIsoDay(value: Date | string | number): string {
  const d = parseDate(value);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
