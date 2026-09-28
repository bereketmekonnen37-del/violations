/**
 * useAdminAudit
 *
 * Loads audit records from the mock service in response to filter/page
 * changes.
 */

import { useCallback, useEffect } from 'react';
import { listAuditRecords } from '../services/adminAudit.service';
import type { AdminAuditFilterState } from '../types/audit.types';
import type { AdminAction } from '../store/actions';
import { useAdminDispatch, useAdminSelector } from '../store/context';
import {
  selectAuditError,
  selectAuditFilter,
  selectAuditLoading,
  selectAuditPagination,
  selectAuditRecords,
} from '../store/selectors';

interface UseAdminAuditOptions {
  page: number;
  pageSize: number;
}

export function useAdminAudit(options: UseAdminAuditOptions) {
  const dispatch = useAdminDispatch();
  const records = useAdminSelector(selectAuditRecords);
  const loading = useAdminSelector(selectAuditLoading);
  const error = useAdminSelector(selectAuditError);
  const filter = useAdminSelector(selectAuditFilter);
  const pagination = useAdminSelector(selectAuditPagination);

  const refresh = useCallback(async () => {
    const loadingAction: AdminAction = { type: 'audit/loading' };
    dispatch(loadingAction);
    const result = await listAuditRecords({
      filter,
      page: options.page,
      pageSize: options.pageSize,
    });
    if (result.status === 'failure') {
      const errorAction: AdminAction = {
        type: 'audit/error',
        message: result.error.message,
      };
      dispatch(errorAction);
      return;
    }
    const loadedAction: AdminAction = {
      type: 'audit/loaded',
      records: result.data.records,
      pagination: {
        page: result.data.page,
        pageSize: result.data.pageSize,
        totalPages: result.data.totalPages,
        totalRecords: result.data.totalRecords,
      },
    };
    dispatch(loadedAction);
  }, [dispatch, filter, options.page, options.pageSize]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setFilter = useCallback(
    (patch: Partial<AdminAuditFilterState>) => {
      const action: AdminAction = { type: 'audit/filter', filter: patch };
      dispatch(action);
    },
    [dispatch],
  );

  return { records, loading, error, filter, pagination, refresh, setFilter };
}
