import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Search, Shield, X } from 'lucide-react';
import { fetchAdminUsers, type AdminUser } from '../../features/adminDashboard/adminApi';
import {
  Badge,
  Card,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  ROLE_META,
  fmtDate,
  fmtRelative,
} from '../../features/adminDashboard/adminUi';

export const AdminUsersPage = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'boss' | 'staff'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAdminUsers()
      .then((data) => {
        if (!cancelled) {
          setUsers(data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter !== 'all') list = list.filter((u) => u.role === roleFilter);
    const q = query.trim().toLowerCase();
    if (q)
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.assignedTransporters.some((t) => t.toLowerCase().includes(q)),
      );
    return list;
  }, [users, query, roleFilter]);

  const maxUploads = Math.max(...users.map((u) => u.uploads.total), 1);

  return (
    <>
      <PageHeader title="All users" subtitle="Every registered boss and staff account on the platform." />

      <Card style={{ overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 18px',
            borderBottom: '1px solid #eef1fa',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              Users
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#3e55a5',
                  background: '#eef1fa',
                  padding: '2px 8px',
                  borderRadius: 99,
                }}
              >
                {filtered.length}
              </span>
            </h2>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Click any row for the full profile.</p>
          </div>

          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 11,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, transporter…"
              style={{
                paddingLeft: 34,
                paddingRight: query ? 34 : 12,
                paddingTop: 8,
                paddingBottom: 8,
                border: '1px solid #dfe4f2',
                borderRadius: 10,
                fontSize: 13,
                color: '#0f172a',
                background: '#f7f8fc',
                outline: 'none',
                width: 240,
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'boss', 'staff'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 99,
                  border: '1px solid',
                  borderColor: roleFilter === r ? '#3e55a5' : '#dfe4f2',
                  background: roleFilter === r ? '#3e55a5' : '#fff',
                  color: roleFilter === r ? '#fff' : '#64748b',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingBlock text="Loading users…" />
        ) : error ? (
          <ErrorBlock error={error} onRetry={() => setRefreshKey((k) => k + 1)} />
        ) : filtered.length === 0 ? (
          <EmptyBlock text={query || roleFilter !== 'all' ? 'No users match your filters.' : 'No users found.'} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f7f8fc' }}>
                  {['User', 'Role', 'Uploads', 'Speed', 'Night', 'Cont.', 'Viol.', 'Joined', ''].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '11px 16px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap',
                        borderBottom: '1px solid #eef1fa',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => {
                  const role = ROLE_META[u.role] ?? ROLE_META.staff;
                  return (
                    <tr
                      key={u.id}
                      style={{
                        background: i % 2 === 0 ? '#fff' : '#f8faff',
                        borderBottom: '1px solid #eef1fa',
                      }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <Link
                          to={`/admin/users/${u.id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            textDecoration: 'none',
                            color: 'inherit',
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: `linear-gradient(135deg, ${role.color}22, ${role.color}44)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: role.color,
                              fontWeight: 700,
                              fontSize: 14,
                              flexShrink: 0,
                            }}
                          >
                            {u.name?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{u.name}</p>
                            <p style={{ fontSize: 12, color: '#64748b' }}>{u.email}</p>
                          </div>
                        </Link>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <Badge label={role.label} color={role.color} bg={role.bg} icon={<Shield size={10} />} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: '#3e55a5' }}>
                            {u.uploads.total}
                          </span>
                          <div
                            style={{
                              width: 60,
                              height: 6,
                              borderRadius: 99,
                              background: '#eef1fa',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${(u.uploads.total / maxUploads) * 100}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #3e55a5, #566fbb)',
                                borderRadius: 99,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: '#f48221' }}>
                        {u.uploads.speed}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: '#7c3aed' }}>
                        {u.uploads.nights}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: '#0891b2' }}>
                        {u.uploads.continuous}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: '#dc2626' }}>
                        {u.uploads.violations}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <p style={{ fontSize: 12, color: '#1e293b', fontWeight: 500 }}>{fmtDate(u.createdAt)}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                          {fmtRelative(u.createdAt)}
                        </p>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <Link
                          to={`/admin/users/${u.id}`}
                          style={{ color: '#3e55a5', display: 'inline-flex', alignItems: 'center' }}
                          aria-label={`Open ${u.name}`}
                        >
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
};
