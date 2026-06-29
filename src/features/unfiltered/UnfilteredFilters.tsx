import { Filter, X } from 'lucide-react';
import type { UnfilteredFilters as Filters } from './useUnfilteredData';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  onReset: () => void;
  eventTypes: string[];
  activeCount: number;
  matchedEvents: number;
  totalEvents: number;
}

export const UnfilteredFilters = ({
  filters,
  onChange,
  onReset,
  eventTypes,
  activeCount,
  matchedEvents,
  totalEvents,
}: Props) => {
  const patch = (p: Partial<Filters>) => onChange({ ...filters, ...p });
  return (
    <div className="surface rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
          <Filter size={13} /> {activeCount} filter{activeCount === 1 ? '' : 's'} active
          <span aria-hidden>·</span>
          {matchedEvents.toLocaleString()} / {totalEvents.toLocaleString()} events
        </div>
        {activeCount > 0 && (
          <button onClick={onReset} className="btn-ghost !py-1 !px-2 text-xs">
            <X size={12} /> Clear all
          </button>
        )}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Driver name (fuzzy)">
          <input
            value={filters.driver}
            onChange={(e) => patch({ driver: e.target.value })}
            placeholder="e.g. Yonas"
            className="input-base !py-2"
          />
        </Field>
        <Field label="VID">
          <input
            value={filters.vid}
            onChange={(e) => patch({ vid: e.target.value })}
            placeholder="e.g. 1538"
            className="input-base !py-2"
          />
        </Field>
        <Field label="Date from">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => patch({ dateFrom: e.target.value })}
            className="input-base !py-2"
          />
        </Field>
        <Field label="Date to">
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => patch({ dateTo: e.target.value })}
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
        <Field label="GPS status">
          <select
            value={filters.gps}
            onChange={(e) => patch({ gps: e.target.value as Filters['gps'] })}
            className="input-base !py-2"
          >
            <option value="all">Any status</option>
            <option value="present">GPS present</option>
            <option value="missing">GPS missing</option>
          </select>
        </Field>
        <Field label="Location (2-word tolerance)">
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
            placeholder="e.g. ET-fleet"
            className="input-base !py-2"
          />
        </Field>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
      {label}
    </span>
    <div className="mt-1.5">{children}</div>
  </label>
);
