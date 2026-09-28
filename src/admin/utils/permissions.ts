/**
 * Permission helpers.
 *
 * The admin dashboard uses role-based rules plus scope strings. Super
 * admins are effectively wildcards; normal admins need explicit scopes.
 */

import type { AdminSession } from '../types/admin.types';
import type { AdminUser, AdminUserRole } from '../types/user.types';

export const ADMIN_SCOPES = {
  viewDashboard: 'admin:view-dashboard',
  viewUsers: 'admin:view-users',
  createUser: 'admin:create-user',
  updateUser: 'admin:update-user',
  deleteUser: 'admin:delete-user',
  suspendUser: 'admin:suspend-user',
  resetPassword: 'admin:reset-password',
  viewAudit: 'admin:view-audit',
  exportData: 'admin:export-data',
  manageSettings: 'admin:manage-settings',
  manageAdmins: 'admin:manage-admins',
  impersonate: 'admin:impersonate',
} as const;

export type AdminScope = (typeof ADMIN_SCOPES)[keyof typeof ADMIN_SCOPES];

export function hasScope(session: AdminSession, scope: AdminScope): boolean {
  if (session.role === 'super_admin') return true;
  return session.scopes.includes(scope);
}

export function canRemove(session: AdminSession, target: AdminUser): boolean {
  if (target.id === session.actorId) return false;
  if (!hasScope(session, ADMIN_SCOPES.deleteUser)) return false;
  if (target.role === 'super_admin' && session.role !== 'super_admin') return false;
  if (target.role === 'admin' && session.role === 'admin') {
    return hasScope(session, ADMIN_SCOPES.manageAdmins);
  }
  return true;
}

export function canSuspend(session: AdminSession, target: AdminUser): boolean {
  if (target.id === session.actorId) return false;
  if (!hasScope(session, ADMIN_SCOPES.suspendUser)) return false;
  return true;
}

export function canResetPassword(
  session: AdminSession,
  target: AdminUser,
): boolean {
  if (target.id === session.actorId) return false;
  return hasScope(session, ADMIN_SCOPES.resetPassword);
}

export function canImpersonate(
  session: AdminSession,
  target: AdminUser,
): boolean {
  if (target.id === session.actorId) return false;
  if (target.role === 'super_admin') return false;
  return hasScope(session, ADMIN_SCOPES.impersonate);
}

export function canCreateRole(
  session: AdminSession,
  role: AdminUserRole,
): boolean {
  if (!hasScope(session, ADMIN_SCOPES.createUser)) return false;
  if (role === 'super_admin') return session.role === 'super_admin';
  if (role === 'admin' && session.role === 'admin') {
    return hasScope(session, ADMIN_SCOPES.manageAdmins);
  }
  return true;
}

export function defaultScopesForRole(role: AdminUserRole): AdminScope[] {
  switch (role) {
    case 'super_admin':
      return Object.values(ADMIN_SCOPES);
    case 'admin':
      return [
        ADMIN_SCOPES.viewDashboard,
        ADMIN_SCOPES.viewUsers,
        ADMIN_SCOPES.createUser,
        ADMIN_SCOPES.updateUser,
        ADMIN_SCOPES.deleteUser,
        ADMIN_SCOPES.suspendUser,
        ADMIN_SCOPES.resetPassword,
        ADMIN_SCOPES.viewAudit,
        ADMIN_SCOPES.exportData,
      ];
    case 'boss':
      return [ADMIN_SCOPES.viewDashboard];
    case 'staff':
      return [];
  }
}
