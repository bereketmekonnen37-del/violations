import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  boss: { label: 'Boss', color: '#3e55a5', bg: 'rgba(62,85,165,0.12)' },
  staff: { label: 'Staff', color: '#059669', bg: 'rgba(5,150,105,0.10)' },
  superadmin: { label: 'Superadmin', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
};

export const KIND_META: Record<string, { label: string; color: string }> = {
  speed: { label: 'Speed', color: '#f48221' },
  night: { label: 'Night', color: '#7c3aed' },
  continuous: { label: 'Continuous', color: '#0891b2' },
  violation: { label: 'Violation', color: '#dc2626' },
};

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const fmtRelative = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}yr ago`;
};

export const PageHeader = ({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
      marginBottom: 24,
      flexWrap: 'wrap',
    }}
  >
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1.15 }}>
        {title}
      </h1>
      {subtitle && <p style={{ fontSize: 13.5, color: '#64748b', marginTop: 6 }}>{subtitle}</p>}
    </div>
    {right}
  </div>
);

export const Card = ({ children, style }: { children: ReactNode; style?: React.CSSProperties }) => (
  <div
    style={{
      background: '#fff',
      border: '1px solid #e8ecf8',
      borderRadius: 16,
      boxShadow: '0 2px 12px rgba(62,85,165,0.04)',
      ...style,
    }}
  >
    {children}
  </div>
);

export const MiniStat = ({
  icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  accent: string;
  sub?: string;
}) => (
  <Card style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 11,
        background: accent + '18',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: accent,
      }}
    >
      {icon}
    </div>
    <div>
      <p style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.5px' }}>
        {value}
      </p>
      <p style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</p>}
    </div>
  </Card>
);

export const LoadingBlock = ({ text = 'Loading…' }: { text?: string }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: '60px 20px',
      color: '#64748b',
      fontSize: 14,
    }}
  >
    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
    {text}
  </div>
);

export const ErrorBlock = ({ error, onRetry }: { error: string; onRetry?: () => void }) => (
  <div style={{ padding: '60px 20px', textAlign: 'center' }}>
    <p style={{ fontWeight: 600, color: '#dc2626' }}>Error loading data</p>
    <p style={{ color: '#64748b', marginTop: 4, fontSize: 12 }}>{error}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        style={{
          marginTop: 16,
          padding: '8px 18px',
          borderRadius: 10,
          border: '1px solid #dfe4f2',
          background: '#fff',
          color: '#3e55a5',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    )}
  </div>
);

export const EmptyBlock = ({ text }: { text: string }) => (
  <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>{text}</div>
);

export const Badge = ({
  label,
  color,
  bg,
  icon,
}: {
  label: string;
  color: string;
  bg: string;
  icon?: ReactNode;
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 10px',
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.4px',
      background: bg,
      color,
    }}
  >
    {icon}
    {label}
  </span>
);
