/**
 * Reducers for the admin store.
 *
 * Each slice reducer maintains its own portion of the tree and returns the
 * previous reference when no change occurs so that memoised selectors do
 * not re-run unnecessarily.
 */

import { defaultPagination } from '../types/api.types';
import { emptyFilter } from '../utils/filterUtils';
import type { AdminSession, AdminToast } from '../types/admin.types';
import type {
  AdminAuditFilterState,
  AdminAuditRecord,
} from '../types/audit.types';
import type { AdminApiPagination } from '../types/api.types';
import type { AdminStatsSnapshot } from '../types/stats.types';
import type { AdminUser, AdminUserFilterState } from '../types/user.types';
import type { AdminAction } from './actions';

export interface SessionSlice {
  session?: AdminSession;
}

export interface UsersSlice {
  loading: boolean;
  error?: string;
  users: AdminUser[];
  pagination: AdminApiPagination;
  filter: AdminUserFilterState;
}

export interface StatsSlice {
  loading: boolean;
  error?: string;
  snapshot?: AdminStatsSnapshot;
}

export interface AuditSlice {
  loading: boolean;
  error?: string;
  records: AdminAuditRecord[];
  pagination: AdminApiPagination;
  filter: AdminAuditFilterState;
}

export interface ToastSlice {
  items: AdminToast[];
}

export interface AdminState {
  session: SessionSlice;
  users: UsersSlice;
  stats: StatsSlice;
  audit: AuditSlice;
  toast: ToastSlice;
}

export function initialUsers(): UsersSlice {
  return {
    loading: false,
    users: [],
    pagination: defaultPagination(),
    filter: emptyFilter(),
  };
}

export function initialAudit(): AuditSlice {
  return {
    loading: false,
    records: [],
    pagination: defaultPagination(),
    filter: { search: '', action: 'all', severity: 'all' },
  };
}

export function sessionReducer(
  state: SessionSlice = { session: undefined },
  action: AdminAction,
): SessionSlice {
  switch (action.type) {
    case 'session/set':
      return { session: action.session };
    case 'session/clear':
      return { session: undefined };
    default:
      return state;
  }
}

export function usersReducer(
  state: UsersSlice = initialUsers(),
  action: AdminAction,
): UsersSlice {
  switch (action.type) {
    case 'users/loading':
      return { ...state, loading: true, error: undefined };
    case 'users/loaded':
      return {
        ...state,
        loading: false,
        users: action.users,
        pagination: action.pagination,
        error: undefined,
      };
    case 'users/error':
      return { ...state, loading: false, error: action.message };
    case 'users/filter':
      return { ...state, filter: { ...state.filter, ...action.filter } };
    case 'users/replace':
      return {
        ...state,
        users: state.users.map((user) =>
          user.id === action.user.id ? action.user : user,
        ),
      };
    case 'users/append':
      return { ...state, users: [action.user, ...state.users] };
    case 'users/remove':
      return {
        ...state,
        users: state.users.filter((user) => user.id !== action.id),
        pagination: {
          ...state.pagination,
          totalRecords: Math.max(0, state.pagination.totalRecords - 1),
        },
      };
    default:
      return state;
  }
}

export function statsReducer(
  state: StatsSlice = { loading: false },
  action: AdminAction,
): StatsSlice {
  switch (action.type) {
    case 'stats/loading':
      return { ...state, loading: true, error: undefined };
    case 'stats/loaded':
      return { loading: false, snapshot: action.snapshot };
    case 'stats/error':
      return { ...state, loading: false, error: action.message };
    default:
      return state;
  }
}

export function auditReducer(
  state: AuditSlice = initialAudit(),
  action: AdminAction,
): AuditSlice {
  switch (action.type) {
    case 'audit/loading':
      return { ...state, loading: true, error: undefined };
    case 'audit/loaded':
      return {
        ...state,
        loading: false,
        records: action.records,
        pagination: action.pagination,
        error: undefined,
      };
    case 'audit/error':
      return { ...state, loading: false, error: action.message };
    case 'audit/filter':
      return { ...state, filter: { ...state.filter, ...action.filter } };
    default:
      return state;
  }
}

export function toastReducer(
  state: ToastSlice = { items: [] },
  action: AdminAction,
): ToastSlice {
  switch (action.type) {
    case 'toast/push':
      return { items: [action.toast, ...state.items].slice(0, 6) };
    case 'toast/dismiss':
      return { items: state.items.filter((item) => item.id !== action.id) };
    default:
      return state;
  }
}
