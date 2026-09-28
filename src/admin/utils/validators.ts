/**
 * Field-level validators.
 *
 * These helpers keep validation logic side-effect free so that both hooks
 * and services can use them without pulling in a form library.
 */

import type { AdminUserRole } from '../types/user.types';

export interface FieldError {
  field: string;
  message: string;
}

export function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) && trimmed.length <= 254;
}

export function isPhone(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const digits = value.replace(/[^\d]/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function isRole(value: unknown): value is AdminUserRole {
  return (
    value === 'boss' ||
    value === 'staff' ||
    value === 'admin' ||
    value === 'super_admin'
  );
}

export function isStrongPassword(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length < 12) return false;
  if (!/[A-Z]/.test(value)) return false;
  if (!/[a-z]/.test(value)) return false;
  if (!/[0-9]/.test(value)) return false;
  if (!/[^A-Za-z0-9]/.test(value)) return false;
  return true;
}

export function validateDisplayName(value: string): string | undefined {
  if (!isNonEmpty(value)) return 'Display name is required.';
  if (value.trim().length < 2) return 'Display name must be at least 2 characters.';
  if (value.length > 128) return 'Display name is too long (max 128).';
  return undefined;
}

export function validateEmail(value: string): string | undefined {
  if (!isNonEmpty(value)) return 'Email address is required.';
  if (!isEmail(value)) return 'Email must be a valid address.';
  return undefined;
}

export function validatePhone(value: string | undefined): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (!isPhone(value)) return 'Phone must contain 7 to 15 digits.';
  return undefined;
}

export function validateRole(value: string): string | undefined {
  if (!isNonEmpty(value)) return 'Role is required.';
  if (!isRole(value)) return 'Unknown role selection.';
  return undefined;
}

export function validateNotes(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (value.length > 2_000) return 'Notes are too long (max 2 000 characters).';
  return undefined;
}

export function collect(errors: (FieldError | undefined)[]): FieldError[] {
  return errors.filter((entry): entry is FieldError => Boolean(entry));
}

export function toFieldError(
  field: string,
  message: string | undefined,
): FieldError | undefined {
  return message ? { field, message } : undefined;
}

export function hasErrors(errors: FieldError[]): boolean {
  return errors.length > 0;
}

export function errorMessageFor(
  errors: FieldError[],
  field: string,
): string | undefined {
  return errors.find((entry) => entry.field === field)?.message;
}
