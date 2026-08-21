import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface Props {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'info' | 'accent';
  className?: string;
}

// Palette-aligned tones. `info` uses brand blue, `accent`/`warning` use the
// brand orange family, and `danger` is the only true-red affordance.
const tones: Record<NonNullable<Props['tone']>, string> = {
  neutral: 'bg-brand-blue-soft text-ink-700 border-brand-blue-line',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-brand-orange-soft text-brand-orange-dark border-brand-orange-line',
  info: 'bg-brand-blue-soft text-brand-blue-dark border-brand-blue-line',
  accent: 'bg-brand-orange-soft text-brand-orange-dark border-brand-orange-line',
};

export const Badge = ({ children, tone = 'neutral', className = '' }: Props) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
};
