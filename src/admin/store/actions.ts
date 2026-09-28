/**
 * Action definitions for the admin store.
 *
 * Uses a discriminated union so reducers can exhaustively narrow.
 */

import type { AdminSession, AdminToast } from '../types/admin.types';
import type {
  AdminAuditFilterState,
  AdminAuditRecord,
} from '../types/audit.types';
import type { AdminStatsSnapshot } from '../types/stats.types';
import type { AdminUser, AdminUserFilterState } from '../types/user.types';
import type { AdminApiPagination } from '../types/api.types';

export type AdminAction =
  | { type: 'session/set'; session: AdminSession | undefined }
  | { type: 'session/clear' }
  | { type: 'users/loading' }
  | {
      type: 'users/loaded';
      users: AdminUser[];
      pagination: AdminApiPagination;
    }
  | { type: 'users/error'; message: string }
  | { type: 'users/filter'; filter: Partial<AdminUserFilterState> }
  | { type: 'users/replace'; user: AdminUser }
  | { type: 'users/append'; user: AdminUser }
  | { type: 'users/remove'; id: string }
  | { type: 'stats/loading' }
  | { type: 'stats/loaded'; snapshot: AdminStatsSnapshot }
  | { type: 'stats/error'; message: string }
  | { type: 'audit/loading' }
  | {
      type: 'audit/loaded';
      records: AdminAuditRecord[];
      pagination: AdminApiPagination;
    }
  | { type: 'audit/error'; message: string }
  | { type: 'audit/filter'; filter: Partial<AdminAuditFilterState> }
  | { type: 'toast/push'; toast: AdminToast }
  | { type: 'toast/dismiss'; id: string };
