import { AlertOctagon, Filter, Search, X } from 'lucide-react';
import type { ViolationFilters } from './useViolationFilters';

interface Props {
  filters: ViolationFilters;
  onChange: (filters: ViolationFilters) => void;
  onReset: () => void;
  eventTypes: string[];
  activeCount: number;
  total: number;
  matched: number;
  maxViolations: number;
}

export const ViolationFilterBar = ({
  filters,
  onChange,
  onReset,
  eventTypes,
  activeCount,
  total,
  matched,
  maxViolations,
}: Props) => {
  const patch = (p: Partial<ViolationFilters>) => onChange({ ...filters, ...p });
  const sliderMax = Math.max(1, maxViolations);

  return (
    <div className="surface rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-2.5 text-ink-400"
          />
          <input
            value={filters.query}
            onChange={(e) => patch({ query: e.target.value })}
            placeholder="Search driver, location, transporter…"
            className="input-base !py-2 pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
          <span className="inline-flex items-center gap-1.5">
            <Filter size={13} /> {activeCount} active
          </span>
          <span aria-hidden>·</span>
          <span>
            {matched.toLocaleString()} / {total.toLocaleString()} records
          </span>
          {activeCount > 0 && (
            <button onClick={onReset} className="btn-ghost !py-1 !px-2 text-xs">
              <X size={12} /> Clear all
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Driver name (fuzzy)">
          <input
            value={filters.driverName}
            onChange={(e) => patch({ driverName: e.target.value })}
            placeholder="e.g. Aron"
            className="input-base !py-2"
          />
        </Field>
        <Field label="Vehicle ID">
          <input
            value={filters.vid}
            onChange={(e) => patch({ vid: e.target.value })}
            placeholder="e.g. T-2245"
            className="input-base !py-2"
          />
        </Field>
        <Field label="Date">
          <input
            value={filters.date}
            onChange={(e) => patch({ date: e.target.value })}
            placeholder="e.g. 2024-07-12"
            className="input-base !py-2"
          />
        </Field>
        <Field label="Event type">
          <select
            value={filters.eventType}
            onChange={(e) => patch({ eventType: e.target.value })}
            className="input-base !py-2"
          >
            <option value="">All events</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="GPS functionality">
          <select
            value={filters.gps}
            onChange={(e) =>
              patch({ gps: e.target.value as ViolationFilters['gps'] })
            }
            className="input-base !py-2"
          >
            <option value="all">Any status</option>
            <option value="on">GPS active</option>
            <option value="off">GPS fault</option>
            <option value="unknown">Unknown</option>
          </select>
        </Field>
        <Field label="Location (fuzzy)">
          <input
            value={filters.location}
            onChange={(e) => patch({ location: e.target.value })}
            placeholder="Partial words OK"
            className="input-base !py-2"
          />
        </Field>
        <Field label="Transporter (fuzzy)">
          <input
            value={filters.transporter}
            onChange={(e) => patch({ transporter: e.target.value })}
            placeholder="e.g. Acme"
            className="input-base !py-2"
          />
        </Field>
        <Field
          label={
            <span className="inline-flex items-center gap-1.5">
              <AlertOctagon size={11} /> Min violations per driver
            </span>
          }
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={sliderMax}
              value={Math.min(filters.minViolations, sliderMax)}
              onChange={(e) =>
                patch({ minViolations: Math.max(1, Number(e.target.value) || 1) })
              }
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-200 accent-red-600 dark:bg-ink-700"
            />
            <span
              className="inline-flex h-8 min-w-[44px] items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
              title="Show drivers with at least this many violations"
            >
              ≥ {Math.min(filters.minViolations, sliderMax)}
            </span>
          </div>
        </Field>
      </div>
    </div>
  );
};

const Field = ({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
      {label}
    </span>
    <div className="mt-1.5">{children}</div>
  </label>
);
