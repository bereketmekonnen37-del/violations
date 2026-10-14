import { useEffect, useState } from 'react';
import { Gauge, MapPin, Moon, Route, Timer } from 'lucide-react';
import { fetchAppRules, type AppRulesPayload } from '../../features/rules/rulesApi';
import {
  Card,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
} from '../../features/adminDashboard/adminUi';

const formatSeconds = (sec: number) => {
  if (!Number.isFinite(sec) || sec <= 0) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
};

const Section = ({
  icon,
  title,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  accent: string;
  children: React.ReactNode;
}) => (
  <Card style={{ padding: '18px 20px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: accent + '18',
          color: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{title}</h2>
    </div>
    {children}
  </Card>
);

const KV = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #eef1fa' }}>
    <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
    <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{value}</span>
  </div>
);

const AllowList = ({ entries }: { entries: Array<{ value?: string; vid?: string; dates: string[] }> }) => {
  if (entries.length === 0)
    return <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No entries.</p>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {entries.map((e, i) => {
        const label = e.vid ?? e.value ?? '';
        return (
          <span
            key={`${label}-${i}`}
            style={{
              padding: '4px 10px',
              borderRadius: 99,
              background: '#eef1fa',
              color: '#3e55a5',
              fontSize: 12,
              fontWeight: 500,
              border: '1px solid #dfe4f2',
            }}
            title={e.dates.length ? `Dates: ${e.dates.join(', ')}` : 'All dates'}
          >
            {label}
            {e.dates.length > 0 && (
              <span style={{ marginLeft: 6, color: '#94a3b8', fontSize: 10 }}>({e.dates.length}d)</span>
            )}
          </span>
        );
      })}
    </div>
  );
};

export const AdminRulesPage = () => {
  const [rules, setRules] = useState<AppRulesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAppRules()
      .then((r) => {
        if (!cancelled) {
          setRules(r);
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

  if (loading) return <LoadingBlock text="Loading rules…" />;
  if (error) return <ErrorBlock error={error} />;
  if (!rules)
    return (
      <>
        <PageHeader title="Boss rules" subtitle="Read-only view of the shared rules the boss has set." />
        <EmptyBlock text="No rules have been saved yet." />
      </>
    );

  return (
    <>
      <PageHeader
        title="Boss rules"
        subtitle="Read-only snapshot of the thresholds, allowlists, and caps controlling what counts as a violation."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 14 }}>
        <Section icon={<Gauge size={16} />} title="Speed threshold" accent="#f48221">
          <KV label="Minimum duration" value={formatSeconds(rules.thresholds.speed)} />
        </Section>
        <Section icon={<Moon size={16} />} title="Night threshold" accent="#7c3aed">
          <KV label="Minimum duration" value={formatSeconds(rules.thresholds.nights)} />
        </Section>
        <Section icon={<Route size={16} />} title="Continuous threshold" accent="#0891b2">
          <KV label="Minimum duration" value={formatSeconds(rules.thresholds.continuous)} />
        </Section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 14 }}>
        <Section icon={<Timer size={16} />} title="Global duration cap" accent="#3e55a5">
          {rules.maxDurationSeconds ? (
            <KV label="Drop events longer than" value={formatSeconds(rules.maxDurationSeconds)} />
          ) : (
            <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No cap configured.</p>
          )}
        </Section>
        <Section icon={<Route size={16} />} title="Underestimated rule (continuous)" accent="#059669">
          {rules.underestimatedRule ? (
            <>
              <KV
                label="Min duration"
                value={formatSeconds(rules.underestimatedRule.minDurationSeconds)}
              />
              <KV label="Max distance" value={`${rules.underestimatedRule.maxKm} km`} />
            </>
          ) : (
            <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Rule disabled.</p>
          )}
        </Section>
      </div>

      <Section icon={<MapPin size={16} />} title="Allowed VIDs" accent="#3e55a5">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {(['speed', 'nights', 'continuous'] as const).map((cat) => (
            <div key={cat}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 8,
                }}
              >
                {cat}
              </p>
              <AllowList entries={rules.allowedVidsByType[cat]} />
            </div>
          ))}
        </div>
      </Section>

      <div style={{ height: 14 }} />

      <Section icon={<MapPin size={16} />} title="Allowed locations" accent="#059669">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {(['speed', 'nights', 'continuous'] as const).map((cat) => (
            <div key={cat}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 8,
                }}
              >
                {cat}
              </p>
              <AllowList entries={rules.allowedLocationsByType[cat]} />
            </div>
          ))}
        </div>
      </Section>
    </>
  );
};
