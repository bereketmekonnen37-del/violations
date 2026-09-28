/**
 * Simple admin table.
 *
 * Renders rows with configurable columns and click handlers. Sort direction
 * is delegated to the caller.
 */

import type { CSSProperties, ReactNode } from 'react';
import type { SortDescriptor } from '../utils/sortUtils';

export interface AdminTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  sortKey?: keyof T | ((row: T) => unknown);
  align?: 'left' | 'center' | 'right';
  width?: number | string;
}

interface AdminTableProps<T> {
  columns: AdminTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  sort?: SortDescriptor<T>;
  onSortChange?: (next: keyof T | ((row: T) => unknown)) => void;
  loading?: boolean;
}

export function AdminTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyMessage = 'No results.',
  sort,
  onSortChange,
  loading = false,
}: AdminTableProps<T>) {
  const headerCell: CSSProperties = {
    textAlign: 'left',
    padding: '10px 12px',
    background: '#0F1116',
    color: '#9AA0AA',
    fontSize: 12,
    fontWeight: 600,
    borderBottom: '1px solid #262A34',
  };
  const rowCell: CSSProperties = {
    padding: '12px',
    borderBottom: '1px solid #1E2129',
    color: '#EFF1F5',
    fontSize: 13,
  };
  return (
    <div style={{ overflowX: 'auto', border: '1px solid #262A34', borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  ...headerCell,
                  textAlign: col.align ?? 'left',
                  width: col.width,
                  cursor: col.sortKey ? 'pointer' : 'default',
                }}
                onClick={
                  col.sortKey && onSortChange
                    ? () => onSortChange(col.sortKey!)
                    : undefined
                }
              >
                <span>{col.header}</span>
                {col.sortKey && sort && sort.key === col.sortKey ? (
                  <span
                    style={{ marginLeft: 6, color: '#4B4EFF', fontSize: 10 }}
                  >
                    {sort.direction === 'asc' ? '▲' : '▼'}
                  </span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ ...rowCell, textAlign: 'center', color: '#7B7F8A' }}>
                Loading…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ ...rowCell, textAlign: 'center', color: '#7B7F8A' }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{ ...rowCell, textAlign: col.align ?? 'left' }}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
