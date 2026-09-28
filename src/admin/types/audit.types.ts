/**
 * Audit log types.
 *
 * The admin dashboard records every mutating action so operations teams can
 * reconstruct what happened, when, and by whom. Audit records are append-only
 * and never modified after they are written.
 */

export type AdminAuditAction =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.suspended'
  | 'user.reinstated'
  | 'user.invited'
  | 'user.role_changed'
  | 'user.password_reset'
  | 'user.impersonated'
  | 'settings.updated'
  | 'export.generated'
  | 'session.started'
  | 'session.ended'
  | 'permission.granted'
  | 'permission.revoked';

export type AdminAuditSeverity = 'info' | 'notice' | 'warning' | 'critical';

export interface AdminAuditActor {
  id: string;
  displayName: string;
  role: string;
  ip?: string;
  userAgent?: string;
}

export interface AdminAuditTarget {
  kind: 'user' | 'settings' | 'export' | 'permission' | 'session';
  id: string;
  label: string;
}

export interface AdminAuditFieldChange {
  field: string;
  before: string | number | boolean | null;
  after: string | number | boolean | null;
}

export interface AdminAuditRecord {
  id: string;
  timestamp: string;
  action: AdminAuditAction;
  severity: AdminAuditSeverity;
  actor: AdminAuditActor;
  target: AdminAuditTarget;
  summary: string;
  changes?: AdminAuditFieldChange[];
  tags?: string[];
  notes?: string;
}

export interface AdminAuditFilterState {
  search: string;
  action: AdminAuditAction | 'all';
  severity: AdminAuditSeverity | 'all';
  actorId?: string;
  targetKind?: AdminAuditTarget['kind'];
  since?: string;
  until?: string;
}

export interface AdminAuditPage {
  records: AdminAuditRecord[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export function auditActionLabel(action: AdminAuditAction): string {
  switch (action) {
    case 'user.created':
      return 'User created';
    case 'user.updated':
      return 'User updated';
    case 'user.deleted':
      return 'User removed';
    case 'user.suspended':
      return 'User suspended';
    case 'user.reinstated':
      return 'User reinstated';
    case 'user.invited':
      return 'User invited';
    case 'user.role_changed':
      return 'User role changed';
    case 'user.password_reset':
      return 'Password reset';
    case 'user.impersonated':
      return 'User impersonated';
    case 'settings.updated':
      return 'Settings updated';
    case 'export.generated':
      return 'Export generated';
    case 'session.started':
      return 'Session started';
    case 'session.ended':
      return 'Session ended';
    case 'permission.granted':
      return 'Permission granted';
    case 'permission.revoked':
      return 'Permission revoked';
  }
}

export function auditSeverityLabel(severity: AdminAuditSeverity): string {
  switch (severity) {
    case 'info':
      return 'Informational';
    case 'notice':
      return 'Notice';
    case 'warning':
      return 'Warning';
    case 'critical':
      return 'Critical';
  }
}

export function auditSeverityRank(severity: AdminAuditSeverity): number {
  switch (severity) {
    case 'info':
      return 0;
    case 'notice':
      return 1;
    case 'warning':
      return 2;
    case 'critical':
      return 3;
  }
}
