import { useMemo, useState } from 'react';
import {
  Crown,
  Download,
  Gauge,
  IdCard,
  Layers,
  Medal,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Route as RouteIcon,
  Search,
  SlidersHorizontal,
  Trophy,
  Users,
} from 'lucide-react';
import { useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { StatCard } from '../components/ui/StatCard';
import {
  aggregateMasterFleet,
  collectFilteredEvents,
  downloadMasterFleetCsv,
  DEFAULT_THRESHOLDS,
  type EventThresholds,
  type FilteredEvents,
  type MasterFleetRow,
} from '../lib/masterFleet';

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
  const [thresholds, setThresholds] = useState<EventThresholds>(DEFAULT_THRESHOLDS);

  const rows = useMemo(
    () =>
      aggregateMasterFleet({
        speedFiles,
        nightFiles,
        continuousFiles,
        driverRecords,
        thresholds,
      }),
    [speedFiles, nightFiles, continuousFiles, driverRecords, thresholds],
  );

  const filteredEvents = useMemo(
    () =>
      collectFilteredEvents({
        speedFiles,
        nightFiles,
        continuousFiles,
        driverRecords,
        thresholds,
      }),
    [speedFiles, nightFiles, continuousFiles, driverRecords, thresholds],
  );

  const [activeTab, setActiveTab] = useState<'speed' | 'nights' | 'continuous'>(
    'speed',
  );
  const [eventQuery, setEventQuery] = useState('');

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
          thresholds.speed,
        )}), Nights (≥ ${formatThreshold(
          thresholds.nights,
        )}) and Continuous (≥ ${formatThreshold(
          thresholds.continuous,
        )}). Adjust the thresholds below to filter differently.`}
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
      ) : (
        <>
          <ThresholdControls
            thresholds={thresholds}
            onChange={setThresholds}
            onReset={() => setThresholds(DEFAULT_THRESHOLDS)}
          />

          {rows.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                icon={Users}
                title="No events pass the thresholds"
                description={`Nothing met the minimum durations — Speed ≥ ${formatThreshold(
                  thresholds.speed,
                )}, Nights ≥ ${formatThreshold(
                  thresholds.nights,
                )}, Continuous ≥ ${formatThreshold(thresholds.continuous)}.`}
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

          <FilteredEventsPanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            query={eventQuery}
            setQuery={setEventQuery}
            events={filteredEvents}
            thresholds={thresholds}
          />

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
        </>
      )}
    </div>
  );
};

type EventTab = 'speed' | 'nights' | 'continuous';

const TAB_META: Record<EventTab, { label: string; icon: typeof Gauge }> = {
  speed: { label: 'Speed', icon: Gauge },
  nights: { label: 'Nights', icon: Moon },
  continuous: { label: 'Continuous', icon: RouteIcon },
};

const matchesQuery = (q: string, ...fields: string[]): boolean => {
  if (!q) return true;
  const needle = q.toLowerCase();
  return fields.some((f) => (f ?? '').toLowerCase().includes(needle));
};

interface FilteredEventsPanelProps {
  activeTab: EventTab;
  setActiveTab: (tab: EventTab) => void;
  query: string;
  setQuery: (q: string) => void;
  events: FilteredEvents;
  thresholds: EventThresholds;
}

const FilteredEventsPanel = ({
  activeTab,
  setActiveTab,
  query,
  setQuery,
  events,
  thresholds,
}: FilteredEventsPanelProps) => {
  const counts: Record<EventTab, number> = {
    speed: events.speed.length,
    nights: events.nights.length,
    continuous: events.continuous.length,
  };

  const speedRows = events.speed.filter((e) =>
    matchesQuery(query, e.vid, e.driverName, e.overspeedPosition, e.duration),
  );
  const nightRows = events.nights.filter((e) =>
    matchesQuery(query, e.vid, e.driverName, e.timeA, e.duration),
  );
  const contRows = events.continuous.filter((e) =>
    matchesQuery(query, e.vid, e.driverName, e.timeA, e.duration),
  );

  return (
    <div className="surface mt-8 rounded-2xl p-5 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink-900 dark:text-white">
            Filtered events (passing thresholds)
          </h3>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
            Switch tabs to verify which raw events were counted into each
            category.
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
            placeholder="Search VID, driver, time, location"
            className="input-base !pl-9"
          />
        </div>
      </div>

      <div className="mt-4 inline-flex rounded-xl border border-ink-100 bg-ink-50 p-1 dark:border-ink-800 dark:bg-ink-900">
        {(Object.keys(TAB_META) as EventTab[]).map((t) => {
          const { label, icon: Icon } = TAB_META[t];
          const active = t === activeTab;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTab(t)}
              className={
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ' +
                (active
                  ? 'bg-white text-ink-900 shadow-card dark:bg-ink-950 dark:text-white'
                  : 'text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white')
              }
            >
              <Icon size={13} />
              {label}
              <span
                className={
                  'ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ' +
                  (active
                    ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                    : 'bg-ink-200/70 text-ink-600 dark:bg-ink-800 dark:text-ink-300')
                }
              >
                {counts[t]}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-ink-500 dark:text-ink-400">
        Threshold: {formatThreshold(thresholds[activeTab])} · Showing{' '}
        {activeTab === 'speed'
          ? speedRows.length
          : activeTab === 'nights'
            ? nightRows.length
            : contRows.length}{' '}
        of {counts[activeTab]}
      </p>

      <div className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-ink-100 dark:border-ink-800">
        {activeTab === 'speed' && (
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-ink-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500 shadow-[0_1px_0_rgba(0,0,0,0.05)] dark:bg-ink-900 dark:text-ink-400">
              <tr>
                <th className="px-4 py-3">VID</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">End</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Top speed</th>
                <th className="px-4 py-3">Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {speedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-ink-500 dark:text-ink-400"
                  >
                    No speed events passed the threshold.
                  </td>
                </tr>
              ) : (
                speedRows.map((e) => (
                  <tr key={e.id} className="bg-white dark:bg-ink-900">
                    <td className="px-4 py-2.5 font-mono text-ink-800 dark:text-ink-100">
                      {e.vid}
                    </td>
                    <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                      {e.driverName || <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-700 dark:text-ink-200">
                      {e.start}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-700 dark:text-ink-200">
                      {e.end}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-ink-800 dark:text-ink-100">
                      {e.duration}
                    </td>
                    <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                      {e.topSpeed}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink-700 dark:text-ink-200">
                      {e.overspeedPosition || (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'nights' && (
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-ink-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500 shadow-[0_1px_0_rgba(0,0,0,0.05)] dark:bg-ink-900 dark:text-ink-400">
              <tr>
                <th className="px-4 py-3">VID</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Time A</th>
                <th className="px-4 py-3">Time B</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Length</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {nightRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-ink-500 dark:text-ink-400"
                  >
                    No night events passed the threshold.
                  </td>
                </tr>
              ) : (
                nightRows.map((e) => (
                  <tr key={e.id} className="bg-white dark:bg-ink-900">
                    <td className="px-4 py-2.5 font-mono text-ink-800 dark:text-ink-100">
                      {e.vid}
                    </td>
                    <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                      {e.driverName || <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-700 dark:text-ink-200">
                      {e.timeA}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-700 dark:text-ink-200">
                      {e.timeB}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-ink-800 dark:text-ink-100">
                      {e.duration}
                    </td>
                    <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                      {e.length || <span className="text-ink-400">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'continuous' && (
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-ink-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500 shadow-[0_1px_0_rgba(0,0,0,0.05)] dark:bg-ink-900 dark:text-ink-400">
              <tr>
                <th className="px-4 py-3">VID</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Time A</th>
                <th className="px-4 py-3">Time B</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Length</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {contRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-ink-500 dark:text-ink-400"
                  >
                    No continuous events passed the threshold.
                  </td>
                </tr>
              ) : (
                contRows.map((e) => (
                  <tr key={e.id} className="bg-white dark:bg-ink-900">
                    <td className="px-4 py-2.5 font-mono text-ink-800 dark:text-ink-100">
                      {e.vid}
                    </td>
                    <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                      {e.driverName || <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-700 dark:text-ink-200">
                      {e.timeA}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-700 dark:text-ink-200">
                      {e.timeB}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-ink-800 dark:text-ink-100">
                      {e.duration}
                    </td>
                    <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                      {e.length || <span className="text-ink-400">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

interface ThresholdControlsProps {
  thresholds: EventThresholds;
  onChange: (t: EventThresholds) => void;
  onReset: () => void;
}

const splitHM = (seconds: number): { h: number; m: number } => ({
  h: Math.floor(seconds / 3600),
  m: Math.floor((seconds % 3600) / 60),
});

const ThresholdControls = ({
  thresholds,
  onChange,
  onReset,
}: ThresholdControlsProps) => {
  const isDefault =
    thresholds.speed === DEFAULT_THRESHOLDS.speed &&
    thresholds.nights === DEFAULT_THRESHOLDS.nights &&
    thresholds.continuous === DEFAULT_THRESHOLDS.continuous;

  const setKey = (key: keyof EventThresholds, next: number) =>
    onChange({ ...thresholds, [key]: Math.max(0, next) });

  return (
    <div className="surface mt-6 rounded-2xl p-5 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <SlidersHorizontal size={15} /> Manual filter thresholds
        </div>
        <div className="flex items-center gap-3">
          <p
            className="text-[11px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Set the minimum duration for each event type. Anything shorter is
            filtered out.
          </p>
          {!isDefault && (
            <button
              type="button"
              onClick={onReset}
              className="btn-ghost !py-1 !px-2 text-xs"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <DurationField
          icon={Gauge}
          label="Speed"
          seconds={thresholds.speed}
          onChange={(v) => setKey('speed', v)}
        />
        <DurationField
          icon={Moon}
          label="Nights"
          seconds={thresholds.nights}
          onChange={(v) => setKey('nights', v)}
        />
        <DurationField
          icon={RouteIcon}
          label="Continuous"
          seconds={thresholds.continuous}
          onChange={(v) => setKey('continuous', v)}
        />
      </div>
    </div>
  );
};

interface DurationFieldProps {
  icon: typeof Gauge;
  label: string;
  seconds: number;
  onChange: (seconds: number) => void;
}

const DurationField = ({
  icon: Icon,
  label,
  seconds,
  onChange,
}: DurationFieldProps) => {
  const { h, m } = splitHM(seconds);
  const setHM = (nextH: number, nextM: number) => {
    const clampedH = Math.max(0, Math.min(72, nextH));
    const clampedM = Math.max(0, Math.min(59, nextM));
    onChange(clampedH * 3600 + clampedM * 60);
  };
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: '#ffffff',
        border: '1px solid var(--color-brand-navy-line)',
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Icon size={12} /> {label} minimum
        </span>
        <span
          className="font-mono text-[11px]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ≥ {formatThreshold(seconds)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberStepper
          label="Hours"
          value={h}
          min={0}
          max={72}
          onChange={(v) => setHM(v, m)}
        />
        <NumberStepper
          label="Minutes"
          value={m}
          min={0}
          max={59}
          onChange={(v) => setHM(h, v)}
        />
      </div>
    </div>
  );
};

interface NumberStepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

/**
 * Number field with explicit +/- buttons. The text input can be blank
 * while the user is typing (no forced 0); on blur an empty value is
 * committed as `min`.
 */
const NumberStepper = ({
  label,
  value,
  min,
  max,
  onChange,
}: NumberStepperProps) => {
  const [text, setText] = useState<string>(String(value));
  const [lastValue, setLastValue] = useState<number>(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(String(value));
  }

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      onChange(min);
      setText(String(min));
      return;
    }
    const n = Math.floor(Number(trimmed));
    if (!Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, n));
    onChange(clamped);
    setText(String(clamped));
  };

  const bump = (delta: number) => {
    const clamped = Math.max(min, Math.min(max, value + delta));
    onChange(clamped);
  };

  return (
    <label className="block">
      <span
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </span>
      <div
        className="mt-1 flex items-stretch overflow-hidden rounded-xl"
        style={{ border: '1px solid var(--color-brand-navy-line)' }}
      >
        <button
          type="button"
          onClick={() => bump(-1)}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className="flex w-9 shrink-0 items-center justify-center text-sm transition disabled:opacity-40"
          style={{
            background: 'var(--color-bg-card)',
            color: 'var(--color-text-primary)',
          }}
        >
          <Minus size={14} />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="min-w-0 flex-1 border-0 bg-white px-2 py-2 text-center text-sm outline-none"
          style={{ color: 'var(--color-text-primary)' }}
        />
        <button
          type="button"
          onClick={() => bump(1)}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
          className="flex w-9 shrink-0 items-center justify-center text-sm transition disabled:opacity-40"
          style={{
            background: 'var(--color-bg-card)',
            color: 'var(--color-text-primary)',
          }}
        >
          <Plus size={14} />
        </button>
      </div>
    </label>
  );
};
