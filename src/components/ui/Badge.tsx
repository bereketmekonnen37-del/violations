import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface Props {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'info';
  className?: string;
}

const tones: Record<NonNullable<Props['tone']>, string> = {
  neutral:
    'bg-ink-100 text-ink-700 border-ink-200 dark:bg-ink-800 dark:text-ink-200 dark:border-ink-700',
  success:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  danger:
    'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
  warning:
    'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900',
  info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
};

export const Badge = ({ children, tone = 'neutral', className = '' }: Props) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
};
