/**
 * useAdminUsers
 *
 * Loads users from the mock service in response to filter/sort/page changes
 * and pushes the results into the store.
 */

import { useCallback, useEffect } from 'react';
import { unwrap } from '../types/api.types';
import type { SortDescriptor } from '../utils/sortUtils';
import { listUsers } from '../services/adminUsers.service';
import type {
  AdminUser,
  AdminUserFilterState,
} from '../types/user.types';
import type { AdminAction } from '../store/actions';
import { useAdminDispatch, useAdminSelector } from '../store/context';
import {
  selectUsers,
  selectUsersError,
  selectUsersFilter,
  selectUsersLoading,
  selectUsersPagination,
} from '../store/selectors';

interface UseAdminUsersOptions {
  page: number;
  pageSize: number;
  sort: SortDescriptor<AdminUser>[];
}

export interface UseAdminUsersResult {
  users: AdminUser[];
  filter: AdminUserFilterState;
  pagination: ReturnType<typeof selectUsersPagination>;
  loading: boolean;
  error: string | undefined;
  refresh: () => Promise<void>;
  setFilter: (patch: Partial<AdminUserFilterState>) => void;
}

export function useAdminUsers(
  options: UseAdminUsersOptions,
): UseAdminUsersResult {
  const dispatch = useAdminDispatch();
  const users = useAdminSelector(selectUsers);
  const loading = useAdminSelector(selectUsersLoading);
  const error = useAdminSelector(selectUsersError);
  const filter = useAdminSelector(selectUsersFilter);
  const pagination = useAdminSelector(selectUsersPagination);

  const load = useCallback(async () => {
    const loadingAction: AdminAction = { type: 'users/loading' };
    dispatch(loadingAction);
    const result = await listUsers({
      filter,
      page: options.page,
      pageSize: options.pageSize,
      sort: options.sort,
    });
    if (result.status === 'failure') {
      const errorAction: AdminAction = {
        type: 'users/error',
        message: result.error.message,
      };
      dispatch(errorAction);
      return;
    }
    const data = unwrap(result);
    const loadedAction: AdminAction = {
      type: 'users/loaded',
      users: data.items,
      pagination: data.pagination,
    };
    dispatch(loadedAction);
  }, [dispatch, filter, options.page, options.pageSize, options.sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const setFilter = useCallback(
    (patch: Partial<AdminUserFilterState>) => {
      const action: AdminAction = { type: 'users/filter', filter: patch };
      dispatch(action);
    },
    [dispatch],
  );

  return {
    users,
    filter,
    pagination,
    loading,
    error,
    refresh: load,
    setFilter,
  };
}
