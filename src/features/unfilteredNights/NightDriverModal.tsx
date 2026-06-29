import { useEffect, useState } from 'react';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Compass,
  IdCard,
  Map,
  Route,
  Timer,
  Truck,
  X,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import type { AggregatedNightDriver } from './useUnfilteredNightsData';

interface Props {
  driver: AggregatedNightDriver | null;
  onClose: () => void;
}

export const NightDriverModal = ({ driver, onClose }: Props) => {
  const [index, setIndex] = useState(0);

  useEffect(() => setIndex(0), [driver?.blockId]);

  useEffect(() => {
    if (!driver) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight')
        setIndex((i) => Math.min(driver.rows.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [driver, onClose]);

  if (!driver) return null;
  const total = driver.rows.length;
  const row = driver.rows[index];

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink-950/60 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-6 sm:py-10"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="surface flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-ink-100 p-5 dark:border-ink-800 sm:p-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
              Unauthorized travel — driver review
            </p>
            <h2 className="mt-1 truncate font-display text-xl font-semibold tracking-tight text-ink-900 dark:text-white sm:text-2xl">
              {driver.driverName || 'Unknown driver'}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
              <span className="inline-flex items-center gap-1.5">
                <IdCard size={12} /> VID {driver.vid || '—'}
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarRange size={12} /> {driver.period || '—'}
              </span>
              {driver.transporter && (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Truck size={12} /> {driver.transporter}
                  </span>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost h-9 w-9 p-0" aria-label="Close">
            <X size={16} />
          </button>
        </header>

        {total === 0 ? (
          <div className="p-8 text-center text-sm text-ink-500 dark:text-ink-400">
            Nothing has been found for this driver in the report.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3 dark:border-ink-800 sm:px-6">
              <Badge tone="neutral">
                Night {index + 1} / {total}
              </Badge>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={index === 0}
                  className="btn-secondary !px-3"
                >
                  <ChevronLeft size={15} /> Prev
                </button>
                <button
                  onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
                  disabled={index >= total - 1}
                  className="btn-secondary !px-3"
                >
                  Next <ChevronRight size={15} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-5 sm:p-6">
              <article className="rounded-2xl border border-ink-100 p-5 dark:border-ink-800 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4 dark:border-ink-800 dark:bg-ink-900">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                      Time A
                    </p>
                    <p className="mt-1.5 font-mono text-sm font-semibold text-ink-900 dark:text-white">
                      {row.timeA || '—'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4 dark:border-ink-800 dark:bg-ink-900">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                      Time B
                    </p>
                    <p className="mt-1.5 font-mono text-sm font-semibold text-ink-900 dark:text-white">
                      {row.timeB || '—'}
                    </p>
                  </div>
                </div>

                {/* Highlighted position strip */}
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-ink-900/10 bg-ink-900 px-4 py-3.5 text-white dark:border-white/10 dark:bg-white dark:text-ink-900">
                  <Map size={16} className="mt-0.5 shrink-0" />
                  <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
                        Position A
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold">
                        {row.positionA || '—'}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
                        Position B
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold">
                        {row.positionB || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4 dark:border-ink-800 dark:bg-ink-900">
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                      <Timer size={12} /> Duration
                    </p>
                    <p className="mt-1.5 text-lg font-semibold tracking-tight text-ink-900 dark:text-white">
                      {row.duration || '—'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4 dark:border-ink-800 dark:bg-ink-900">
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                      <Route size={12} /> Length
                    </p>
                    <p className="mt-1.5 text-lg font-semibold tracking-tight text-ink-900 dark:text-white">
                      {row.length || '—'}
                    </p>
                  </div>
                </div>

                {(row.positionA || row.positionB) && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-ink-100 bg-white p-3 text-xs dark:border-ink-800 dark:bg-ink-900">
                    <Compass size={13} className="text-ink-400" />
                    <span className="text-ink-600 dark:text-ink-300">
                      {row.positionA || '—'} → {row.positionB || '—'}
                    </span>
                  </div>
                )}
              </article>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
