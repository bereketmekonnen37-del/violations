/**
 * RoleFilterBar
 *
 * Chip-based role/status filter used above the user tables.
 */

import type { AdminUserFilterState, AdminUserRole, AdminUserStatus } from '../types/user.types';
import { humanReadableRole, humanReadableStatus } from '../types/user.types';

interface RoleFilterBarProps {
  filter: AdminUserFilterState;
  onChange: (patch: Partial<AdminUserFilterState>) => void;
}

const ROLES: (AdminUserRole | 'all')[] = ['all', 'boss', 'staff', 'admin', 'super_admin'];
const STATUSES: (AdminUserStatus | 'all')[] = [
  'all',
  'active',
  'invited',
  'suspended',
  'archived',
  'pending_verification',
];

export function RoleFilterBar({ filter, onChange }: RoleFilterBarProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {ROLES.map((role) => (
          <button
            key={role}
            onClick={() => onChange({ role: role as AdminUserRole | 'all' })}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 12,
              border: '1px solid #262A34',
              background: filter.role === role ? '#4B4EFF' : '#181B22',
              color: filter.role === role ? '#fff' : '#EFF1F5',
              cursor: 'pointer',
            }}
          >
            {role === 'all' ? 'All roles' : humanReadableRole(role)}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => onChange({ status: status as AdminUserStatus | 'all' })}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 11,
              border: '1px solid #262A34',
              background: filter.status === status ? '#39C15A' : '#181B22',
              color: filter.status === status ? '#0F1116' : '#9AA0AA',
              cursor: 'pointer',
            }}
          >
            {status === 'all' ? 'Any status' : humanReadableStatus(status)}
          </button>
        ))}
      </div>
    </div>
  );
}
