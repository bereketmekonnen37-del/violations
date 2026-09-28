/**
 * User service.
 *
 * Provides CRUD-ish endpoints for the admin dashboard on top of the
 * in-memory store. All operations return AdminApiResult so callers handle
 * errors uniformly.
 */

import { applyUserFilters, emptyFilter } from '../utils/filterUtils';
import { computePagination, slicePage } from '../utils/paginationUtils';
import { sortByMultiple } from '../utils/sortUtils';
import type { SortDescriptor } from '../utils/sortUtils';
import { generateAuditId } from '../utils/id';
import { toIsoDate } from '../utils/dateUtils';
import type {
  AdminApiPaginatedData,
  AdminApiResult,
} from '../types/api.types';
import type {
  AdminUser,
  AdminUserFilterState,
  AdminUserFormValues,
  AdminUserSummary,
} from '../types/user.types';
import { appendRecord } from './auditStore';
import { runRequest } from './httpClient';
import {
  findByEmail,
  getById,
  insert,
  listAll,
  remove,
  replace,
} from './userStore';

export interface ListUsersParams {
  filter?: Partial<AdminUserFilterState>;
  page?: number;
  pageSize?: number;
  sort?: SortDescriptor<AdminUser>[];
}

function summarize(user: AdminUser): AdminUserSummary {
  return {
    id: user.id,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    primaryEmail: user.contact.primaryEmail,
    createdAt: user.audit.createdAt,
    lastLoginAt: user.audit.lastLoginAt,
  };
}

export function listUsers(
  params: ListUsersParams = {},
): Promise<AdminApiResult<AdminApiPaginatedData<AdminUser>>> {
  return runRequest(() => {
    const filter: AdminUserFilterState = { ...emptyFilter(), ...params.filter };
    const rows = applyUserFilters(listAll(), filter);
    const sorted = sortByMultiple(rows, params.sort ?? []);
    const pagination = computePagination(sorted.length, {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 25,
    });
    return {
      items: slicePage(sorted, pagination),
      pagination,
    };
  });
}

export function listUserSummaries(
  params: ListUsersParams = {},
): Promise<AdminApiResult<AdminApiPaginatedData<AdminUserSummary>>> {
  return runRequest(async () => {
    const raw = await listUsers(params);
    if (raw.status === 'failure') throw new Error(raw.error.message);
    return {
      items: raw.data.items.map(summarize),
      pagination: raw.data.pagination,
    };
  });
}

export function getUser(id: string): Promise<AdminApiResult<AdminUser>> {
  return runRequest(() => {
    const user = getById(id);
    if (!user) throw new Error(`User ${id} not found.`);
    return user;
  });
}

function newUserFromForm(values: AdminUserFormValues): AdminUser {
  const now = new Date().toISOString();
  return {
    id: `usr_new_${Math.random().toString(36).slice(2, 12)}`,
    displayName: values.displayName,
    role: values.role,
    status: 'invited',
    contact: {
      primaryEmail: values.primaryEmail,
      smsEnabled: false,
      phone: values.phone,
    },
    audit: { createdAt: now, updatedAt: now },
    permissions: {
      canManageStaff: values.role === 'boss' || values.role === 'admin' || values.role === 'super_admin',
      canManageBosses: values.role === 'admin' || values.role === 'super_admin',
      canManageAdmins: values.role === 'super_admin',
      canExportData: values.role !== 'staff',
      canViewAuditLog: values.role === 'admin' || values.role === 'super_admin',
      canAssignTransporters: values.role !== 'staff',
      canConfigureRules: values.role !== 'staff',
      canImpersonate: false,
    },
    preferences: {
      timezone: 'America/New_York',
      language: 'en-US',
      dashboardDensity: 'cozy',
      emailDigestFrequency: 'weekly',
      showTutorials: true,
      darkMode: false,
    },
    transporters: values.transporters,
    tags: [],
    notes: values.notes,
  };
}

export function createUser(
  values: AdminUserFormValues,
  actor: { id: string; displayName: string; role: string },
): Promise<AdminApiResult<AdminUser>> {
  return runRequest(() => {
    const existing = findByEmail(values.primaryEmail);
    if (existing) {
      throw new Error(`Email ${values.primaryEmail} is already in use.`);
    }
    const user = insert(newUserFromForm(values));
    appendRecord({
      id: generateAuditId(),
      timestamp: toIsoDate(new Date()),
      action: 'user.created',
      severity: 'notice',
      actor: { id: actor.id, displayName: actor.displayName, role: actor.role },
      target: { kind: 'user', id: user.id, label: user.displayName },
      summary: `${actor.displayName} created ${user.displayName}`,
    });
    return user;
  });
}

export function updateUser(
  id: string,
  patch: Partial<AdminUser>,
  actor: { id: string; displayName: string; role: string },
): Promise<AdminApiResult<AdminUser>> {
  return runRequest(() => {
    const current = getById(id);
    if (!current) throw new Error(`User ${id} not found.`);
    const now = new Date().toISOString();
    const merged: AdminUser = {
      ...current,
      ...patch,
      contact: { ...current.contact, ...(patch.contact ?? {}) },
      audit: { ...current.audit, ...(patch.audit ?? {}), updatedAt: now, updatedBy: actor.id },
      permissions: { ...current.permissions, ...(patch.permissions ?? {}) },
      preferences: { ...current.preferences, ...(patch.preferences ?? {}) },
      transporters: patch.transporters ?? current.transporters,
      tags: patch.tags ?? current.tags,
    };
    const stored = replace(merged);
    if (!stored) throw new Error('Update failed');
    appendRecord({
      id: generateAuditId(),
      timestamp: now,
      action: 'user.updated',
      severity: 'info',
      actor: { id: actor.id, displayName: actor.displayName, role: actor.role },
      target: { kind: 'user', id: stored.id, label: stored.displayName },
      summary: `${actor.displayName} updated ${stored.displayName}`,
    });
    return stored;
  });
}

export function suspendUser(
  id: string,
  actor: { id: string; displayName: string; role: string },
): Promise<AdminApiResult<AdminUser>> {
  return updateUser(id, { status: 'suspended' }, actor);
}

export function reinstateUser(
  id: string,
  actor: { id: string; displayName: string; role: string },
): Promise<AdminApiResult<AdminUser>> {
  return updateUser(id, { status: 'active' }, actor);
}

export function deleteUser(
  id: string,
  actor: { id: string; displayName: string; role: string },
): Promise<AdminApiResult<{ removed: true; id: string }>> {
  return runRequest(() => {
    const current = getById(id);
    if (!current) throw new Error(`User ${id} not found.`);
    if (current.id === actor.id) throw new Error('You cannot remove yourself.');
    const success = remove(id);
    if (!success) throw new Error('Removal failed.');
    appendRecord({
      id: generateAuditId(),
      timestamp: new Date().toISOString(),
      action: 'user.deleted',
      severity: 'warning',
      actor: { id: actor.id, displayName: actor.displayName, role: actor.role },
      target: { kind: 'user', id: current.id, label: current.displayName },
      summary: `${actor.displayName} removed ${current.displayName}`,
    });
    return { removed: true, id };
  });
}

export function inviteUser(
  values: AdminUserFormValues,
  actor: { id: string; displayName: string; role: string },
): Promise<AdminApiResult<AdminUser>> {
  return createUser(values, actor).then((result) => {
    if (result.status === 'failure') return result;
    return runRequest(() => {
      appendRecord({
        id: generateAuditId(),
        timestamp: new Date().toISOString(),
        action: 'user.invited',
        severity: 'notice',
        actor,
        target: {
          kind: 'user',
          id: result.data.id,
          label: result.data.displayName,
        },
        summary: `${actor.displayName} invited ${result.data.displayName}`,
      });
      return result.data;
    });
  });
}

export function assignTransporters(
  id: string,
  transporters: string[],
  actor: { id: string; displayName: string; role: string },
): Promise<AdminApiResult<AdminUser>> {
  return updateUser(id, { transporters }, actor);
}

export function checkEmailAvailable(email: string): Promise<AdminApiResult<{ available: boolean }>> {
  return runRequest(() => ({ available: findByEmail(email) === undefined }));
}
