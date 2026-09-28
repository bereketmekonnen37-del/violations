/**
 * Admin session and configuration types.
 *
 * These types describe the shape of an authenticated admin session, feature
 * flags rendered inside the admin UI, and configuration read from the
 * lightweight in-memory config store used by the module.
 */

import type { AdminUserRole } from './user.types';

export interface AdminSession {
  id: string;
  actorId: string;
  role: AdminUserRole;
  displayName: string;
  startedAt: string;
  expiresAt: string;
  scopes: string[];
  mfaSatisfied: boolean;
  ip?: string;
  userAgent?: string;
}

export interface AdminFeatureFlag {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  rolloutPercent: number;
  updatedAt: string;
}

export interface AdminConfiguration {
  environment: 'development' | 'staging' | 'production';
  release: string;
  supportEmail: string;
  featureFlags: AdminFeatureFlag[];
  defaultPageSize: number;
  auditRetentionDays: number;
  branding: {
    primaryColor: string;
    accentColor: string;
    logoUrl?: string;
    productName: string;
  };
}

export interface AdminBreadcrumb {
  label: string;
  href?: string;
}

export interface AdminNavItem {
  key: string;
  label: string;
  href: string;
  icon: string;
  requiredScope?: string;
  badge?: number;
  children?: AdminNavItem[];
}

export interface AdminNotification {
  id: string;
  createdAt: string;
  read: boolean;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body?: string;
  href?: string;
}

export interface AdminToast {
  id: string;
  createdAt: string;
  kind: 'info' | 'success' | 'error' | 'warning';
  title: string;
  message?: string;
  autoDismissMs?: number;
}

export interface AdminModalState<T = unknown> {
  key: string;
  open: boolean;
  payload?: T;
}

export interface AdminMenuOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
  description?: string;
}

export function emptySession(): AdminSession {
  return {
    id: '',
    actorId: '',
    role: 'admin',
    displayName: '',
    startedAt: '',
    expiresAt: '',
    scopes: [],
    mfaSatisfied: false,
  };
}

export function sessionIsExpired(
  session: AdminSession,
  now: Date = new Date(),
): boolean {
  if (!session.expiresAt) return false;
  return new Date(session.expiresAt).getTime() <= now.getTime();
}

export function scopeSatisfies(
  session: AdminSession,
  requiredScope: string,
): boolean {
  if (!requiredScope) return true;
  if (session.role === 'super_admin') return true;
  return session.scopes.includes(requiredScope);
}
