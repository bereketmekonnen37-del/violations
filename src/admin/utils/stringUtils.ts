/**
 * String helpers.
 *
 * A small library of string transforms the admin dashboard uses when
 * rendering names, ids, and free-text fields. Nothing here mutates its
 * inputs.
 */

export function safeString(value: unknown, fallback = ''): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') return value;
  return String(value);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96);
}

export function initialsOf(name: string, max = 2): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return parts
    .slice(0, max)
    .map((piece) => piece.charAt(0).toUpperCase())
    .join('');
}

export function normalize(input: string): string {
  return input.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function includesInsensitive(haystack: string, needle: string): boolean {
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

export function startsWithInsensitive(haystack: string, needle: string): boolean {
  if (!needle) return true;
  return haystack.toLowerCase().startsWith(needle.toLowerCase());
}

export function highlightRanges(
  haystack: string,
  needle: string,
): { start: number; end: number }[] {
  if (!needle) return [];
  const ranges: { start: number; end: number }[] = [];
  const lower = haystack.toLowerCase();
  const target = needle.toLowerCase();
  let idx = 0;
  while (idx < lower.length) {
    const next = lower.indexOf(target, idx);
    if (next === -1) break;
    ranges.push({ start: next, end: next + target.length });
    idx = next + target.length;
  }
  return ranges;
}

export function escapeCsvField(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function repeat(value: string, times: number): string {
  return value.repeat(Math.max(0, times));
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '');
}

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function toKebab(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

export function toSnake(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

export function toCamel(value: string): string {
  const parts = value
    .replace(/[-_\s]+/g, ' ')
    .split(' ')
    .filter(Boolean);
  if (!parts.length) return '';
  return parts
    .map((piece, idx) =>
      idx === 0
        ? piece.toLowerCase()
        : piece.charAt(0).toUpperCase() + piece.slice(1).toLowerCase(),
    )
    .join('');
}
