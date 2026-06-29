import { Filter, X } from 'lucide-react';
import type { ContinuousFilters as Filters } from './useUnfilteredContinuousData';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  onReset: () => void;
  activeCount: number;
  matchedRows: number;
  totalRows: number;
}

export const ContinuousFilters = ({
  filters,
  onChange,
  onReset,
  activeCount,
  matchedRows,
  totalRows,
}: Props) => {
  const patch = (p: Partial<Filters>) => onChange({ ...filters, ...p });
  return (
    <div className="surface rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
          <Filter size={13} /> {activeCount} filter{activeCount === 1 ? '' : 's'} active
          <span aria-hidden>·</span>
          {matchedRows.toLocaleString()} / {totalRows.toLocaleString()} trips
        </div>
        {activeCount > 0 && (
          <button onClick={onReset} className="btn-ghost !py-1 !px-2 text-xs">
            <X size={12} /> Clear all
          </button>
        )}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Driver name (fuzzy)">
          <input
            value={filters.driver}
            onChange={(e) => patch({ driver: e.target.value })}
            placeholder="e.g. Biniyam"
            className="input-base !py-2"
          />
        </Field>
        <Field label="VID">
          <input
            value={filters.vid}
            onChange={(e) => patch({ vid: e.target.value })}
            placeholder="e.g. 2549"
            className="input-base !py-2"
          />
        </Field>
        <Field label="Transporter (fuzzy)">
          <input
            value={filters.transporter}
            onChange={(e) => patch({ transporter: e.target.value })}
            placeholder="e.g. 3-49646"
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
        <Field label="Position (2-word tolerance)">
          <input
            value={filters.position}
            onChange={(e) => patch({ position: e.target.value })}
            placeholder="e.g. Djibouti Mile"
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
