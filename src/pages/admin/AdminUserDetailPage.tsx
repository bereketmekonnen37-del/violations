import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Shield, UserCircle2 } from 'lucide-react';
import {
  fetchAdminUploads,
  fetchAdminUsers,
  type AdminUploadRecord,
  type AdminUser,
} from '../../features/adminDashboard/adminApi';
import {
  Badge,
  Card,
  EmptyBlock,
  ErrorBlock,
  KIND_META,
  LoadingBlock,
  MiniStat,
  ROLE_META,
  fmtDate,
  fmtDateTime,
  fmtRelative,
} from '../../features/adminDashboard/adminUi';

export const AdminUserDetailPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [uploads, setUploads] = useState<AdminUploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!userId) return;
    setLoading(true);
    setError(null);
    Promise.all([fetchAdminUsers(), fetchAdminUploads()])
      .then(([users, up]) => {
        if (cancelled) return;
        setUser(users.find((u) => u.id === userId) ?? null);
        setUploads(up.filter((u) => u.uploaderId === userId));
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const sortedUploads = useMemo(
    () => [...uploads].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
    [uploads],
  );

  if (loading) return <LoadingBlock text="Loading profile…" />;
  if (error) return <ErrorBlock error={error} />;
  if (!user)
    return (
      <>
        <Link to="/admin/users" style={{ color: '#3e55a5', fontSize: 13, fontWeight: 600 }}>
          ← Back to users
        </Link>
        <EmptyBlock text="User not found." />
      </>
    );

  const role = ROLE_META[user.role] ?? ROLE_META.staff;

  return (
    <>
      <Link
        to="/admin/users"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: '#3e55a5',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          marginBottom: 16,
        }}
      >
        <ArrowLeft size={14} /> Back to users
      </Link>

      <Card style={{ padding: '22px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 18,
              background: `linear-gradient(135deg, ${role.color}22, ${role.color}55)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: role.color,
              fontWeight: 700,
              fontSize: 28,
              flexShrink: 0,
            }}
          >
            {user.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.4px' }}>
              {user.name}
            </h1>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={13} /> {user.email}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <Badge label={role.label} color={role.color} bg={role.bg} icon={<Shield size={10} />} />
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                Joined {fmtDate(user.createdAt)} · {fmtRelative(user.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <MiniStat icon={<UserCircle2 size={18} />} label="Total uploads" value={user.uploads.total} accent="#3e55a5" />
        <MiniStat icon={<UserCircle2 size={18} />} label="Speed" value={user.uploads.speed} accent="#f48221" />
        <MiniStat icon={<UserCircle2 size={18} />} label="Night" value={user.uploads.nights} accent="#7c3aed" />
        <MiniStat icon={<UserCircle2 size={18} />} label="Continuous" value={user.uploads.continuous} accent="#0891b2" />
        <MiniStat icon={<UserCircle2 size={18} />} label="Violations" value={user.uploads.violations} accent="#dc2626" />
      </div>

      {user.role === 'staff' && user.assignedTransporters.length > 0 && (
        <Card style={{ padding: '16px 18px', marginBottom: 20 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: 10,
            }}
          >
            Assigned transporters
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {user.assignedTransporters.map((t) => (
              <span
                key={t}
                style={{
                  padding: '4px 10px',
                  borderRadius: 99,
                  background: '#eef1fa',
                  color: '#3e55a5',
                  fontSize: 12,
                  fontWeight: 500,
                  border: '1px solid #dfe4f2',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #eef1fa' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            Upload history
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
              {sortedUploads.length}
            </span>
          </h2>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            Every file this user has uploaded, across all kinds.
          </p>
        </div>
        {sortedUploads.length === 0 ? (
          <EmptyBlock text="No uploads from this user yet." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f7f8fc' }}>
                  {['Kind', 'Title', 'Source', 'Rows', 'Uploaded'].map((h) => (
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
                {sortedUploads.map((u, i) => {
                  const kind = KIND_META[u.kind];
                  return (
                    <tr
                      key={`${u.kind}-${u.id}`}
                      style={{
                        background: i % 2 === 0 ? '#fff' : '#f8faff',
                        borderBottom: '1px solid #eef1fa',
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <Badge label={kind.label} color={kind.color} bg={kind.color + '18'} />
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#0f172a', fontWeight: 500 }}>
                        {u.title}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                        {u.source ?? u.fileType ?? '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#3e55a5' }}>
                        {u.rowCount}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ fontSize: 12.5, color: '#1e293b', fontWeight: 500 }}>
                          {fmtDateTime(u.uploadedAt)}
                        </p>
                        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                          {fmtRelative(u.uploadedAt)}
                        </p>
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
