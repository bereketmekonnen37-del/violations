/**
 * Admin dashboard.
 *
 * Renders the top-line stat cards, a role breakdown donut, a login-activity
 * line chart, and a table of recently created users.
 */

import { useMemo } from 'react';
import { AdminCard } from '../components/Card';
import { AdminShell } from '../components/AdminShell';
import { AdminTable } from '../components/Table';
import { AdminBadge } from '../components/Badge';
import { Avatar } from '../components/Avatar';
import { BarChart } from '../components/BarChart';
import { DonutChart } from '../components/DonutChart';
import { EmptyState } from '../components/EmptyState';
import { LineChart } from '../components/LineChart';
import { Loader } from '../components/Loader';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard } from '../components/StatCard';
import { toCardModels } from '../utils/analytics';
import { formatDate, formatRelative } from '../utils/dateUtils';
import { formatInteger, formatPercent } from '../utils/format';
import { ADMIN_ROLE_COLORS } from '../utils/constants';
import { useAdminStats } from '../hooks/useAdminStats';
import { useAdminUsers } from '../hooks/useAdminUsers';
import type { AdminUser } from '../types/user.types';
import { humanReadableRole, humanReadableStatus } from '../types/user.types';

export function AdminDashboardPage() {
  const { snapshot, loading, error, refresh } = useAdminStats();
  const users = useAdminUsers({ page: 1, pageSize: 8, sort: [] });

  const cards = useMemo(() => (snapshot ? toCardModels(snapshot) : []), [snapshot]);
  const donutSlices = useMemo(() => {
    if (!snapshot) return [];
    return [
      { label: 'Bosses', value: snapshot.countsByRole.boss, color: ADMIN_ROLE_COLORS.boss },
      { label: 'Staff', value: snapshot.countsByRole.staff, color: ADMIN_ROLE_COLORS.staff },
      { label: 'Admins', value: snapshot.countsByRole.admin, color: ADMIN_ROLE_COLORS.admin },
      { label: 'Super', value: snapshot.countsByRole.super_admin, color: ADMIN_ROLE_COLORS.super_admin },
    ];
  }, [snapshot]);

  return (
    <AdminShell
      title="Dashboard"
      subtitle="Live counts of boss and staff accounts across every transporter."
      activeKey="dashboard"
    >
      {error ? (
        <div style={{ color: '#FF9AB4', marginBottom: 12 }}>{error}</div>
      ) : null}

      <SectionHeader
        title="Summary"
        description={
          snapshot
            ? `Snapshot generated ${formatRelative(snapshot.generatedAt)}`
            : 'Snapshot loading…'
        }
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {loading && cards.length === 0 ? (
          <Loader label="Loading counts…" />
        ) : (
          cards.map((card) => <StatCard key={card.key} model={card} />)
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <AdminCard title="Roles" subtitle="How your accounts break down by role.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <DonutChart slices={donutSlices} centerLabel="Users" />
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#9AA0AA', fontSize: 12 }}>
              {donutSlices.map((slice) => (
                <li key={slice.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      background: slice.color,
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ color: '#EFF1F5' }}>{slice.label}</span>
                  <span>{formatInteger(slice.value)}</span>
                  <span style={{ color: '#7B7F8A' }}>
                    ({snapshot ? formatPercent(slice.value / Math.max(snapshot.totals.totalUsers, 1)) : '—'})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </AdminCard>

        <AdminCard title="Logins" subtitle="Daily logins for the past 30 days.">
          {snapshot ? (
            <LineChart series={snapshot.loginActivitySeries} />
          ) : (
            <Loader label="Loading chart…" />
          )}
        </AdminCard>

        <AdminCard title="New users" subtitle="New accounts per day.">
          {snapshot ? (
            <BarChart series={snapshot.newUsersSeries} />
          ) : (
            <Loader label="Loading chart…" />
          )}
        </AdminCard>
      </div>

      <SectionHeader
        title="Recently created"
        description="Latest accounts added to the platform."
        actions={
          <button
            onClick={() => void refresh()}
            style={{
              background: 'transparent',
              border: '1px solid #262A34',
              borderRadius: 6,
              color: '#EFF1F5',
              padding: '6px 10px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        }
      />
      {users.users.length === 0 ? (
        <EmptyState title="No users yet" description="Create the first account to get started." />
      ) : (
        <AdminTable<AdminUser>
          columns={[
            {
              key: 'user',
              header: 'User',
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
              render: (user) => <AdminBadge tone="info">{humanReadableRole(user.role)}</AdminBadge>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (user) => (
                <AdminBadge tone={user.status === 'active' ? 'success' : 'neutral'}>
                  {humanReadableStatus(user.status)}
                </AdminBadge>
              ),
            },
            {
              key: 'created',
              header: 'Created',
              render: (user) => formatDate(user.audit.createdAt),
            },
          ]}
          rows={users.users}
          rowKey={(user) => user.id}
        />
      )}
    </AdminShell>
  );
}
