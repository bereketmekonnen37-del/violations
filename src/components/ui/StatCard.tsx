import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  delta?: string;
  icon?: LucideIcon;
}

export const StatCard = ({ label, value, delta, icon: Icon }: Props) => {
  return (
    <div className="surface rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-ink-900 dark:text-white">
            {value}
          </p>
        </div>
        {Icon && (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
            <Icon size={18} />
          </span>
        )}
      </div>
      {delta && (
        <p className="mt-3 text-xs text-ink-500 dark:text-ink-400">{delta}</p>
      )}
    </div>
  );
};
