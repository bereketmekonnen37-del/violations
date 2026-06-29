import {
  AlertOctagon,
  AlertTriangle,
  CalendarDays,
  Gauge,
  Hash,
  IdCard,
  MapPin,
  Radio,
  Timer,
  Truck,
  User,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import type { ViolationRecord } from '../../types';
import { cn, formatDate } from '../../lib/utils';

interface Props {
  record: ViolationRecord;
  index: number;
  driverViolationCount: number;
}

const gpsLabel = (g: ViolationRecord['gpsFunctionality']) => {
  if (g === 'on') return { tone: 'success' as const, label: 'GPS Active' };
  if (g === 'off') return { tone: 'danger' as const, label: 'GPS Fault' };
  return { tone: 'warning' as const, label: 'GPS Unknown' };
};

const severityTone = (count: number) => {
  if (count >= 5)
    return 'border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300';
  if (count >= 3)
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300';
  return 'border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300';
};

export const ViolationCard = ({ record, index, driverViolationCount }: Props) => {
  const gps = gpsLabel(record.gpsFunctionality);
  const isRepeat = driverViolationCount > 1;
  return (
    <article
      className={cn(
        'surface group relative overflow-hidden rounded-2xl p-5 transition hover:shadow-elev sm:p-6',
        isRepeat && 'ring-1 ring-red-200 dark:ring-red-900/60',
      )}
    >
      <div className="absolute right-5 top-5 inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-ink-400">
        <Hash size={12} /> {String(index).padStart(4, '0')}
      </div>

      <header className="flex flex-wrap items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
          <User size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-ink-900 dark:text-white">
              {record.driverName || 'Unknown driver'}
            </h3>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                severityTone(driverViolationCount),
              )}
              title={`This driver has ${driverViolationCount} violation${
                driverViolationCount === 1 ? '' : 's'
              } in this file`}
            >
              <AlertOctagon size={11} />
              {driverViolationCount}× violation{driverViolationCount === 1 ? '' : 's'}
            </span>
            <Badge tone="neutral">
              <IdCard size={11} /> VID {record.vid || '—'}
            </Badge>
            <Badge tone={gps.tone}>
              <Radio size={11} /> {gps.label}
            </Badge>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500 dark:text-ink-400">
            <span className="inline-flex items-center gap-1.5">
              <Truck size={12} /> {record.transporter || '—'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={12} /> {record.date ? formatDate(record.date) : '—'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle size={12} /> {record.eventType || 'Event'}
            </span>
          </div>
        </div>
      </header>

      {/* Highlighted location row */}
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-ink-900/10 bg-ink-900 px-4 py-3.5 text-white dark:border-white/10 dark:bg-white dark:text-ink-900">
        <MapPin size={16} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
            Location
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold">
            {record.location || 'Unspecified location'}
          </p>
        </div>
      </div>

      {/* Info blocks: duration + distance */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-4 dark:border-ink-800 dark:bg-ink-900">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            <Timer size={13} /> Duration
          </div>
          <p className="mt-2 text-xl font-semibold tracking-tight text-ink-900 dark:text-white">
            {record.duration || '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-4 dark:border-ink-800 dark:bg-ink-900">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            <Gauge size={13} /> Speed / Distance
          </div>
          <p className="mt-2 text-xl font-semibold tracking-tight text-ink-900 dark:text-white">
            {record.distanceKmHr || '—'}
          </p>
        </div>
      </div>

      {record.remarks && (
        <div className="mt-4 rounded-2xl border border-ink-100 p-4 text-sm leading-relaxed text-ink-600 dark:border-ink-800 dark:text-ink-300">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
            Remarks
          </p>
          {record.remarks}
        </div>
      )}
    </article>
  );
};
