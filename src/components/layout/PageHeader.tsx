import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
}

export const PageHeader = ({ title, subtitle, actions, eyebrow }: Props) => {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'var(--color-brand-accent)' }}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl"
          style={{ color: 'var(--color-brand-blue-dark)' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="mt-1.5 max-w-2xl text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
};
