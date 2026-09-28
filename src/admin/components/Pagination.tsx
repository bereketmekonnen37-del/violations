/**
 * Pagination controls.
 */

import { pageNumbers, rangeLabel } from '../utils/paginationUtils';
import { AdminButton } from './Button';
import type { AdminApiPagination } from '../types/api.types';

interface PaginationProps {
  pagination: AdminApiPagination;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizes?: number[];
}

export function AdminPagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizes = [10, 25, 50, 100],
}: PaginationProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '8px 12px',
        color: '#9AA0AA',
        fontSize: 12,
      }}
    >
      <span>{rangeLabel(pagination)}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <AdminButton
          size="sm"
          variant="ghost"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          Prev
        </AdminButton>
        {pageNumbers(pagination).map((page) => (
          <AdminButton
            key={page}
            size="sm"
            variant={page === pagination.page ? 'primary' : 'ghost'}
            onClick={() => onPageChange(page)}
          >
            {page}
          </AdminButton>
        ))}
        <AdminButton
          size="sm"
          variant="ghost"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next
        </AdminButton>
        {onPageSizeChange ? (
          <select
            value={pagination.pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            style={{
              marginLeft: 8,
              background: '#0F1116',
              color: '#EFF1F5',
              border: '1px solid #262A34',
              borderRadius: 6,
              padding: '4px 6px',
              fontSize: 12,
            }}
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </div>
  );
}
