import { ArrowRight, CalendarRange, IdCard, Route, Truck, User } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import type { AggregatedContinuousDriver } from './useUnfilteredContinuousData';

interface Props {
  driver: AggregatedContinuousDriver;
  onOpen: () => void;
}

const severity = (count: number) => {
  if (count >= 10) return 'danger' as const;
  if (count >= 5) return 'warning' as const;
  return 'neutral' as const;
};

export const ContinuousDriverCard = ({ driver, onOpen }: Props) => {
  const count = driver.rows.length;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="surface group flex w-full flex-col rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:shadow-elev"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
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
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone={severity(count)}>
            <Route size={11} /> {count} trip{count === 1 ? '' : 's'}
          </Badge>
          <Badge tone="neutral">{(driver.source ?? 'mela').toUpperCase()}</Badge>
        </div>
      </div>

      <dl className="mt-5 space-y-2.5 text-xs">
        <div className="flex items-center gap-2">
          <IdCard size={13} className="text-ink-400" />
          <dt className="w-20 text-ink-500 dark:text-ink-400">VID</dt>
          <dd className="font-mono font-semibold text-ink-900 dark:text-white">
            {driver.vid || '—'}
          </dd>
        </div>
        {driver.plate && (
          <div className="flex items-center gap-2">
            <IdCard size={13} className="text-ink-400" />
            <dt className="w-20 text-ink-500 dark:text-ink-400">Plate</dt>
            <dd className="font-mono text-ink-900 dark:text-white">
              {driver.plate}
            </dd>
          </div>
        )}
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

      <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4 text-sm font-medium text-ink-700 dark:border-ink-800 dark:text-ink-300">
        <span>Open all trips</span>
        <ArrowRight size={16} className="transition group-hover:translate-x-1" />
      </div>
    </button>
  );
};
