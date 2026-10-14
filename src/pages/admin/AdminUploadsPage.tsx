import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import {
  fetchAdminUploads,
  type AdminUploadKind,
  type AdminUploadRecord,
} from '../../features/adminDashboard/adminApi';
import {
  Badge,
  Card,
  EmptyBlock,
  ErrorBlock,
  KIND_META,
  LoadingBlock,
  PageHeader,
  fmtDateTime,
  fmtRelative,
} from '../../features/adminDashboard/adminUi';

const KIND_FILTERS: Array<{ key: AdminUploadKind | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'speed', label: 'Speed' },
  { key: 'night', label: 'Night' },
  { key: 'continuous', label: 'Continuous' },
  { key: 'violation', label: 'Violations' },
];

export const AdminUploadsPage = () => {
  const [uploads, setUploads] = useState<AdminUploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<AdminUploadKind | 'all'>('all');
  const [query, setQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

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
  }, [refreshKey]);

  const filtered = useMemo(() => {
    let list = uploads;
    if (kindFilter !== 'all') list = list.filter((u) => u.kind === kindFilter);
    const q = query.trim().toLowerCase();
    if (q)
      list = list.filter(
        (u) =>
          u.title.toLowerCase().includes(q) ||
          u.uploaderName.toLowerCase().includes(q) ||
          u.uploaderEmail.toLowerCase().includes(q),
      );
    return list;
  }, [uploads, kindFilter, query]);

  return (
    <>
      <PageHeader
        title="All uploads"
        subtitle="Every file uploaded by every staff and boss — across speed, night, continuous, and violations."
      />

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
              Uploads
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
              }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title or uploader…"
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
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {KIND_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setKindFilter(f.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 99,
                  border: '1px solid',
                  borderColor: kindFilter === f.key ? '#3e55a5' : '#dfe4f2',
                  background: kindFilter === f.key ? '#3e55a5' : '#fff',
                  color: kindFilter === f.key ? '#fff' : '#64748b',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingBlock text="Loading uploads…" />
        ) : error ? (
          <ErrorBlock error={error} onRetry={() => setRefreshKey((k) => k + 1)} />
        ) : filtered.length === 0 ? (
          <EmptyBlock text={query || kindFilter !== 'all' ? 'No uploads match your filters.' : 'No uploads yet.'} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f7f8fc' }}>
                  {['Kind', 'Title', 'Uploader', 'Source', 'Rows', 'Uploaded'].map((h) => (
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
                      <td style={{ padding: '12px 16px' }}>
                        <Link
                          to={`/admin/users/${u.uploaderId}`}
                          style={{ color: '#3e55a5', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}
                        >
                          {u.uploaderName}
                        </Link>
                        <p style={{ fontSize: 11, color: '#94a3b8' }}>{u.uploaderEmail}</p>
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
