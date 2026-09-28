/**
 * Presentation helpers.
 *
 * Formatting logic for numbers, percentages, currency, byte sizes, and
 * durations. The admin dashboard uses these to keep numeric rendering
 * consistent across every screen.
 */

export function formatInteger(value: number, locale = 'en-US'): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
    Math.round(value),
  );
}

export function formatDecimal(
  value: number,
  fractionDigits = 2,
  locale = 'en-US',
): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatPercent(
  value: number,
  fractionDigits = 1,
  locale = 'en-US',
): string {
  if (!Number.isFinite(value)) return '—';
  return `${formatDecimal(value * 100, fractionDigits, locale)}%`;
}

export function formatCompact(value: number, locale = 'en-US'): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(decimals)} ${units[exponent]}`;
}

export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1_000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1_000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(1)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  return `${days.toFixed(1)}d`;
}

export function formatCurrency(
  value: number,
  currency = 'USD',
  locale = 'en-US',
): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDelta(
  value: number,
  fractionDigits = 1,
  locale = 'en-US',
): string {
  if (!Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatDecimal(Math.abs(value), fractionDigits, locale)}`;
}

export function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function humanCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .filter(Boolean)
    .map((piece) => capitalize(piece.toLowerCase()))
    .join(' ');
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  if (max <= 1) return value.slice(0, max);
  return `${value.slice(0, max - 1)}…`;
}

export function padLeft(value: string | number, target: number, char = ' '): string {
  const str = String(value);
  if (str.length >= target) return str;
  return char.repeat(target - str.length) + str;
}

export function padRight(value: string | number, target: number, char = ' '): string {
  const str = String(value);
  if (str.length >= target) return str;
  return str + char.repeat(target - str.length);
}

export function pluralize(count: number, singular: string, plural?: string): string {
  const label = count === 1 ? singular : plural ?? `${singular}s`;
  return `${formatInteger(count)} ${label}`;
}

export function joinWithAnd(values: string[]): string {
  if (values.length === 0) return '';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}
