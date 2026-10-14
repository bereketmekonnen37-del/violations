import { useEffect, useState } from 'react';
import { Database, FileText, Image as ImageIcon, Users } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import {
  Card,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
} from '../../features/adminDashboard/adminUi';

interface TableStat {
  table: string;
  label: string;
  icon: React.ReactNode;
  accent: string;
  count: number | null;
  error?: string;
}

const TARGET_TABLES = [
  { table: 'profiles', label: 'User profiles', icon: <Users size={16} />, accent: '#3e55a5' },
  { table: 'upload_batches', label: 'Upload batches (speed/night/continuous)', icon: <FileText size={16} />, accent: '#059669' },
  { table: 'violation_files', label: 'Violation files', icon: <FileText size={16} />, accent: '#dc2626' },
  { table: 'driver_blocks', label: 'Driver blocks', icon: <Database size={16} />, accent: '#f48221' },
  { table: 'speed_events', label: 'Speed events', icon: <Database size={16} />, accent: '#f48221' },
  { table: 'night_rows', label: 'Night rows', icon: <Database size={16} />, accent: '#7c3aed' },
  { table: 'continuous_rows', label: 'Continuous rows', icon: <Database size={16} />, accent: '#0891b2' },
  { table: 'violation_records', label: 'Violation records', icon: <Database size={16} />, accent: '#dc2626' },
  { table: 'master_fleet_snapshots', label: 'Saved snapshots', icon: <ImageIcon size={16} />, accent: '#7c3aed' },
  { table: 'tasks', label: 'Tasks', icon: <FileText size={16} />, accent: '#059669' },
  { table: 'app_rules', label: 'App rules', icon: <FileText size={16} />, accent: '#3e55a5' },
];

export const AdminDataHealthPage = () => {
  const [stats, setStats] = useState<TableStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all(
      TARGET_TABLES.map(async (t) => {
        const { count, error: err } = await supabase
          .from(t.table)
          .select('*', { count: 'exact', head: true });
        return { ...t, count: count ?? 0, error: err?.message } as TableStat;
      }),
    )
      .then((rows) => {
        if (!cancelled) {
          setStats(rows);
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

  return (
    <>
      <PageHeader
        title="Data health"
        subtitle="Row counts across every table the app depends on. Missing tables show as errors."
      />

      {loading ? (
        <LoadingBlock text="Counting rows…" />
      ) : error ? (
        <ErrorBlock error={error} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {stats.map((s) => (
            <Card key={s.table} style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: s.accent + '18',
                    color: s.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {s.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{s.label}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{s.table}</p>
                </div>
              </div>
              {s.error ? (
                <p style={{ fontSize: 11.5, color: '#dc2626', background: '#fff5f5', padding: '8px 10px', borderRadius: 8, border: '1px solid #fee2e2' }}>
                  {s.error}
                </p>
              ) : (
                <p style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', marginTop: 4 }}>
                  {s.count?.toLocaleString() ?? '—'}
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginLeft: 6 }}>rows</span>
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
};
