import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  delta?: string;
  icon?: LucideIcon;
  /** Highlight the metric with the orange accent instead of blue. */
  accent?: boolean;
}

export const StatCard = ({ label, value, delta, icon: Icon, accent }: Props) => {
  return (
    <div className="card-base p-5">
      <div className="flex items-start justify-between">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-brand-blue)' }}
          >
            {label}
          </p>
          <p
            className="mt-2 text-3xl font-semibold tracking-tight"
            style={{
              color: accent
                ? 'var(--color-brand-accent-dark)'
                : 'var(--color-brand-blue-dark)',
            }}
          >
            {value}
          </p>
        </div>
        {Icon && (
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: accent
                ? 'var(--color-brand-accent-soft)'
                : 'var(--color-brand-blue-soft)',
              color: accent
                ? 'var(--color-brand-accent-dark)'
                : 'var(--color-brand-blue)',
              border: `1px solid ${accent ? 'var(--color-brand-accent-line)' : 'var(--color-brand-blue-line)'}`,
            }}
          >
            <Icon size={18} />
          </span>
        )}
      </div>
      {delta && (
        <p className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {delta}
        </p>
      )}
    </div>
  );
};
