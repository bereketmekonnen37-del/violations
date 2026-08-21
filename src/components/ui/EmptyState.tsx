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
    <div
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center"
      style={{
        borderColor: 'var(--color-brand-blue-line)',
        background: '#ffffff',
      }}
    >
      {Icon && (
        <div
          className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl"
          style={{
            background: 'var(--color-brand-blue-soft)',
            color: 'var(--color-brand-blue)',
            border: '1px solid var(--color-brand-blue-line)',
          }}
        >
          <Icon size={20} />
        </div>
      )}
      <h3
        className="text-base font-semibold"
        style={{ color: 'var(--color-brand-blue-dark)' }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="mt-1.5 max-w-md text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
