/**
 * Selectors for the admin store.
 *
 * Centralised here so component code does not need to remember state shape.
 */

import type { AdminState } from './reducers';

export const selectSession = (state: AdminState) => state.session.session;
export const selectSessionScopes = (state: AdminState) =>
  state.session.session?.scopes ?? [];

export const selectUsers = (state: AdminState) => state.users.users;
export const selectUsersLoading = (state: AdminState) => state.users.loading;
export const selectUsersError = (state: AdminState) => state.users.error;
export const selectUsersFilter = (state: AdminState) => state.users.filter;
export const selectUsersPagination = (state: AdminState) =>
  state.users.pagination;

export const selectStatsSnapshot = (state: AdminState) => state.stats.snapshot;
export const selectStatsLoading = (state: AdminState) => state.stats.loading;
export const selectStatsError = (state: AdminState) => state.stats.error;

export const selectAuditRecords = (state: AdminState) => state.audit.records;
export const selectAuditLoading = (state: AdminState) => state.audit.loading;
export const selectAuditError = (state: AdminState) => state.audit.error;
export const selectAuditFilter = (state: AdminState) => state.audit.filter;
export const selectAuditPagination = (state: AdminState) =>
  state.audit.pagination;

export const selectToasts = (state: AdminState) => state.toast.items;
