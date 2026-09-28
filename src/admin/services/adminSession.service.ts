/**
 * Session service.
 *
 * The admin surface uses a mocked login flow: any email plus a password of
 * at least 8 characters is accepted, and the returned session's role
 * depends on the email prefix.
 */

import { ADMIN_SESSION_TTL_MINUTES } from '../utils/constants';
import { generateSessionId } from '../utils/id';
import { defaultScopesForRole } from '../utils/permissions';
import type { AdminApiResult } from '../types/api.types';
import type { AdminSession } from '../types/admin.types';
import type { AdminUserRole } from '../types/user.types';
import { runRequest } from './httpClient';

export interface AdminLoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

let activeSession: AdminSession | undefined;

function inferRoleFromEmail(email: string): AdminUserRole {
  const local = email.split('@')[0]?.toLowerCase() ?? '';
  if (local.startsWith('super')) return 'super_admin';
  if (local.startsWith('admin')) return 'admin';
  if (local.startsWith('boss')) return 'boss';
  return 'admin';
}

function displayNameFromEmail(email: string): string {
  const [local] = email.split('@');
  if (!local) return 'Admin';
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
    .join(' ') || 'Admin';
}

export function login(
  credentials: AdminLoginCredentials,
): Promise<AdminApiResult<AdminSession>> {
  return runRequest(() => {
    if (!credentials.email || !credentials.email.includes('@')) {
      throw new Error('Enter a valid email address.');
    }
    if (!credentials.password || credentials.password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }
    const role = inferRoleFromEmail(credentials.email);
    const now = new Date();
    const expires = new Date(now.getTime() + ADMIN_SESSION_TTL_MINUTES * 60_000);
    activeSession = {
      id: generateSessionId(),
      actorId: `usr_${Math.random().toString(36).slice(2, 12)}`,
      role,
      displayName: displayNameFromEmail(credentials.email),
      startedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      scopes: defaultScopesForRole(role),
      mfaSatisfied: Boolean(credentials.mfaCode),
    };
    return { ...activeSession };
  });
}

export function logout(): Promise<AdminApiResult<{ ended: true }>> {
  return runRequest(() => {
    activeSession = undefined;
    return { ended: true } as const;
  });
}

export function currentSession(): Promise<AdminApiResult<AdminSession | undefined>> {
  return runRequest(() => (activeSession ? { ...activeSession } : undefined));
}

export function extendSession(): Promise<AdminApiResult<AdminSession | undefined>> {
  return runRequest(() => {
    if (!activeSession) return undefined;
    const now = new Date();
    activeSession = {
      ...activeSession,
      expiresAt: new Date(now.getTime() + ADMIN_SESSION_TTL_MINUTES * 60_000).toISOString(),
    };
    return { ...activeSession };
  });
}
