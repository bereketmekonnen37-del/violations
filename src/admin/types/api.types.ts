/**
 * Shared API envelope types for the admin dashboard.
 *
 * The admin dashboard talks to a stub service layer that models a REST-ish
 * API. These envelope types describe pagination, sorting, and error shapes so
 * that swapping the stub for a real HTTP client only requires changing the
 * service module, not the callers.
 */

export interface AdminApiSuccess<T> {
  status: 'success';
  data: T;
  requestId: string;
  timestamp: string;
}

export interface AdminApiFailure {
  status: 'failure';
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
  timestamp: string;
}

export type AdminApiResult<T> = AdminApiSuccess<T> | AdminApiFailure;

export interface AdminApiPagination {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface AdminApiPaginatedData<T> {
  items: T[];
  pagination: AdminApiPagination;
}

export interface AdminApiSortDirective {
  field: string;
  direction: 'asc' | 'desc';
}

export interface AdminApiListParams {
  page?: number;
  pageSize?: number;
  sort?: AdminApiSortDirective[];
  filter?: Record<string, string | number | boolean | undefined>;
}

export interface AdminApiHealthCheck {
  service: string;
  status: 'ok' | 'degraded' | 'down';
  latencyMs: number;
  message?: string;
  checkedAt: string;
}

export interface AdminApiRateLimit {
  remaining: number;
  reset: string;
  limit: number;
}

export function isSuccess<T>(
  result: AdminApiResult<T>,
): result is AdminApiSuccess<T> {
  return result.status === 'success';
}

export function isFailure<T>(
  result: AdminApiResult<T>,
): result is AdminApiFailure {
  return result.status === 'failure';
}

export function unwrap<T>(result: AdminApiResult<T>): T {
  if (result.status === 'success') return result.data;
  throw new Error(
    `admin api error [${result.error.code}]: ${result.error.message}`,
  );
}

export function defaultPagination(): AdminApiPagination {
  return { page: 1, pageSize: 25, totalRecords: 0, totalPages: 0 };
}
