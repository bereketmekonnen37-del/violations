import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Gauge,
  Moon,
  Route as RouteIcon,
  Search,
  Truck,
} from 'lucide-react';
import {
  encodeTransporterSlug,
  type TransporterAnalyticsRow,
} from '../../lib/transporterAnalytics';

interface Props {
  rows: TransporterAnalyticsRow[];
}

export const TransporterAnalytics = ({ rows }: Props) => {
  const [query, setQuery] = useState('');
  const [onlyWithData, setOnlyWithData] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyWithData && r.total === 0) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q);
    });
  }, [rows, query, onlyWithData]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.speed += r.speed;
          acc.nights += r.nights;
          acc.continuous += r.continuous;
          acc.total += r.total;
          return acc;
        },
        { speed: 0, nights: 0, continuous: 0, total: 0 },
      ),
    [rows],
  );

  const withData = rows.filter((r) => r.total > 0).length;

  return (
    <section className="mt-10">
      <div className="surface rounded-2xl p-5 sm:p-7">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-white dark:bg-white dark:text-ink-900">
              <Truck size={18} />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-ink-900 dark:text-white">
                Transporter analytics
              </h2>
              <p className="text-sm text-ink-500 dark:text-ink-400">
                Violations grouped by transporter — highest total on top. Click any card to see every event one by one.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800">
              {totals.speed} speed
            </span>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-800">
              {totals.nights} nights
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800">
              {totals.continuous} continuous
            </span>
            <span className="rounded-full bg-ink-900 px-2.5 py-1 font-semibold text-white dark:bg-white dark:text-ink-900">
              {totals.total} total
            </span>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-500 dark:text-ink-400">
            Showing {filtered.length} of {rows.length} transporters · {withData} have data
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-ink-600 dark:text-ink-300">
              <input
                type="checkbox"
                checked={onlyWithData}
                onChange={(e) => setOnlyWithData(e.target.checked)}
                className="h-3.5 w-3.5 accent-red-600"
              />
              Only with violations
            </label>
            <div className="relative sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search transporter"
                className="input-base !pl-9"
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-8 text-center text-sm text-ink-500 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-400">
            No transporters match your filters.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((row, idx) => {
              const rank = rows.indexOf(row) + 1;
              return (
                <TransporterCard key={row.name} row={row} rank={rank} highlighted={idx < 3 && row.total > 0} />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

interface CardProps {
  row: TransporterAnalyticsRow;
  rank: number;
  highlighted: boolean;
}

const TransporterCard = ({ row, rank, highlighted }: CardProps) => {
  const empty = row.total === 0;
  return (
    <Link
      to={`/transporters/${encodeTransporterSlug(row.name)}`}
      className={
        'group relative overflow-hidden rounded-2xl border p-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-elev ' +
        (highlighted
          ? 'border-red-200 bg-white dark:border-red-900/60 dark:bg-ink-900'
          : 'border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900')
      }
    >
      {highlighted && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1 bg-red-500"
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
            #{rank} · {empty ? 'No data' : 'Transporter'}
          </p>
          <h3 className="mt-0.5 truncate font-display text-base font-semibold tracking-tight text-ink-900 dark:text-white">
            {row.name || 'Unknown'}
          </h3>
          <p className="mt-0.5 text-[11px] text-ink-500 dark:text-ink-400">
            {row.vidCount} VID{row.vidCount === 1 ? '' : 's'} seen
          </p>
        </div>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-white dark:bg-white dark:text-ink-900">
          <Truck size={14} />
        </span>
      </div>

      {empty ? (
        <p className="mt-4 rounded-lg bg-ink-50 px-3 py-3 text-center text-xs italic text-ink-500 dark:bg-ink-800 dark:text-ink-400">
          No data found
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <StatChip
            label="Speed"
            value={row.speed}
            icon={Gauge}
            tone="text-red-700 dark:text-red-300"
          />
          <StatChip
            label="Nights"
            value={row.nights}
            icon={Moon}
            tone="text-indigo-700 dark:text-indigo-300"
          />
          <StatChip
            label="Cont."
            value={row.continuous}
            icon={RouteIcon}
            tone="text-amber-700 dark:text-amber-300"
          />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3 text-[11px] font-medium text-ink-500 dark:border-ink-800 dark:text-ink-400">
        <span>
          {empty ? (
            'Awaiting uploads'
          ) : (
            <>
              <span className="font-semibold text-ink-900 dark:text-white">{row.total}</span>{' '}
              total violations
            </>
          )}
        </span>
        <span className="inline-flex items-center gap-1 text-ink-700 group-hover:text-ink-900 dark:text-ink-300 dark:group-hover:text-white">
          Details <ArrowRight size={12} />
        </span>
      </div>
    </Link>
  );
};

interface ChipProps {
  label: string;
  value: number;
  icon: typeof Gauge;
  tone: string;
}

const StatChip = ({ label, value, icon: Icon, tone }: ChipProps) => (
  <div className="rounded-xl border border-ink-100 bg-white/80 p-2 dark:border-ink-800 dark:bg-ink-900/70">
    <p
      className={
        'inline-flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider ' +
        tone
      }
    >
      <Icon size={10} /> {label}
    </p>
    <p className="mt-0.5 text-base font-semibold text-ink-900 dark:text-white">
      {value}
    </p>
  </div>
);
