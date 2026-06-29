import { useMemo, useState } from 'react';
import {
  Crown,
  Download,
  Gauge,
  IdCard,
  Layers,
  Medal,
  Moon,
  Route as RouteIcon,
  Search,
  Trophy,
  Users,
} from 'lucide-react';
import { useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { StatCard } from '../components/ui/StatCard';
import {
  aggregateMasterFleet,
  downloadMasterFleetCsv,
  type MasterFleetRow,
} from '../lib/masterFleet';
import {
  CONTINUOUS_MIN_SECONDS,
  NIGHTS_MIN_SECONDS,
  SPEED_MIN_SECONDS,
} from '../lib/duration';

const formatThreshold = (seconds: number): string => {
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds}s`;
};

const PODIUM_ICONS = [Crown, Trophy, Medal];
const PODIUM_TONES = [
  'from-amber-400/30 to-amber-100/0 text-amber-700 dark:text-amber-300',
  'from-slate-400/30 to-slate-100/0 text-slate-700 dark:text-slate-200',
  'from-orange-500/30 to-orange-100/0 text-orange-700 dark:text-orange-300',
];

const TopOffenderCard = ({
  rank,
  row,
}: {
  rank: number;
  row: MasterFleetRow;
}) => {
  const Icon = PODIUM_ICONS[rank] ?? Medal;
  const tone = PODIUM_TONES[rank] ?? PODIUM_TONES[2];
  return (
    <div
      className={`surface relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${tone}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">
            #{rank + 1} most flagged
          </p>
          <h3 className="mt-1 truncate font-display text-xl font-semibold tracking-tight text-ink-900 dark:text-white">
            {row.driverName || 'Unknown driver'}
          </h3>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-ink-600 dark:text-ink-300">
            <IdCard size={12} /> VID {row.vid}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80 text-ink-700 shadow-card dark:bg-ink-900/70 dark:text-ink-100">
          <Icon size={18} />
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-ink-100 bg-white/80 p-2.5 dark:border-ink-800 dark:bg-ink-900/70">
          <p className="inline-flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            <Moon size={10} /> Nights
          </p>
          <p className="mt-0.5 text-lg font-semibold text-ink-900 dark:text-white">
            {row.nights}
          </p>
        </div>
        <div className="rounded-xl border border-ink-100 bg-white/80 p-2.5 dark:border-ink-800 dark:bg-ink-900/70">
          <p className="inline-flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            <Gauge size={10} /> Speed
          </p>
          <p className="mt-0.5 text-lg font-semibold text-ink-900 dark:text-white">
            {row.speed}
          </p>
        </div>
        <div className="rounded-xl border border-ink-100 bg-white/80 p-2.5 dark:border-ink-800 dark:bg-ink-900/70">
          <p className="inline-flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            <RouteIcon size={10} /> Cont.
          </p>
          <p className="mt-0.5 text-lg font-semibold text-ink-900 dark:text-white">
            {row.continuous}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-ink-900/90 px-4 py-2.5 text-white dark:bg-white dark:text-ink-900">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">
          Combined
        </span>
        <span className="font-display text-2xl font-semibold tracking-tight">
          {row.total}
        </span>
      </div>
    </div>
  );
};

export const MasterFleetPage = () => {
  const speedFiles = useAppSelector((s) => s.unfiltered.files);
  const nightFiles = useAppSelector((s) => s.unfilteredNights.files);
  const continuousFiles = useAppSelector((s) => s.unfilteredContinuous.files);
  const driverRecords = useAppSelector((s) => s.drivers.records);
  const [query, setQuery] = useState('');

  const rows = useMemo(
    () =>
      aggregateMasterFleet({
        speedFiles,
        nightFiles,
        continuousFiles,
        driverRecords,
      }),
    [speedFiles, nightFiles, continuousFiles, driverRecords],
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.nights += r.nights;
          acc.speed += r.speed;
          acc.continuous += r.continuous;
          return acc;
        },
        { nights: 0, speed: 0, continuous: 0 },
      ),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.vid.toLowerCase().includes(q) ||
        r.driverName.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const top3 = rows.slice(0, 3);
  const noUploads =
    speedFiles.length === 0 &&
    nightFiles.length === 0 &&
    continuousFiles.length === 0;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        eyebrow="Manager workspace"
        title="Master fleet"
        subtitle={`Combined ranking by VID across Speed (≥ ${formatThreshold(
          SPEED_MIN_SECONDS,
        )}), Nights (≥ ${formatThreshold(
          NIGHTS_MIN_SECONDS,
        )}) and Continuous (≥ ${formatThreshold(
          CONTINUOUS_MIN_SECONDS,
        )}). Shorter events are filtered out.`}
        actions={
          <button
            type="button"
            onClick={() => downloadMasterFleetCsv(rows)}
            disabled={rows.length === 0}
            className="btn-primary"
          >
            <Download size={16} /> Download master fleet CSV
            {rows.length > 0 && (
              <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold dark:bg-ink-900/20">
                {rows.length}
              </span>
            )}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Drivers ranked" value={rows.length} icon={Users} />
        <StatCard label="Speed flags" value={totals.speed.toLocaleString()} icon={Gauge} />
        <StatCard label="Night flags" value={totals.nights.toLocaleString()} icon={Moon} />
        <StatCard
          label="Continuous flags"
          value={totals.continuous.toLocaleString()}
          icon={Layers}
        />
      </div>

      {noUploads ? (
        <div className="mt-8">
          <EmptyState
            icon={Users}
            title="No uploads yet"
            description="Upload Speed, Nights and Continuous files first. Master fleet will rank drivers by combined VID matches once data is in."
          />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Users}
            title="No events pass the thresholds"
            description={`Nothing met the minimum durations — Speed ≥ ${formatThreshold(
              SPEED_MIN_SECONDS,
            )}, Nights ≥ ${formatThreshold(
              NIGHTS_MIN_SECONDS,
            )}, Continuous ≥ ${formatThreshold(CONTINUOUS_MIN_SECONDS)}.`}
          />
        </div>
      ) : (
        <>
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                Top {top3.length} repeat offenders
              </h2>
              <p className="text-xs text-ink-500 dark:text-ink-400">
                Combined matches across all three event types
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {top3.map((row, i) => (
                <TopOffenderCard key={row.vid} rank={i} row={row} />
              ))}
            </div>
          </div>

          <div className="surface mt-8 rounded-2xl p-5 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-ink-900 dark:text-white">
                  Full ranking ({rows.length})
                </h3>
                <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                  Sorted by combined total, highest first. VID drives the merge —
                  transporter labels are ignored.
                </p>
              </div>
              <div className="relative sm:w-72">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search VID or driver name"
                  className="input-base !pl-9"
                />
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-xl border border-ink-100 dark:border-ink-800">
              <table className="min-w-full text-sm">
                <thead className="bg-ink-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:bg-ink-900 dark:text-ink-400">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">VID</th>
                    <th className="px-4 py-3">Driver name</th>
                    <th className="px-4 py-3 text-right">Nights</th>
                    <th className="px-4 py-3 text-right">Speed</th>
                    <th className="px-4 py-3 text-right">Continuous</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm text-ink-500 dark:text-ink-400"
                      >
                        No drivers match your search.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => {
                      const rank = rows.indexOf(r) + 1;
                      return (
                        <tr key={r.vid} className="bg-white dark:bg-ink-900">
                          <td className="px-4 py-2.5 font-mono text-xs text-ink-500 dark:text-ink-400">
                            {rank}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-ink-800 dark:text-ink-100">
                            {r.vid}
                          </td>
                          <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                            {r.driverName || (
                              <span className="text-ink-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-ink-800 dark:text-ink-100">
                            {r.nights}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-ink-800 dark:text-ink-100">
                            {r.speed}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-ink-800 dark:text-ink-100">
                            {r.continuous}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-ink-900 dark:text-white">
                            {r.total}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
