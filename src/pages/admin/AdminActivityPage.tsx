import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { fetchAdminUploads, type AdminUploadRecord } from '../../features/adminDashboard/adminApi';
import {
  Card,
  EmptyBlock,
  ErrorBlock,
  KIND_META,
  LoadingBlock,
  PageHeader,
  fmtDateTime,
  fmtRelative,
} from '../../features/adminDashboard/adminUi';

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
};

export const AdminActivityPage = () => {
  const [uploads, setUploads] = useState<AdminUploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAdminUploads()
      .then((d) => {
        if (!cancelled) {
          setUploads(d);
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
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, AdminUploadRecord[]>();
    for (const u of uploads) {
      const k = dayKey(u.uploadedAt);
      const arr = map.get(k) ?? [];
      arr.push(u);
      map.set(k, arr);
    }
    return Array.from(map.entries());
  }, [uploads]);

  return (
    <>
      <PageHeader
        title="Activity timeline"
        subtitle="Everything that has happened on the platform, grouped by day."
      />

      {loading ? (
        <LoadingBlock text="Loading activity…" />
      ) : error ? (
        <ErrorBlock error={error} />
      ) : grouped.length === 0 ? (
        <EmptyBlock text="No activity yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {grouped.map(([day, items]) => (
            <Card key={day} style={{ padding: '16px 18px' }}>
              <div style={{ marginBottom: 10, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{day}</h2>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{items.length} event{items.length === 1 ? '' : 's'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((u) => {
                  const kind = KIND_META[u.kind];
                  return (
                    <div
                      key={`${u.kind}-${u.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: '#f8faff',
                        border: '1px solid #eef1fa',
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          background: kind.color + '18',
                          color: kind.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Upload size={14} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>
                          <Link
                            to={`/admin/users/${u.uploaderId}`}
                            style={{ color: '#3e55a5', textDecoration: 'none', fontWeight: 600 }}
                          >
                            {u.uploaderName}
                          </Link>{' '}
                          uploaded a <span style={{ color: kind.color, fontWeight: 600 }}>{kind.label}</span>{' '}
                          file — <span style={{ color: '#64748b' }}>{u.title}</span>
                        </p>
                        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          {u.rowCount} rows · {fmtDateTime(u.uploadedAt)}
                        </p>
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {fmtRelative(u.uploadedAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
};
