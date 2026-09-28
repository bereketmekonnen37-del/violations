/**
 * Role-focused convenience helpers.
 *
 * Combines role labels, counting, and defaults so that pages and cards
 * don't need to duplicate switch statements everywhere.
 */

import type { AdminUser, AdminUserRole, AdminUserStatus } from '../types/user.types';
import { emptyRoleCounts, emptyStatusCounts } from '../types/stats.types';
import type {
  AdminStatsCountByRole,
  AdminStatsCountByStatus,
  AdminStatsRoleBreakdownEntry,
  AdminStatsStatusBreakdownEntry,
} from '../types/stats.types';

export function countByRole(users: readonly AdminUser[]): AdminStatsCountByRole {
  const counts = emptyRoleCounts();
  for (const user of users) counts[user.role] += 1;
  return counts;
}

export function countByStatus(
  users: readonly AdminUser[],
): AdminStatsCountByStatus {
  const counts = emptyStatusCounts();
  for (const user of users) counts[user.status] += 1;
  return counts;
}

export function bossCount(users: readonly AdminUser[]): number {
  return users.reduce((sum, user) => (user.role === 'boss' ? sum + 1 : sum), 0);
}

export function staffCount(users: readonly AdminUser[]): number {
  return users.reduce((sum, user) => (user.role === 'staff' ? sum + 1 : sum), 0);
}

export function adminCount(users: readonly AdminUser[]): number {
  return users.reduce(
    (sum, user) =>
      user.role === 'admin' || user.role === 'super_admin' ? sum + 1 : sum,
    0,
  );
}

export function activeCount(users: readonly AdminUser[]): number {
  return users.reduce(
    (sum, user) => (user.status === 'active' ? sum + 1 : sum),
    0,
  );
}

export function roleBreakdown(
  users: readonly AdminUser[],
): AdminStatsRoleBreakdownEntry[] {
  const total = users.length;
  const counts = countByRole(users);
  const entries: AdminStatsRoleBreakdownEntry[] = [];
  const roles: AdminUserRole[] = ['boss', 'staff', 'admin', 'super_admin'];
  for (const role of roles) {
    const count = counts[role];
    entries.push({
      role,
      count,
      percentage: total === 0 ? 0 : count / total,
    });
  }
  return entries;
}

export function statusBreakdown(
  users: readonly AdminUser[],
): AdminStatsStatusBreakdownEntry[] {
  const total = users.length;
  const counts = countByStatus(users);
  const statuses: AdminUserStatus[] = [
    'active',
    'invited',
    'suspended',
    'archived',
    'pending_verification',
  ];
  return statuses.map((status) => ({
    status,
    count: counts[status],
    percentage: total === 0 ? 0 : counts[status] / total,
  }));
}

export function defaultDisplayNameFor(role: AdminUserRole, index: number): string {
  const labelMap: Record<AdminUserRole, string> = {
    boss: 'Boss',
    staff: 'Staff Member',
    admin: 'Administrator',
    super_admin: 'Super Administrator',
  };
  return `${labelMap[role]} ${index}`;
}
