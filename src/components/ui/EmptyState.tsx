import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = ({ icon: Icon, title, description, action }: Props) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center dark:border-ink-800 dark:bg-ink-900">
      {Icon && (
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
          <Icon size={20} />
        </div>
      )}
      <h3 className="text-base font-semibold text-ink-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-ink-500 dark:text-ink-400">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
