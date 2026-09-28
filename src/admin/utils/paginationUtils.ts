/**
 * Pagination math.
 *
 * Pure helpers used by the pagination hook and by service stubs to compute
 * page counts, slice arrays, and clamp requested pages to valid values.
 */

import { ADMIN_DEFAULT_PAGE_SIZE } from './constants';
import type { AdminApiPagination } from '../types/api.types';

export interface PageRequest {
  page: number;
  pageSize: number;
}

export function computePagination(
  totalRecords: number,
  request: PageRequest,
): AdminApiPagination {
  const pageSize = Math.max(1, request.pageSize || ADMIN_DEFAULT_PAGE_SIZE);
  const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize);
  const rawPage = request.page || 1;
  const page = totalPages === 0 ? 1 : Math.max(1, Math.min(totalPages, rawPage));
  return { page, pageSize, totalRecords, totalPages };
}

export function slicePage<T>(rows: readonly T[], pagination: AdminApiPagination): T[] {
  if (rows.length === 0) return [];
  const start = (pagination.page - 1) * pagination.pageSize;
  const end = start + pagination.pageSize;
  return rows.slice(start, end);
}

export function nextPage(pagination: AdminApiPagination): number {
  return Math.min(pagination.totalPages || 1, pagination.page + 1);
}

export function previousPage(pagination: AdminApiPagination): number {
  return Math.max(1, pagination.page - 1);
}

export function pageNumbers(pagination: AdminApiPagination, window = 5): number[] {
  if (pagination.totalPages <= 0) return [];
  const half = Math.floor(window / 2);
  let start = Math.max(1, pagination.page - half);
  let end = Math.min(pagination.totalPages, start + window - 1);
  if (end - start + 1 < window) {
    start = Math.max(1, end - window + 1);
  }
  const numbers: number[] = [];
  for (let i = start; i <= end; i += 1) numbers.push(i);
  return numbers;
}

export function rangeLabel(pagination: AdminApiPagination): string {
  if (pagination.totalRecords === 0) return '0 rows';
  const start = (pagination.page - 1) * pagination.pageSize + 1;
  const end = Math.min(
    pagination.totalRecords,
    pagination.page * pagination.pageSize,
  );
  return `${start}–${end} of ${pagination.totalRecords}`;
}
