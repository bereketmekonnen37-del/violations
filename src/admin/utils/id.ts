/**
 * Deterministic ID helpers.
 *
 * The admin module needs identifiers for records, sessions, and request
 * envelopes without pulling in a UUID dependency. These helpers produce
 * URL-safe IDs and short display references.
 */

const ID_ALPHABET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

export function generateId(prefix?: string, length = 16): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
  }
  return prefix ? `${prefix}_${out}` : out;
}

export function generateShortId(length = 6): string {
  return generateId(undefined, length);
}

export function generateRequestId(): string {
  return generateId('req', 20);
}

export function generateSessionId(): string {
  return generateId('sess', 24);
}

export function generateUserId(): string {
  return generateId('usr', 18);
}

export function generateAuditId(): string {
  return generateId('aud', 20);
}

export function generateTraceId(): string {
  return generateId('trc', 16);
}

export function shortRef(id: string, length = 6): string {
  if (!id) return '';
  const clean = id.replace(/[^a-zA-Z0-9]/g, '');
  if (clean.length <= length) return clean;
  return clean.slice(clean.length - length);
}

export function looksLikeUserId(value: string): boolean {
  return /^usr_[A-Za-z0-9]{6,32}$/.test(value);
}

export function looksLikeAuditId(value: string): boolean {
  return /^aud_[A-Za-z0-9]{6,32}$/.test(value);
}

export function looksLikeSessionId(value: string): boolean {
  return /^sess_[A-Za-z0-9]{6,32}$/.test(value);
}
