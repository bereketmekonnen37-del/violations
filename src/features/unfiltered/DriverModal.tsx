import { useEffect, useState } from 'react';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Gauge,
  IdCard,
  MapPin,
  Navigation,
  Radio,
  Timer,
  Truck,
  X,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import type { AggregatedDriver } from './useUnfilteredData';

interface Props {
  driver: AggregatedDriver | null;
  onClose: () => void;
}

const linkForCoords = (coords: string): string | null => {
  const m = coords.match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  return `https://www.openstreetmap.org/?mlat=${m[1]}&mlon=${m[2]}#map=15/${m[1]}/${m[2]}`;
};

export const DriverModal = ({ driver, onClose }: Props) => {
  const [index, setIndex] = useState(0);

  useEffect(() => setIndex(0), [driver?.blockId]);

  useEffect(() => {
    if (!driver) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight')
        setIndex((i) => Math.min(driver.events.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [driver, onClose]);

  if (!driver) return null;
  const total = driver.events.length;
  const event = driver.events[index];
  const mapUrl = event?.gpsCoords ? linkForCoords(event.gpsCoords) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center px-3 py-4 backdrop-blur-sm sm:items-center sm:px-6 sm:py-10"
      style={{ background: 'rgba(15, 20, 40, 0.55)' }}
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-base flex max-h-full w-full max-w-3xl flex-col overflow-hidden"
      >
        <header
          className="flex items-start justify-between gap-3 p-5 sm:p-6"
          style={{
            background: 'var(--color-brand-blue-soft)',
            borderBottom: '1px solid var(--color-brand-blue-line)',
          }}
        >
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--color-brand-accent)' }}
            >
              Driver review
            </p>
            <h2
              className="mt-1 truncate font-display text-xl font-semibold tracking-tight sm:text-2xl"
              style={{ color: 'var(--color-brand-blue-dark)' }}
            >
              {driver.matchedDriverName || driver.driverName || 'Unknown driver'}
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
            No overspeed events for this driver.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3 dark:border-ink-800 sm:px-6">
              <Badge tone="neutral">
                Event {index + 1} / {total}
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
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{event.eventType || 'Overspeed'}</Badge>
                  <Badge tone={event.gpsCoords ? 'success' : 'warning'}>
                    <Radio size={11} /> {event.gpsCoords ? 'GPS Present' : 'GPS Missing'}
                  </Badge>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4 dark:border-ink-800 dark:bg-ink-900">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                      Start
                    </p>
                    <p className="mt-1.5 font-mono text-sm font-semibold text-ink-900 dark:text-white">
                      {event.start || '—'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4 dark:border-ink-800 dark:bg-ink-900">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                      End
                    </p>
                    <p className="mt-1.5 font-mono text-sm font-semibold text-ink-900 dark:text-white">
                      {event.end || '—'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4 dark:border-ink-800 dark:bg-ink-900">
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                      <Timer size={12} /> Duration
                    </p>
                    <p className="mt-1.5 text-lg font-semibold tracking-tight text-ink-900 dark:text-white">
                      {event.duration || '—'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4 dark:border-ink-800 dark:bg-ink-900">
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                      <Gauge size={12} /> Top speed
                    </p>
                    <p className="mt-1.5 text-lg font-semibold tracking-tight text-ink-900 dark:text-white">
                      {event.topSpeed || '—'}
                    </p>
                  </div>
                </div>

                <div
                  className="mt-4 flex items-start gap-3 rounded-2xl px-4 py-3.5"
                  style={{
                    background: 'var(--color-brand-blue)',
                    color: '#ffffff',
                  }}
                >
                  <MapPin size={16} className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                      style={{ color: 'var(--color-brand-accent)' }}
                    >
                      Overspeed position
                    </p>
                    <p className="mt-0.5 break-words text-sm font-semibold">
                      {event.overspeedPosition || event.location || 'Unspecified location'}
                    </p>
                  </div>
                </div>

                {event.gpsCoords && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white p-3 text-xs dark:border-ink-800 dark:bg-ink-900">
                    <div className="flex items-center gap-2">
                      <Navigation size={13} className="text-ink-400" />
                      <span className="font-mono text-ink-700 dark:text-ink-200">
                        {event.gpsCoords}
                      </span>
                    </div>
                    {mapUrl && (
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost !px-2 !py-1 text-xs"
                      >
                        Open map
                      </a>
                    )}
                  </div>
                )}

                {event.remarks && (
                  <div className="mt-3 rounded-xl border border-ink-100 p-4 text-sm leading-relaxed text-ink-600 dark:border-ink-800 dark:text-ink-300">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
                      Remarks
                    </p>
                    {event.remarks}
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
