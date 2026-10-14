import { useEffect, useState } from 'react';
import {
  Activity,
  Gauge,
  Moon,
  RefreshCw,
  Route,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react';
import {
  fetchAdminUploads,
  fetchAdminUsers,
  type AdminUploadRecord,
  type AdminUser,
} from '../../features/adminDashboard/adminApi';
import {
  Card,
  EmptyBlock,
  ErrorBlock,
  KIND_META,
  LoadingBlock,
  MiniStat,
  PageHeader,
  ROLE_META,
  fmtDateTime,
  fmtRelative,
} from '../../features/adminDashboard/adminUi';

export const AdminOverviewPage = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [uploads, setUploads] = useState<AdminUploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchAdminUsers(), fetchAdminUploads()])
      .then(([u, up]) => {
        if (cancelled) return;
        setUsers(u);
        setUploads(up);
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
  }, [refreshKey]);

  if (loading) return <LoadingBlock text="Loading overview…" />;
  if (error) return <ErrorBlock error={error} onRetry={() => setRefreshKey((k) => k + 1)} />;

  const bossCount = users.filter((u) => u.role === 'boss').length;
  const staffCount = users.filter((u) => u.role === 'staff').length;
  const totalUploads = users.reduce((s, u) => s + u.uploads.total, 0);
  const totalSpeed = users.reduce((s, u) => s + u.uploads.speed, 0);
  const totalNights = users.reduce((s, u) => s + u.uploads.nights, 0);
  const totalContinuous = users.reduce((s, u) => s + u.uploads.continuous, 0);
  const totalViolations = users.reduce((s, u) => s + u.uploads.violations, 0);
  const topUploader = [...users].sort((a, b) => b.uploads.total - a.uploads.total)[0];
  const recentUploads = uploads.slice(0, 8);

  return (
    <>
      <PageHeader
        title="Platform overview"
        subtitle="Health, activity, and top contributors across every account."
        right={
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid #dfe4f2',
              background: '#fff',
              color: '#3e55a5',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        <MiniStat
          icon={<Users size={18} />}
          label="Total users"
          value={users.length}
          accent="#3e55a5"
          sub={`${bossCount} boss · ${staffCount} staff`}
        />
        <MiniStat
          icon={<Upload size={18} />}
          label="All uploads"
          value={totalUploads}
          accent="#059669"
          sub="All kinds combined"
        />
        <MiniStat icon={<Gauge size={18} />} label="Speed files" value={totalSpeed} accent="#f48221" />
        <MiniStat icon={<Moon size={18} />} label="Night files" value={totalNights} accent="#7c3aed" />
        <MiniStat
          icon={<Route size={18} />}
          label="Continuous"
          value={totalContinuous}
          accent="#0891b2"
        />
        <MiniStat
          icon={<Activity size={18} />}
          label="Violations"
          value={totalViolations}
          accent="#dc2626"
        />
      </div>

      {topUploader && topUploader.uploads.total > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #2a3a72 0%, #3e55a5 60%, #566fbb 100%)',
            borderRadius: 18,
            padding: '20px 24px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            position: 'relative',
            overflow: 'hidden',
            color: '#fff',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <TrendingUp size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.6)',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
              }}
            >
              Top uploader
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, marginTop: 3 }}>{topUploader.name}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
              {topUploader.email} · {ROLE_META[topUploader.role]?.label ?? topUploader.role}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{topUploader.uploads.total}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>total uploads</p>
          </div>
        </div>
      )}

      <Card style={{ padding: '18px 20px' }}>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Recent uploads</h2>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            Latest 8 files from every uploader across all tables.
          </p>
        </div>
        {recentUploads.length === 0 ? (
          <EmptyBlock text="No uploads yet." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentUploads.map((u) => {
              const kind = KIND_META[u.kind];
              return (
                <div
                  key={`${u.kind}-${u.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: '#f8faff',
                    border: '1px solid #eef1fa',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 36,
                      borderRadius: 4,
                      background: kind.color,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#0f172a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {u.title}
                    </p>
                    <p style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                      {u.uploaderName} · {kind.label} · {u.rowCount} rows
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8' }}>
                    <p>{fmtRelative(u.uploadedAt)}</p>
                    <p style={{ marginTop: 2 }}>{fmtDateTime(u.uploadedAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
};
