/**
 * Audit service.
 *
 * Provides filtered/paginated reads over the audit log store. Writing is
 * done indirectly by the user service.
 */

import { computePagination, slicePage } from '../utils/paginationUtils';
import { includesInsensitive } from '../utils/stringUtils';
import type {
  AdminAuditFilterState,
  AdminAuditPage,
  AdminAuditRecord,
} from '../types/audit.types';
import type { AdminApiResult } from '../types/api.types';
import { listAllAudit } from './auditStore';
import { runRequest } from './httpClient';

export interface ListAuditParams {
  filter?: Partial<AdminAuditFilterState>;
  page?: number;
  pageSize?: number;
}

function matches(record: AdminAuditRecord, filter: AdminAuditFilterState): boolean {
  if (filter.action !== 'all' && record.action !== filter.action) return false;
  if (filter.severity !== 'all' && record.severity !== filter.severity) return false;
  if (filter.actorId && record.actor.id !== filter.actorId) return false;
  if (filter.targetKind && record.target.kind !== filter.targetKind) return false;
  if (filter.since) {
    const from = new Date(filter.since).getTime();
    if (Number.isFinite(from) && new Date(record.timestamp).getTime() < from) return false;
  }
  if (filter.until) {
    const to = new Date(filter.until).getTime();
    if (Number.isFinite(to) && new Date(record.timestamp).getTime() > to) return false;
  }
  if (filter.search) {
    const needle = filter.search;
    const haystack = [
      record.summary,
      record.actor.displayName,
      record.target.label,
      record.notes ?? '',
    ].join(' ');
    if (!includesInsensitive(haystack, needle)) return false;
  }
  return true;
}

export function listAuditRecords(
  params: ListAuditParams = {},
): Promise<AdminApiResult<AdminAuditPage>> {
  return runRequest(() => {
    const filter: AdminAuditFilterState = {
      search: '',
      action: 'all',
      severity: 'all',
      ...params.filter,
    };
    const records = listAllAudit().filter((entry) => matches(entry, filter));
    const pagination = computePagination(records.length, {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 25,
    });
    return {
      records: slicePage(records, pagination),
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalRecords: pagination.totalRecords,
      totalPages: pagination.totalPages,
    };
  });
}

export function getRecentAudit(limit = 10): Promise<AdminApiResult<AdminAuditRecord[]>> {
  return runRequest(() => listAllAudit().slice(0, limit));
}
