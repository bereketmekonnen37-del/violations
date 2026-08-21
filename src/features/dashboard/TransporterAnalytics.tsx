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
      <div className="card-base p-5 sm:p-7">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: 'var(--color-brand-blue)',
                color: '#ffffff',
              }}
            >
              <Truck size={18} />
            </span>
            <div>
              <h2
                className="text-lg font-semibold tracking-tight"
                style={{ color: 'var(--color-brand-blue-dark)' }}
              >
                Transporter analytics
              </h2>
              <p
                className="text-sm"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Violations grouped by transporter — highest total on top. Click any card to see every event one by one.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className="rounded-full px-2.5 py-1 font-semibold"
              style={{
                background: 'var(--color-brand-accent-soft)',
                color: 'var(--color-brand-accent-dark)',
                border: '1px solid var(--color-brand-accent-line)',
              }}
            >
              {totals.speed} speed
            </span>
            <span
              className="rounded-full px-2.5 py-1 font-semibold"
              style={{
                background: 'var(--color-brand-blue-soft)',
                color: 'var(--color-brand-blue-dark)',
                border: '1px solid var(--color-brand-blue-line)',
              }}
            >
              {totals.nights} nights
            </span>
            <span
              className="rounded-full px-2.5 py-1 font-semibold"
              style={{
                background: 'var(--color-brand-blue-soft)',
                color: 'var(--color-brand-blue-dark)',
                border: '1px solid var(--color-brand-blue-line)',
              }}
            >
              {totals.continuous} continuous
            </span>
            <span
              className="rounded-full px-2.5 py-1 font-semibold"
              style={{
                background: 'var(--color-brand-blue)',
                color: '#ffffff',
              }}
            >
              {totals.total} total
            </span>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Showing {filtered.length} of {rows.length} transporters · {withData} have data
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label
              className="inline-flex items-center gap-2 text-xs font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <input
                type="checkbox"
                checked={onlyWithData}
                onChange={(e) => setOnlyWithData(e.target.checked)}
                className="h-3.5 w-3.5"
                style={{ accentColor: 'var(--color-brand-blue)' }}
              />
              Only with violations
            </label>
            <div className="relative sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-brand-blue)' }}
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
          <p
            className="rounded-xl px-4 py-8 text-center text-sm"
            style={{
              background: 'var(--color-brand-blue-soft)',
              border: '1px dashed var(--color-brand-blue-line)',
              color: 'var(--color-text-muted)',
            }}
          >
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
      className="group relative overflow-hidden rounded-2xl p-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-elev"
      style={{
        background: '#ffffff',
        border: `1px solid ${highlighted ? 'var(--color-brand-accent-line)' : 'var(--color-brand-blue-line)'}`,
      }}
    >
      {highlighted && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1"
          style={{ background: 'var(--color-brand-accent)' }}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{
              color: highlighted
                ? 'var(--color-brand-accent)'
                : 'var(--color-brand-blue)',
            }}
          >
            #{rank} · {empty ? 'No data' : 'Transporter'}
          </p>
          <h3
            className="mt-0.5 truncate font-display text-base font-semibold tracking-tight"
            style={{ color: 'var(--color-brand-blue-dark)' }}
          >
            {row.name || 'Unknown'}
          </h3>
          <p
            className="mt-0.5 text-[11px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {row.vidCount} VID{row.vidCount === 1 ? '' : 's'} seen
          </p>
        </div>
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: 'var(--color-brand-blue)',
            color: '#ffffff',
          }}
        >
          <Truck size={14} />
        </span>
      </div>

      {empty ? (
        <p
          className="mt-4 rounded-lg px-3 py-3 text-center text-xs italic"
          style={{
            background: 'var(--color-brand-blue-soft)',
            color: 'var(--color-text-muted)',
          }}
        >
          No data found
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <StatChip
            label="Speed"
            value={row.speed}
            icon={Gauge}
            bg="var(--color-brand-accent-soft)"
            border="var(--color-brand-accent-line)"
            color="var(--color-brand-accent-dark)"
          />
          <StatChip
            label="Nights"
            value={row.nights}
            icon={Moon}
            bg="var(--color-brand-blue-soft)"
            border="var(--color-brand-blue-line)"
            color="var(--color-brand-blue-dark)"
          />
          <StatChip
            label="Cont."
            value={row.continuous}
            icon={RouteIcon}
            bg="var(--color-brand-blue-soft)"
            border="var(--color-brand-blue-line)"
            color="var(--color-brand-blue-dark)"
          />
        </div>
      )}

      <div
        className="mt-3 flex items-center justify-between pt-3 text-[11px] font-medium"
        style={{
          borderTop: '1px solid var(--color-brand-blue-line)',
          color: 'var(--color-text-muted)',
        }}
      >
        <span>
          {empty ? (
            'Awaiting uploads'
          ) : (
            <>
              <span
                className="font-semibold"
                style={{ color: 'var(--color-brand-blue-dark)' }}
              >
                {row.total}
              </span>{' '}
              total violations
            </>
          )}
        </span>
        <span
          className="inline-flex items-center gap-1 font-semibold"
          style={{ color: 'var(--color-brand-accent)' }}
        >
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
  bg: string;
  border: string;
  color: string;
}

const StatChip = ({ label, value, icon: Icon, bg, border, color }: ChipProps) => (
  <div
    className="rounded-xl p-2"
    style={{ background: bg, border: `1px solid ${border}` }}
  >
    <p
      className="inline-flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider"
      style={{ color }}
    >
      <Icon size={10} /> {label}
    </p>
    <p
      className="mt-0.5 text-base font-semibold"
      style={{ color: 'var(--color-brand-blue-dark)' }}
    >
      {value}
    </p>
  </div>
);
