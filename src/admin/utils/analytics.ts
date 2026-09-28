/**
 * Analytics computations.
 *
 * These helpers derive dashboard aggregates from the raw user collection.
 * They are pure functions with no dependencies on React or the service
 * layer so that both the store and offline exports can call them.
 */

import { addDays, startOfDay, toIsoDay } from './dateUtils';
import { activeCount, bossCount, countByRole, countByStatus, staffCount } from './roleUtils';
import type { AdminUser } from '../types/user.types';
import type {
  AdminStatsCardModel,
  AdminStatsHeatmapCell,
  AdminStatsSeries,
  AdminStatsSnapshot,
  AdminStatsTotals,
} from '../types/stats.types';

function safeDivide(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

export function computeTotals(users: readonly AdminUser[]): AdminStatsTotals {
  const now = new Date();
  const weekAgo = addDays(now, -7);
  const monthAgo = addDays(now, -30);
  let newUsersThisWeek = 0;
  let newUsersThisMonth = 0;
  let loginsToday = 0;
  let loginsThisWeek = 0;
  let loginsThisMonth = 0;

  for (const user of users) {
    const createdAt = new Date(user.audit.createdAt).getTime();
    if (createdAt >= weekAgo.getTime()) newUsersThisWeek += 1;
    if (createdAt >= monthAgo.getTime()) newUsersThisMonth += 1;
    if (user.audit.lastLoginAt) {
      const lastLogin = new Date(user.audit.lastLoginAt).getTime();
      if (lastLogin >= startOfDay(now).getTime()) loginsToday += 1;
      if (lastLogin >= weekAgo.getTime()) loginsThisWeek += 1;
      if (lastLogin >= monthAgo.getTime()) loginsThisMonth += 1;
    }
  }
  const statusCounts = countByStatus(users);
  return {
    totalUsers: users.length,
    activeUsers: statusCounts.active,
    suspendedUsers: statusCounts.suspended,
    archivedUsers: statusCounts.archived,
    newUsersThisWeek,
    newUsersThisMonth,
    loginsToday,
    loginsThisWeek,
    loginsThisMonth,
  };
}

export function computeRatios(users: readonly AdminUser[]) {
  const total = users.length;
  const bosses = bossCount(users);
  const staff = staffCount(users);
  const active = activeCount(users);
  const status = countByStatus(users);
  const transporterSet = new Set<string>();
  for (const user of users) for (const t of user.transporters) transporterSet.add(t);
  return {
    bossToStaffRatio: safeDivide(bosses, staff),
    activeRatio: safeDivide(active, total),
    suspendedRatio: safeDivide(status.suspended, total),
    archivedRatio: safeDivide(status.archived, total),
    invitedRatio: safeDivide(status.invited, total),
    averageAccountsPerTransporter: safeDivide(total, transporterSet.size || 1),
  };
}

export function computeNewUsersSeries(
  users: readonly AdminUser[],
  days = 30,
): AdminStatsSeries {
  const now = new Date();
  const buckets: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i -= 1) {
    buckets[toIsoDay(addDays(now, -i))] = 0;
  }
  for (const user of users) {
    const day = toIsoDay(user.audit.createdAt);
    if (day in buckets) buckets[day] += 1;
  }
  return {
    key: 'new-users',
    title: 'New users per day',
    color: '#4B4EFF',
    points: Object.entries(buckets).map(([date, value]) => ({ date, value })),
  };
}

export function computeLoginActivitySeries(
  users: readonly AdminUser[],
  days = 30,
): AdminStatsSeries {
  const now = new Date();
  const buckets: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i -= 1) {
    buckets[toIsoDay(addDays(now, -i))] = 0;
  }
  for (const user of users) {
    if (!user.audit.lastLoginAt) continue;
    const day = toIsoDay(user.audit.lastLoginAt);
    if (day in buckets) buckets[day] += 1;
  }
  return {
    key: 'login-activity',
    title: 'Logins per day',
    color: '#39C15A',
    points: Object.entries(buckets).map(([date, value]) => ({ date, value })),
  };
}

export function computeRemovalsSeries(
  users: readonly AdminUser[],
  days = 30,
): AdminStatsSeries {
  const now = new Date();
  const buckets: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i -= 1) {
    buckets[toIsoDay(addDays(now, -i))] = 0;
  }
  for (const user of users) {
    if (!user.audit.deletedAt) continue;
    const day = toIsoDay(user.audit.deletedAt);
    if (day in buckets) buckets[day] += 1;
  }
  return {
    key: 'removals',
    title: 'Removals per day',
    color: '#FF3D77',
    points: Object.entries(buckets).map(([date, value]) => ({ date, value })),
  };
}

export function computeActivityHeatmap(
  users: readonly AdminUser[],
): AdminStatsHeatmapCell[] {
  const cells: AdminStatsHeatmapCell[] = [];
  for (let day = 0; day < 7; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      cells.push({ day, hour, value: 0 });
    }
  }
  for (const user of users) {
    if (!user.audit.lastLoginAt) continue;
    const ts = new Date(user.audit.lastLoginAt);
    const day = ts.getDay();
    const hour = ts.getHours();
    const cell = cells.find((entry) => entry.day === day && entry.hour === hour);
    if (cell) cell.value += 1;
  }
  return cells;
}

export function computeSnapshot(users: readonly AdminUser[]): AdminStatsSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    totals: computeTotals(users),
    ratios: computeRatios(users),
    countsByRole: countByRole(users),
    countsByStatus: countByStatus(users),
    newUsersSeries: computeNewUsersSeries(users),
    loginActivitySeries: computeLoginActivitySeries(users),
    removalsSeries: computeRemovalsSeries(users),
    activityHeatmap: computeActivityHeatmap(users),
  };
}

export function toCardModels(snapshot: AdminStatsSnapshot): AdminStatsCardModel[] {
  const cards: AdminStatsCardModel[] = [];
  cards.push({
    key: 'total-users',
    label: 'Total users',
    value: snapshot.totals.totalUsers,
  });
  cards.push({
    key: 'bosses',
    label: 'Boss accounts',
    value: snapshot.countsByRole.boss,
  });
  cards.push({
    key: 'staff',
    label: 'Staff accounts',
    value: snapshot.countsByRole.staff,
  });
  cards.push({
    key: 'active',
    label: 'Active users',
    value: snapshot.totals.activeUsers,
    accent: 'positive',
  });
  cards.push({
    key: 'suspended',
    label: 'Suspended',
    value: snapshot.totals.suspendedUsers,
    accent: 'warning',
  });
  cards.push({
    key: 'new-week',
    label: 'New this week',
    value: snapshot.totals.newUsersThisWeek,
    accent: 'positive',
  });
  cards.push({
    key: 'new-month',
    label: 'New this month',
    value: snapshot.totals.newUsersThisMonth,
  });
  cards.push({
    key: 'logins-today',
    label: 'Logins today',
    value: snapshot.totals.loginsToday,
  });
  return cards;
}
