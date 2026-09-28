/**
 * Constants used across the admin dashboard.
 *
 * Centralising these values keeps user-visible strings, page sizes, and
 * timing values in one place so future tweaks do not require hunting through
 * component files.
 */

export const ADMIN_PRODUCT_NAME = 'FleetWatch Admin';
export const ADMIN_SUPPORT_EMAIL = 'admin-support@example.com';
export const ADMIN_DEFAULT_ENVIRONMENT: 'development' | 'staging' | 'production' =
  'development';

export const ADMIN_DEFAULT_PAGE_SIZE = 25;
export const ADMIN_PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200];
export const ADMIN_MAX_EXPORT_ROWS = 25_000;
export const ADMIN_AUDIT_RETENTION_DAYS = 365;

export const ADMIN_SEARCH_DEBOUNCE_MS = 250;
export const ADMIN_TOAST_DEFAULT_DURATION_MS = 4_500;
export const ADMIN_SESSION_TTL_MINUTES = 45;
export const ADMIN_STATS_REFRESH_INTERVAL_MS = 60_000;

export const ADMIN_BRAND_PRIMARY = '#4B4EFF';
export const ADMIN_BRAND_ACCENT = '#FF7A45';
export const ADMIN_BRAND_MUTED = '#7B7F8A';
export const ADMIN_BRAND_SURFACE = '#0F1116';
export const ADMIN_BRAND_SURFACE_ALT = '#181B22';
export const ADMIN_BRAND_TEXT = '#EFF1F5';
export const ADMIN_BRAND_TEXT_MUTED = '#9AA0AA';

export const ADMIN_ROLE_COLORS: Record<string, string> = {
  boss: '#FFB020',
  staff: '#39C15A',
  admin: '#4B4EFF',
  super_admin: '#FF3D77',
};

export const ADMIN_STATUS_COLORS: Record<string, string> = {
  active: '#39C15A',
  invited: '#4B9BFF',
  suspended: '#FF3D77',
  archived: '#7B7F8A',
  pending_verification: '#FFB020',
};

export const ADMIN_SEVERITY_COLORS: Record<string, string> = {
  info: '#4B9BFF',
  notice: '#4B4EFF',
  warning: '#FFB020',
  critical: '#FF3D77',
};

export const ADMIN_ROUTES = {
  root: '/admin',
  login: '/admin/login',
  dashboard: '/admin/dashboard',
  users: '/admin/users',
  staff: '/admin/users/staff',
  bosses: '/admin/users/bosses',
  admins: '/admin/users/admins',
  userDetails: '/admin/users/:userId',
  audit: '/admin/audit-log',
  settings: '/admin/settings',
  analytics: '/admin/analytics',
  systemHealth: '/admin/system-health',
} as const;

export const ADMIN_NAV_ICONS = {
  dashboard: 'dashboard',
  users: 'users',
  staff: 'staff',
  bosses: 'bosses',
  admins: 'admins',
  audit: 'audit',
  settings: 'settings',
  analytics: 'analytics',
  systemHealth: 'health',
  logout: 'logout',
} as const;

export const ADMIN_KEYBOARD_SHORTCUTS = {
  openSearch: 'ctrl+k',
  createUser: 'ctrl+shift+n',
  refresh: 'ctrl+r',
  exportCsv: 'ctrl+shift+e',
  openAudit: 'ctrl+shift+a',
  toggleTheme: 'ctrl+shift+t',
} as const;
