/**
 * Domain types for administrative user records.
 *
 * These types describe the shape of user documents managed exclusively by the
 * admin dashboard. The admin surface is intentionally decoupled from the main
 * application's auth slice so that changes to admin bookkeeping never leak
 * into runtime behaviour of the live product.
 */

export type AdminUserRole = 'boss' | 'staff' | 'admin' | 'super_admin';

export type AdminUserStatus =
  | 'active'
  | 'invited'
  | 'suspended'
  | 'archived'
  | 'pending_verification';

export interface AdminUserAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface AdminUserContact {
  primaryEmail: string;
  secondaryEmail?: string;
  phone?: string;
  smsEnabled: boolean;
  address?: AdminUserAddress;
}

export interface AdminUserAuditMeta {
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: string;
  deletedBy?: string;
}

export interface AdminUserPermissions {
  canManageStaff: boolean;
  canManageBosses: boolean;
  canManageAdmins: boolean;
  canExportData: boolean;
  canViewAuditLog: boolean;
  canAssignTransporters: boolean;
  canConfigureRules: boolean;
  canImpersonate: boolean;
}

export interface AdminUserPreferences {
  timezone: string;
  language: string;
  dashboardDensity: 'compact' | 'cozy' | 'comfortable';
  emailDigestFrequency: 'never' | 'daily' | 'weekly' | 'monthly';
  showTutorials: boolean;
  darkMode: boolean;
}

export interface AdminUser {
  id: string;
  displayName: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  contact: AdminUserContact;
  audit: AdminUserAuditMeta;
  permissions: AdminUserPermissions;
  preferences: AdminUserPreferences;
  transporters: string[];
  tags: string[];
  notes?: string;
}

export interface AdminUserSummary {
  id: string;
  displayName: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  primaryEmail: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AdminUserCounts {
  total: number;
  bosses: number;
  staff: number;
  admins: number;
  superAdmins: number;
  active: number;
  suspended: number;
  invited: number;
  archived: number;
}

export interface AdminUserFilterState {
  search: string;
  role: AdminUserRole | 'all';
  status: AdminUserStatus | 'all';
  createdAfter?: string;
  createdBefore?: string;
  transporter?: string;
  tag?: string;
}

export interface AdminUserFormValues {
  displayName: string;
  role: AdminUserRole;
  primaryEmail: string;
  phone?: string;
  transporters: string[];
  notes?: string;
}

export function isBossRole(role: AdminUserRole): boolean {
  return role === 'boss';
}

export function isStaffRole(role: AdminUserRole): boolean {
  return role === 'staff';
}

export function isAdminRole(role: AdminUserRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function isPrivilegedRole(role: AdminUserRole): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'boss';
}

export function humanReadableRole(role: AdminUserRole): string {
  switch (role) {
    case 'boss':
      return 'Boss';
    case 'staff':
      return 'Staff';
    case 'admin':
      return 'Administrator';
    case 'super_admin':
      return 'Super Administrator';
  }
}

export function humanReadableStatus(status: AdminUserStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'invited':
      return 'Invitation sent';
    case 'suspended':
      return 'Suspended';
    case 'archived':
      return 'Archived';
    case 'pending_verification':
      return 'Pending verification';
  }
}
