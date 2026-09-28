/**
 * All users page.
 *
 * Filterable, sortable, paginated list of every account. Each row exposes
 * a "remove" button gated by the admin permissions helper.
 */

import { useCallback, useMemo, useState } from 'react';
import { AdminShell } from '../components/AdminShell';
import { AdminBadge } from '../components/Badge';
import { AdminButton } from '../components/Button';
import { AdminCard } from '../components/Card';
import { AdminPagination } from '../components/Pagination';
import { AdminTable } from '../components/Table';
import { Avatar } from '../components/Avatar';
import { RemoveUserModal } from '../components/RemoveUserModal';
import { RoleFilterBar } from '../components/RoleFilterBar';
import { SectionHeader } from '../components/SectionHeader';
import { formatDate, formatRelative } from '../utils/dateUtils';
import { humanReadableRole, humanReadableStatus } from '../types/user.types';
import type { AdminUser, AdminUserRole } from '../types/user.types';
import { deleteUser } from '../services/adminUsers.service';
import type { AdminAction } from '../store/actions';
import { useAdminDispatch } from '../store/context';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { useAdminSession } from '../hooks/useAdminSession';
import { useAdminToasts } from '../hooks/useAdminToasts';
import { useSortableColumn } from '../hooks/useSortableColumn';
import { useAdminPagination } from '../hooks/useAdminPagination';
import { canRemove } from '../utils/permissions';
import { emptySession } from '../types/admin.types';

interface AdminUsersPageProps {
  restrictRole?: AdminUserRole;
  title?: string;
  subtitle?: string;
  activeKey?: string;
}

export function AdminUsersPage({
  restrictRole,
  title = 'All users',
  subtitle = 'Manage boss and staff accounts across the platform.',
  activeKey = 'users',
}: AdminUsersPageProps) {
  const dispatch = useAdminDispatch();
  const { session } = useAdminSession();
  const { push } = useAdminToasts();
  const pagination = useAdminPagination({ initialPageSize: 25 });
  const sort = useSortableColumn<AdminUser>({ key: 'displayName', direction: 'asc' });

  const { users, filter, pagination: paginationState, loading, error, setFilter, refresh } =
    useAdminUsers({ page: pagination.page, pageSize: pagination.pageSize, sort: sort.list });

  const scopedFilter = useMemo(() => {
    if (!restrictRole) return filter;
    return { ...filter, role: restrictRole } as typeof filter;
  }, [filter, restrictRole]);

  const visibleUsers = useMemo(() => {
    if (!restrictRole) return users;
    return users.filter((user) => user.role === restrictRole);
  }, [users, restrictRole]);

  const [pendingRemoval, setPendingRemoval] = useState<AdminUser | undefined>();
  const [removing, setRemoving] = useState(false);

  const performRemoval = useCallback(async () => {
    if (!pendingRemoval) return;
    if (!session) return;
    setRemoving(true);
    const result = await deleteUser(pendingRemoval.id, {
      id: session.actorId,
      displayName: session.displayName,
      role: session.role,
    });
    setRemoving(false);
    if (result.status === 'failure') {
      push({ kind: 'error', title: 'Removal failed', message: result.error.message });
      return;
    }
    dispatch({ type: 'users/remove', id: pendingRemoval.id } as AdminAction);
    push({
      kind: 'success',
      title: 'Account removed',
      message: `${pendingRemoval.displayName} was removed from the system.`,
    });
    setPendingRemoval(undefined);
    void refresh();
  }, [pendingRemoval, session, dispatch, push, refresh]);

  const activeSession = session ?? emptySession();

  return (
    <AdminShell
      title={title}
      subtitle={subtitle}
      activeKey={activeKey}
      onSearch={(value) => setFilter({ search: value })}
      searchValue={filter.search}
      actions={
        <AdminButton variant="secondary" onClick={() => void refresh()}>
          Refresh
        </AdminButton>
      }
    >
      {error ? (
        <AdminCard title="Something went wrong" variant="muted">
          <div style={{ color: '#FF9AB4' }}>{error}</div>
        </AdminCard>
      ) : (
        <>
          <RoleFilterBar
            filter={scopedFilter}
            onChange={(patch) => {
              if (restrictRole && 'role' in patch) return;
              setFilter(patch);
              pagination.setPage(1);
            }}
          />

          <SectionHeader
            title={`Showing ${visibleUsers.length} of ${paginationState.totalRecords}`}
            actions={
              <AdminButton
                variant="ghost"
                onClick={() => setFilter({ search: '', role: 'all', status: 'all' })}
              >
                Reset filters
              </AdminButton>
            }
          />

          <AdminTable<AdminUser>
            loading={loading}
            emptyMessage="No users match the current filters."
            sort={sort.descriptor}
            onSortChange={(key) => {
              sort.toggle(key);
              pagination.setPage(1);
            }}
            columns={[
              {
                key: 'user',
                header: 'User',
                sortKey: 'displayName',
                render: (user) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={user.displayName} />
                    <div>
                      <div style={{ color: '#EFF1F5' }}>{user.displayName}</div>
                      <div style={{ color: '#7B7F8A', fontSize: 11 }}>
                        {user.contact.primaryEmail}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'role',
                header: 'Role',
                sortKey: 'role',
                render: (user) => (
                  <AdminBadge tone="info">{humanReadableRole(user.role)}</AdminBadge>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                sortKey: 'status',
                render: (user) => (
                  <AdminBadge tone={user.status === 'active' ? 'success' : 'neutral'}>
                    {humanReadableStatus(user.status)}
                  </AdminBadge>
                ),
              },
              {
                key: 'transporters',
                header: 'Transporters',
                render: (user) => (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {user.transporters.slice(0, 2).map((entry) => (
                      <AdminBadge key={entry} tone="neutral">
                        {entry}
                      </AdminBadge>
                    ))}
                    {user.transporters.length > 2 ? (
                      <AdminBadge tone="neutral">+{user.transporters.length - 2}</AdminBadge>
                    ) : null}
                  </div>
                ),
              },
              {
                key: 'lastLogin',
                header: 'Last login',
                sortKey: (user) => user.audit.lastLoginAt ?? '',
                render: (user) =>
                  user.audit.lastLoginAt
                    ? formatRelative(user.audit.lastLoginAt)
                    : '—',
              },
              {
                key: 'created',
                header: 'Created',
                sortKey: (user) => user.audit.createdAt,
                render: (user) => formatDate(user.audit.createdAt),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (user) => (
                  <AdminButton
                    size="sm"
                    variant="danger"
                    disabled={!canRemove(activeSession, user)}
                    onClick={(event) => {
                      event.stopPropagation();
                      setPendingRemoval(user);
                    }}
                  >
                    Remove
                  </AdminButton>
                ),
              },
            ]}
            rows={visibleUsers}
            rowKey={(user) => user.id}
          />

          <AdminPagination
            pagination={paginationState}
            onPageChange={(page) => pagination.setPage(page)}
            onPageSizeChange={(size) => {
              pagination.setPageSize(size);
              pagination.setPage(1);
            }}
          />
        </>
      )}

      <RemoveUserModal
        user={pendingRemoval}
        open={Boolean(pendingRemoval)}
        busy={removing}
        onCancel={() => setPendingRemoval(undefined)}
        onConfirm={() => void performRemoval()}
      />
    </AdminShell>
  );
}
