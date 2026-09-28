/**
 * Analytics and dashboard statistics types.
 *
 * These types describe the aggregate metrics rendered on the main admin
 * dashboard, including counts, ratios, and time-series data used by charts.
 */

import type { AdminUserRole, AdminUserStatus } from './user.types';

export interface AdminStatsCountByRole {
  boss: number;
  staff: number;
  admin: number;
  super_admin: number;
}

export interface AdminStatsCountByStatus {
  active: number;
  invited: number;
  suspended: number;
  archived: number;
  pending_verification: number;
}

export interface AdminStatsTotals {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  archivedUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  loginsToday: number;
  loginsThisWeek: number;
  loginsThisMonth: number;
}

export interface AdminStatsRatios {
  bossToStaffRatio: number;
  activeRatio: number;
  suspendedRatio: number;
  archivedRatio: number;
  invitedRatio: number;
  averageAccountsPerTransporter: number;
}

export interface AdminStatsSeriesPoint {
  date: string;
  value: number;
  label?: string;
}

export interface AdminStatsSeries {
  key: string;
  title: string;
  color: string;
  unit?: string;
  points: AdminStatsSeriesPoint[];
}

export interface AdminStatsHeatmapCell {
  day: number;
  hour: number;
  value: number;
}

export interface AdminStatsSnapshot {
  generatedAt: string;
  totals: AdminStatsTotals;
  ratios: AdminStatsRatios;
  countsByRole: AdminStatsCountByRole;
  countsByStatus: AdminStatsCountByStatus;
  newUsersSeries: AdminStatsSeries;
  loginActivitySeries: AdminStatsSeries;
  removalsSeries: AdminStatsSeries;
  activityHeatmap: AdminStatsHeatmapCell[];
}

export interface AdminStatsCardModel {
  key: string;
  label: string;
  value: number | string;
  hint?: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: number;
  accent?: 'default' | 'positive' | 'negative' | 'warning';
}

export interface AdminStatsRoleBreakdownEntry {
  role: AdminUserRole;
  count: number;
  percentage: number;
}

export interface AdminStatsStatusBreakdownEntry {
  status: AdminUserStatus;
  count: number;
  percentage: number;
}

export function emptyRoleCounts(): AdminStatsCountByRole {
  return { boss: 0, staff: 0, admin: 0, super_admin: 0 };
}

export function emptyStatusCounts(): AdminStatsCountByStatus {
  return {
    active: 0,
    invited: 0,
    suspended: 0,
    archived: 0,
    pending_verification: 0,
  };
}

export function isPositiveTrend(entry: AdminStatsCardModel): boolean {
  return entry.trend === 'up';
}

export function isNegativeTrend(entry: AdminStatsCardModel): boolean {
  return entry.trend === 'down';
}
