/**
 * useAdminPagination
 *
 * Encapsulates page-state for a specific table so pages don't have to
 * repeat the same useState pair everywhere.
 */

import { useCallback, useState } from 'react';
import { ADMIN_DEFAULT_PAGE_SIZE } from '../utils/constants';

export interface UseAdminPaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

export function useAdminPagination(options: UseAdminPaginationOptions = {}) {
  const [page, setPage] = useState(options.initialPage ?? 1);
  const [pageSize, setPageSize] = useState(
    options.initialPageSize ?? ADMIN_DEFAULT_PAGE_SIZE,
  );

  const goToPage = useCallback((next: number) => {
    setPage((prev) => Math.max(1, next || prev));
  }, []);

  const changePageSize = useCallback((next: number) => {
    setPageSize(Math.max(1, next));
    setPage(1);
  }, []);

  const reset = useCallback(() => {
    setPage(1);
    setPageSize(options.initialPageSize ?? ADMIN_DEFAULT_PAGE_SIZE);
  }, [options.initialPageSize]);

  return { page, pageSize, setPage: goToPage, setPageSize: changePageSize, reset };
}
