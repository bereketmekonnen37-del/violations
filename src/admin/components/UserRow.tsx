/**
 * UserRow
 *
 * Renders one user record inside a table cell layout. Kept as a component
 * so it can be reused by the user details page.
 */

import { formatDate, formatRelative } from '../utils/dateUtils';
import type { AdminUser } from '../types/user.types';
import { humanReadableRole, humanReadableStatus } from '../types/user.types';
import { Avatar } from './Avatar';
import { AdminBadge } from './Badge';

interface UserRowProps {
  user: AdminUser;
}

function toneForRole(role: AdminUser['role']): 'info' | 'success' | 'warning' | 'danger' | 'neutral' {
  switch (role) {
    case 'boss':
      return 'warning';
    case 'staff':
      return 'success';
    case 'admin':
      return 'info';
    case 'super_admin':
      return 'danger';
  }
}

function toneForStatus(status: AdminUser['status']) {
  switch (status) {
    case 'active':
      return 'success' as const;
    case 'invited':
      return 'info' as const;
    case 'suspended':
      return 'danger' as const;
    case 'archived':
      return 'neutral' as const;
    case 'pending_verification':
      return 'warning' as const;
  }
}

export function UserRow({ user }: UserRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Avatar name={user.displayName} />
      <div>
        <div style={{ color: '#EFF1F5', fontWeight: 600 }}>{user.displayName}</div>
        <div style={{ color: '#7B7F8A', fontSize: 11 }}>{user.contact.primaryEmail}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <AdminBadge tone={toneForRole(user.role)}>{humanReadableRole(user.role)}</AdminBadge>
          <AdminBadge tone={toneForStatus(user.status)}>{humanReadableStatus(user.status)}</AdminBadge>
        </div>
      </div>
      <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: 11, color: '#7B7F8A' }}>
        <div>Created {formatDate(user.audit.createdAt)}</div>
        {user.audit.lastLoginAt ? (
          <div>Last login {formatRelative(user.audit.lastLoginAt)}</div>
        ) : (
          <div>Has not signed in</div>
        )}
      </div>
    </div>
  );
}
