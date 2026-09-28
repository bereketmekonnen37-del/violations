/**
 * Filtering helpers.
 *
 * The admin tables filter across role, status, tags, transporters, and
 * date-ranges. These helpers keep filtering pure so it can be reused in
 * tests without React or Redux.
 */

import type { AdminUser, AdminUserFilterState } from '../types/user.types';
import { includesInsensitive } from './stringUtils';

export function matchesRole(user: AdminUser, filter: AdminUserFilterState): boolean {
  if (filter.role === 'all') return true;
  return user.role === filter.role;
}

export function matchesStatus(
  user: AdminUser,
  filter: AdminUserFilterState,
): boolean {
  if (filter.status === 'all') return true;
  return user.status === filter.status;
}

export function matchesTransporter(
  user: AdminUser,
  filter: AdminUserFilterState,
): boolean {
  if (!filter.transporter) return true;
  return user.transporters.includes(filter.transporter);
}

export function matchesTag(user: AdminUser, filter: AdminUserFilterState): boolean {
  if (!filter.tag) return true;
  return user.tags.includes(filter.tag);
}

export function matchesSearch(
  user: AdminUser,
  filter: AdminUserFilterState,
): boolean {
  if (!filter.search) return true;
  const needle = filter.search.trim();
  if (!needle) return true;
  return (
    includesInsensitive(user.displayName, needle) ||
    includesInsensitive(user.contact.primaryEmail, needle) ||
    (user.contact.phone
      ? includesInsensitive(user.contact.phone, needle)
      : false) ||
    user.transporters.some((entry) => includesInsensitive(entry, needle)) ||
    user.tags.some((entry) => includesInsensitive(entry, needle))
  );
}

export function matchesCreatedRange(
  user: AdminUser,
  filter: AdminUserFilterState,
): boolean {
  const created = new Date(user.audit.createdAt).getTime();
  if (filter.createdAfter) {
    const from = new Date(filter.createdAfter).getTime();
    if (Number.isFinite(from) && created < from) return false;
  }
  if (filter.createdBefore) {
    const to = new Date(filter.createdBefore).getTime();
    if (Number.isFinite(to) && created > to) return false;
  }
  return true;
}

export function applyUserFilters(
  users: readonly AdminUser[],
  filter: AdminUserFilterState,
): AdminUser[] {
  return users.filter(
    (user) =>
      matchesRole(user, filter) &&
      matchesStatus(user, filter) &&
      matchesTransporter(user, filter) &&
      matchesTag(user, filter) &&
      matchesSearch(user, filter) &&
      matchesCreatedRange(user, filter),
  );
}

export function emptyFilter(): AdminUserFilterState {
  return {
    search: '',
    role: 'all',
    status: 'all',
  };
}

export function hasActiveFilters(filter: AdminUserFilterState): boolean {
  return (
    Boolean(filter.search) ||
    filter.role !== 'all' ||
    filter.status !== 'all' ||
    Boolean(filter.transporter) ||
    Boolean(filter.tag) ||
    Boolean(filter.createdAfter) ||
    Boolean(filter.createdBefore)
  );
}
