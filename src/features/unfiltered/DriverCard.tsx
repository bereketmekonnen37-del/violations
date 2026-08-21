import { AlertOctagon, ArrowRight, CalendarRange, IdCard, Truck, User } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import type { AggregatedDriver } from './useUnfilteredData';

interface Props {
  driver: AggregatedDriver;
  onOpen: () => void;
}

const severity = (count: number) => {
  if (count >= 10) return 'danger' as const;
  if (count >= 5) return 'warning' as const;
  return 'neutral' as const;
};

export const DriverCard = ({ driver, onOpen }: Props) => {
  const count = driver.events.length;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="card-base group flex w-full flex-col p-5 text-left transition hover:-translate-y-0.5 hover:shadow-elev"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
            style={{
              background: 'var(--color-brand-blue-soft)',
              color: 'var(--color-brand-blue)',
              border: '1px solid var(--color-brand-blue-line)',
            }}
          >
            <User size={18} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight text-ink-900 dark:text-white">
              {driver.matchedDriverName || driver.driverName || 'Unknown driver'}
            </p>
            <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
              {driver.fileTitle}
            </p>
          </div>
        </div>
        <Badge tone={severity(count)}>
          <AlertOctagon size={11} /> {count}× event{count === 1 ? '' : 's'}
        </Badge>
      </div>

      <dl className="mt-5 space-y-2.5 text-xs">
        <div className="flex items-center gap-2">
          <IdCard size={13} className="text-ink-400" />
          <dt className="w-20 text-ink-500 dark:text-ink-400">VID</dt>
          <dd className="font-mono font-semibold text-ink-900 dark:text-white">
            {driver.vid || '—'}
          </dd>
        </div>
        <div className="flex items-start gap-2">
          <CalendarRange size={13} className="mt-0.5 text-ink-400" />
          <dt className="w-20 shrink-0 text-ink-500 dark:text-ink-400">Period</dt>
          <dd className="break-words text-ink-900 dark:text-white">
            {driver.period || '—'}
          </dd>
        </div>
        {driver.transporter && (
          <div className="flex items-center gap-2">
            <Truck size={13} className="text-ink-400" />
            <dt className="w-20 text-ink-500 dark:text-ink-400">Carrier</dt>
            <dd className="text-ink-900 dark:text-white">{driver.transporter}</dd>
          </div>
        )}
      </dl>

      <div
        className="mt-5 flex items-center justify-between pt-4 text-sm font-semibold"
        style={{
          borderTop: '1px solid var(--color-brand-blue-line)',
          color: 'var(--color-brand-accent)',
        }}
      >
        <span>Open all events</span>
        <ArrowRight size={16} className="transition group-hover:translate-x-1" />
      </div>
    </button>
  );
};
