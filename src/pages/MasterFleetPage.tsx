import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  Gauge,
  GitMerge,
  IdCard,
  Layers,
  MapPin,
  Medal,
  Moon,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { StatCard } from '../components/ui/StatCard';
import {
  aggregateMasterFleet,
  collectFilteredEvents,
  downloadMasterFleetCsv,
  downloadFilteredSpeedCsv,
  downloadFilteredNightsCsv,
  downloadFilteredContinuousCsv,
  type EventThresholds,
  type FilteredEvents,
  type MasterFleetRow,
} from '../lib/masterFleet';
import { filterFilesByTransporter } from '../lib/transporterScope';
import { useUserScope } from '../hooks/useUserScope';

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
// Rank-pip tones — gold (accent orange) → deep blue → soft orange, all on-brand.
const PODIUM_PIP_STYLES = [
  'bg-brand-orange-soft text-brand-orange-dark ring-brand-orange-line',
  'bg-brand-blue-soft text-brand-blue-dark ring-brand-blue-line',
  'bg-brand-orange-soft/60 text-brand-orange-dark ring-brand-orange-line',
];
const PODIUM_BAR_STYLES = [
  'bg-brand-orange',
  'bg-brand-blue',
  'bg-brand-orange/60',
];

const TopOffenderCard = ({
  rank,
  row,
}: {
  rank: number;
  row: MasterFleetRow;
}) => {
  const Icon = PODIUM_ICONS[rank] ?? Medal;
  const pip = PODIUM_PIP_STYLES[rank] ?? PODIUM_PIP_STYLES[2];
  const bar = PODIUM_BAR_STYLES[rank] ?? PODIUM_BAR_STYLES[2];
  return (
    <div
      className="group surface relative overflow-hidden rounded-2xl p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-elev"
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${bar}`}
      />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
            <span
              className={`inline-flex h-5 min-w-[1.75rem] items-center justify-center rounded-full px-2 text-[10px] font-bold ring-1 ${pip}`}
            >
              #{rank + 1}
            </span>
            Most flagged
          </p>
          <h3 className="mt-1.5 truncate font-display text-xl font-semibold tracking-tight text-ink-900 dark:text-white">
            {row.driverName || 'Not found'}
          </h3>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-ink-600 dark:text-ink-300">
            <IdCard size={12} /> VID {row.vid}
            {row.transporter && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{row.transporter}</span>
              </>
            )}
          </p>
        </div>
        <span
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition group-hover:scale-105 ${pip}`}
        >
          <Icon size={18} />
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div className="surface-2 rounded-xl p-2.5">
          <p className="inline-flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            <Moon size={10} /> Nights
          </p>
          <p className="mt-0.5 text-lg font-semibold text-ink-900 dark:text-white">
            {row.nights}
          </p>
        </div>
        <div className="surface-2 rounded-xl p-2.5">
          <p className="inline-flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            <Gauge size={10} /> Speed
          </p>
          <p className="mt-0.5 text-lg font-semibold text-ink-900 dark:text-white">
            {row.speed}
          </p>
        </div>
        <div className="surface-2 rounded-xl p-2.5">
          <p className="inline-flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            <RouteIcon size={10} /> Cont.
          </p>
          <p className="mt-0.5 text-lg font-semibold text-ink-900 dark:text-white">
            {row.continuous}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-ink-900 px-4 py-2.5 text-white dark:bg-white dark:text-ink-900">
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
  const rawSpeed = useAppSelector((s) => s.unfiltered.files);
  const rawNights = useAppSelector((s) => s.unfilteredNights.files);
  const rawCont = useAppSelector((s) => s.unfilteredContinuous.files);
  const driverRecords = useAppSelector((s) => s.drivers.records);
  const thresholds = useAppSelector((s) => s.rules.thresholds);
  const allowedVidsByType = useAppSelector((s) => s.rules.allowedVidsByType);
  const allowedLocationsByType = useAppSelector(
    (s) => s.rules.allowedLocationsByType,
  );
  const allowedLocationsTotal =
    allowedLocationsByType.speed.length +
    allowedLocationsByType.nights.length +
    allowedLocationsByType.continuous.length;
  const { isTransporterStaff, matchesTransporter } = useUserScope();
  const [query, setQuery] = useState('');
  const [rankingOpen, setRankingOpen] = useState(false);

  const speedFiles = useMemo(
    () => filterFilesByTransporter(rawSpeed, isTransporterStaff, matchesTransporter),
    [rawSpeed, isTransporterStaff, matchesTransporter],
  );
  const nightFiles = useMemo(
    () => filterFilesByTransporter(rawNights, isTransporterStaff, matchesTransporter),
    [rawNights, isTransporterStaff, matchesTransporter],
  );
  const continuousFiles = useMemo(
    () => filterFilesByTransporter(rawCont, isTransporterStaff, matchesTransporter),
    [rawCont, isTransporterStaff, matchesTransporter],
  );

  const rows = useMemo(
    () =>
      aggregateMasterFleet({
        speedFiles,
        nightFiles,
        continuousFiles,
        driverRecords,
        thresholds,
        allowedVidsByType,
        allowedLocationsByType,
      }),
    [
      speedFiles,
      nightFiles,
      continuousFiles,
      driverRecords,
      thresholds,
      allowedVidsByType,
      allowedLocationsByType,
    ],
  );

  const filteredEvents = useMemo(
    () =>
      collectFilteredEvents({
        speedFiles,
        nightFiles,
        continuousFiles,
        driverRecords,
        thresholds,
        allowedVidsByType,
        allowedLocationsByType,
      }),
    [
      speedFiles,
      nightFiles,
      continuousFiles,
      driverRecords,
      thresholds,
      allowedVidsByType,
      allowedLocationsByType,
    ],
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
        )}). Edit thresholds and whitelists in Rules.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRankingOpen(true)}
              disabled={rows.length === 0}
              className="btn-ghost"
            >
              <Layers size={16} /> View full ranking
              {rows.length > 0 && (
                <span className="ml-1 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                  {rows.length}
                </span>
              )}
            </button>
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
          </div>
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
          {(allowedVidsByType.speed.length > 0 ||
            allowedVidsByType.nights.length > 0 ||
            allowedVidsByType.continuous.length > 0 ||
            allowedLocationsTotal > 0) && (
            <div className="surface mt-6 flex flex-wrap items-center gap-3 rounded-2xl p-4 sm:p-5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                <ShieldCheck size={14} /> Active whitelists
              </span>
              {allowedVidsByType.speed.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-800 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800">
                  <Gauge size={11} /> {allowedVidsByType.speed.length} speed VID
                  {allowedVidsByType.speed.length === 1 ? '' : 's'}
                </span>
              )}
              {allowedVidsByType.nights.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-800 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800">
                  <Moon size={11} /> {allowedVidsByType.nights.length} nights VID
                  {allowedVidsByType.nights.length === 1 ? '' : 's'}
                </span>
              )}
              {allowedVidsByType.continuous.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-800 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800">
                  <RouteIcon size={11} /> {allowedVidsByType.continuous.length} continuous VID
                  {allowedVidsByType.continuous.length === 1 ? '' : 's'}
                </span>
              )}
              {allowedLocationsTotal > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-800 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800">
                  <MapPin size={11} /> {allowedLocationsTotal} location
                  {allowedLocationsTotal === 1 ? '' : 's'}
                </span>
              )}
              {!isTransporterStaff && (
                <Link
                  to="/rules"
                  className="ml-auto text-[11px] font-semibold text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
                >
                  Manage in Rules →
                </Link>
              )}
            </div>
          )}

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

            </>
          )}
        </>
      )}

      <Modal
        open={rankingOpen}
        onClose={() => setRankingOpen(false)}
        title={`Full ranking · ${rows.length} driver${rows.length === 1 ? '' : 's'}`}
        subtitle="Sorted by combined total. VID drives the merge — transporter labels are ignored."
        toolbar={
          <div className="relative w-72">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search VID or driver name"
              className="input-base !py-2 !pl-9 !text-xs"
            />
          </div>
        }
      >
        <FullRankingTable rows={rows} filtered={filtered} />
      </Modal>
    </div>
  );
};

interface FullRankingTableProps {
  rows: MasterFleetRow[];
  filtered: MasterFleetRow[];
}

const FullRankingTable = ({ rows, filtered }: FullRankingTableProps) => (
  <div className="overflow-hidden rounded-xl border border-ink-100 dark:border-ink-800">
    <div className="max-h-[70vh] overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 bg-ink-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500 shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:bg-ink-900 dark:text-ink-400">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">VID</th>
            <th className="px-4 py-3">Driver name</th>
            <th className="px-4 py-3">Transporter</th>
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
                colSpan={8}
                className="px-4 py-8 text-center text-sm text-ink-500 dark:text-ink-400"
              >
                No drivers match your search.
              </td>
            </tr>
          ) : (
            filtered.map((r) => {
              const rank = rows.indexOf(r) + 1;
              return (
                <tr
                  key={r.vid}
                  className={
                    'transition hover:bg-ink-50/60 dark:hover:bg-ink-900/60 ' +
                    (r.allowedVid
                      ? 'bg-red-50/60 dark:bg-red-950/20'
                      : 'bg-white dark:bg-ink-950')
                  }
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-500 dark:text-ink-400">
                    {rank}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-ink-800 dark:text-ink-100">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>{r.vid}</span>
                      {r.hasMergedNights && (
                        <span
                          title="Some of this VID's night events were merged into a single shift (18:00–06:00)"
                          className="inline-flex items-center gap-1 rounded-full bg-brand-blue-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand-blue-dark ring-1 ring-brand-blue-line"
                        >
                          <GitMerge size={10} /> Merged
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={
                          r.driverName === 'Not found'
                            ? 'italic text-ink-400'
                            : ''
                        }
                      >
                        {r.driverName || (
                          <span className="text-ink-400">—</span>
                        )}
                      </span>
                      {r.allowedVid && (
                        <span
                          title="This VID is on the allowed list"
                          className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800 ring-1 ring-red-200 dark:bg-red-900/60 dark:text-red-100 dark:ring-red-800"
                        >
                          <ShieldCheck size={10} /> Allowed VID
                        </span>
                      )}
                      {r.speedInAllowedLocations > 0 && (
                        <span
                          title={`${r.speedInAllowedLocations} speed event(s) occurred in an allowed location`}
                          className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-800 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800"
                        >
                          <MapPin size={10} /> {r.speedInAllowedLocations} in allowed zone
                          {r.speedInAllowedLocations === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                    {r.transporter || <span className="text-ink-400">—</span>}
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
);

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

/**
 * Parse a raw date string (from a Speed/Nights/Continuous event field)
 * into a Date. Accepts ISO and "YYYY-MM-DD HH:MM:SS"-style forms.
 */
const parseEventDate = (raw: string): Date | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  const withT = new Date(
    trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T'),
  );
  if (!Number.isNaN(withT.getTime())) return withT;
  const plain = new Date(trimmed);
  return Number.isNaN(plain.getTime()) ? null : plain;
};

/**
 * Return true when the given event's primary/secondary date field falls in
 * the selected month (`YYYY-MM` from `<input type="month">`) and optional
 * day (1-31). Empty month = no date filter.
 */
const matchesDateFilter = (
  primary: string,
  secondary: string,
  monthValue: string,
  dayValue: string,
): boolean => {
  if (!monthValue) return true;
  const [yStr, mStr] = monthValue.split('-');
  const targetYear = Number(yStr);
  const targetMonth = Number(mStr);
  if (!Number.isFinite(targetYear) || !Number.isFinite(targetMonth)) return true;
  const targetDay = dayValue ? Number(dayValue) : null;
  const check = (raw: string): boolean => {
    const d = parseEventDate(raw);
    if (!d) return false;
    if (d.getFullYear() !== targetYear) return false;
    if (d.getMonth() + 1 !== targetMonth) return false;
    if (targetDay != null && d.getDate() !== targetDay) return false;
    return true;
  };
  return check(primary) || check(secondary);
};

/**
 * Renders both Position A and Position B side-by-side. When one side matched
 * an allowed-location rule, that side's row is highlighted so the boss can
 * see exactly which endpoint of the trip triggered the allow — without this,
 * a trip like "Diredawa → Djibouti" would look like a Djibouti event was
 * wrongly whitelisted, because only the end position was visible.
 */
const PositionCell = ({
  positionA,
  positionB,
  matchedA,
  matchedB,
}: {
  positionA: string;
  positionB: string;
  matchedA: boolean;
  matchedB: boolean;
}) => {
  const anyMatched = matchedA || matchedB;
  const row = (label: 'A' | 'B', value: string, matched: boolean) => (
    <div className="flex items-start gap-1.5">
      <span className="mt-0.5 shrink-0 rounded-md bg-ink-100 px-1 font-mono text-[10px] font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
        {label}
      </span>
      {value ? (
        <span
          className={
            matched
              ? 'font-semibold text-red-800 dark:text-red-200'
              : 'text-ink-800 dark:text-ink-100'
          }
        >
          {value}
        </span>
      ) : (
        <span className="text-ink-400">—</span>
      )}
    </div>
  );
  return (
    <div className="flex flex-col gap-1.5">
      {row('A', positionA, matchedA)}
      {row('B', positionB, matchedB)}
      {anyMatched && (
        <span
          title="This event's position matches an allowed location"
          className="inline-flex w-fit items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-800 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800"
        >
          <MapPin size={10} /> Allowed location · {matchedA && matchedB ? 'A & B' : matchedA ? 'A' : 'B'}
        </span>
      )}
    </div>
  );
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
  const [monthValue, setMonthValue] = useState('');
  const [dayValue, setDayValue] = useState('');

  const speedDated = useMemo(
    () =>
      events.speed.filter((e) =>
        matchesDateFilter(e.start, e.end, monthValue, dayValue),
      ),
    [events.speed, monthValue, dayValue],
  );
  const nightsDated = useMemo(
    () =>
      events.nights.filter((e) =>
        matchesDateFilter(e.timeA, e.timeB, monthValue, dayValue),
      ),
    [events.nights, monthValue, dayValue],
  );
  const contDated = useMemo(
    () =>
      events.continuous.filter((e) =>
        matchesDateFilter(e.timeA, e.timeB, monthValue, dayValue),
      ),
    [events.continuous, monthValue, dayValue],
  );

  const counts: Record<EventTab, number> = {
    speed: speedDated.length,
    nights: nightsDated.length,
    continuous: contDated.length,
  };

  const speedRows = speedDated.filter((e) =>
    matchesQuery(query, e.vid, e.driverName, e.overspeedPosition, e.duration),
  );
  const nightRows = nightsDated.filter((e) =>
    matchesQuery(query, e.vid, e.driverName, e.timeA, e.duration, e.position),
  );
  const contRows = contDated.filter((e) =>
    matchesQuery(query, e.vid, e.driverName, e.timeA, e.duration, e.position),
  );

  const clearDateFilter = () => {
    setMonthValue('');
    setDayValue('');
  };

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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'speed') downloadFilteredSpeedCsv(speedDated);
              else if (activeTab === 'nights') downloadFilteredNightsCsv(nightsDated);
              else downloadFilteredContinuousCsv(contDated);
            }}
            disabled={counts[activeTab] === 0}
            className="btn-primary !px-3 !py-1.5 !text-xs"
          >
            <Download size={13} />
            Download {TAB_META[activeTab].label} CSV
            {counts[activeTab] > 0 && (
              <span className="ml-1 rounded-full bg-ink-900/10 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-white/10">
                {counts[activeTab]}
              </span>
            )}
          </button>
          <div className="relative sm:w-64">
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
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-2 text-xs dark:border-ink-800 dark:bg-ink-900/40">
        <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
          <CalendarDays size={13} /> Date filter
        </span>
        <DateFilterPopover
          monthValue={monthValue}
          dayValue={dayValue}
          onSelectDay={(mv, dv) => {
            setMonthValue(mv);
            setDayValue(dv);
          }}
          onClear={clearDateFilter}
        />
        <span className="ml-auto text-[11px] text-ink-500 dark:text-ink-400">
          Rules (thresholds &amp; whitelists) still applied.
        </span>
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
                    ? 'bg-brand-blue text-white'
                    : 'bg-brand-blue-soft text-brand-blue-dark')
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

      <div className="mt-4 max-h-[65vh] min-h-[420px] overflow-auto rounded-xl border border-ink-100 dark:border-ink-800">
        {activeTab === 'speed' && (
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-ink-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500 shadow-[0_1px_0_rgba(0,0,0,0.05)] dark:bg-ink-900 dark:text-ink-400">
              <tr>
                <th className="px-4 py-3">VID</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Transporter</th>
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
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-ink-500 dark:text-ink-400"
                  >
                    No speed events passed the threshold.
                  </td>
                </tr>
              ) : (
                speedRows.map((e) => (
                  <tr
                    key={e.id}
                    className={
                      e.allowedVid || e.allowedLocation
                        ? 'bg-red-50/60 dark:bg-red-950/20'
                        : 'bg-white dark:bg-ink-900'
                    }
                  >
                    <td className="px-4 py-2.5 font-mono text-ink-800 dark:text-ink-100">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{e.vid}</span>
                        {e.allowedVid && (
                          <span
                            title="This VID is on the allowed list"
                            className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800 ring-1 ring-red-200 dark:bg-red-900/60 dark:text-red-100 dark:ring-red-800"
                          >
                            <ShieldCheck size={10} /> Allowed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                      {e.driverName || <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                      {e.transporter || <span className="text-ink-400">—</span>}
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
                      <div className="flex flex-col gap-1">
                        {e.overspeedPosition ? (
                          <span>{e.overspeedPosition}</span>
                        ) : (
                          <span className="text-ink-400">—</span>
                        )}
                        {e.allowedLocation && (
                          <span
                            title="This event contains a coordinate in an allowed location"
                            className="inline-flex w-fit items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-800 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800"
                          >
                            <MapPin size={10} /> Allowed location
                          </span>
                        )}
                      </div>
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
                <th className="px-4 py-3">Transporter</th>
                <th className="px-4 py-3">Time A</th>
                <th className="px-4 py-3">Time B</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {nightRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-ink-500 dark:text-ink-400"
                  >
                    No night events passed the threshold.
                  </td>
                </tr>
              ) : (
                nightRows.map((e) => (
                  <tr
                    key={e.id}
                    className={
                      e.allowedVid || e.allowedLocation
                        ? 'bg-red-50/60 dark:bg-red-950/20'
                        : 'bg-white dark:bg-ink-900'
                    }
                  >
                    <td className="px-4 py-2.5 font-mono text-ink-800 dark:text-ink-100">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{e.vid}</span>
                        {e.mergedCount > 1 && (
                          <span
                            title={`Merged ${e.mergedCount} night events from the same 18:00–06:00 shift`}
                            className="inline-flex items-center gap-1 rounded-full bg-brand-blue-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand-blue-dark ring-1 ring-brand-blue-line"
                          >
                            <GitMerge size={10} /> Merged ×{e.mergedCount}
                          </span>
                        )}
                        {e.allowedVid && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800 ring-1 ring-red-200 dark:bg-red-900/60 dark:text-red-100 dark:ring-red-800">
                            <ShieldCheck size={10} /> Allowed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                      {e.driverName || <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                      {e.transporter || <span className="text-ink-400">—</span>}
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
                    <td className="px-4 py-2.5 text-xs text-ink-700 dark:text-ink-200">
                      <PositionCell
                        positionA={e.positionA}
                        positionB={e.positionB}
                        matchedA={e.allowedLocationA}
                        matchedB={e.allowedLocationB}
                      />
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
                <th className="px-4 py-3">Transporter</th>
                <th className="px-4 py-3">Time A</th>
                <th className="px-4 py-3">Time B</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Length</th>
                <th className="px-4 py-3">Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {contRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-ink-500 dark:text-ink-400"
                  >
                    No continuous events passed the threshold.
                  </td>
                </tr>
              ) : (
                contRows.map((e) => (
                  <tr
                    key={e.id}
                    className={
                      e.allowedVid || e.allowedLocation
                        ? 'bg-red-50/60 dark:bg-red-950/20'
                        : 'bg-white dark:bg-ink-900'
                    }
                  >
                    <td className="px-4 py-2.5 font-mono text-ink-800 dark:text-ink-100">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{e.vid}</span>
                        {e.allowedVid && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800 ring-1 ring-red-200 dark:bg-red-900/60 dark:text-red-100 dark:ring-red-800">
                            <ShieldCheck size={10} /> Allowed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                      {e.driverName || <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                      {e.transporter || <span className="text-ink-400">—</span>}
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
                    <td className="px-4 py-2.5 text-xs text-ink-700 dark:text-ink-200">
                      <PositionCell
                        positionA={e.positionA}
                        positionB={e.positionB}
                        matchedA={e.allowedLocationA}
                        matchedB={e.allowedLocationB}
                      />
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

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_LABELS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface DateFilterPopoverProps {
  monthValue: string;
  dayValue: string;
  onSelectDay: (monthValue: string, dayValue: string) => void;
  onClear: () => void;
}

const DateFilterPopover = ({
  monthValue,
  dayValue,
  onSelectDay,
  onClear,
}: DateFilterPopoverProps) => {
  const today = new Date();
  const selectedYear = monthValue ? Number(monthValue.split('-')[0]) : null;
  const selectedMonth = monthValue ? Number(monthValue.split('-')[1]) - 1 : null;
  const selectedDay = dayValue ? Number(dayValue) : null;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selectedYear ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedMonth ?? today.getMonth());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (selectedYear != null && selectedMonth != null) {
      setViewYear(selectedYear);
      setViewMonth(selectedMonth);
    }
  }, [open, selectedYear, selectedMonth]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };
  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const pickDay = (day: number) => {
    const mv = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    onSelectDay(mv, String(day));
    setOpen(false);
  };
  const pickMonth = () => {
    const mv = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    onSelectDay(mv, '');
    setOpen(false);
  };

  const buttonLabel = (() => {
    if (!monthValue || selectedYear == null || selectedMonth == null) return 'Any date';
    if (selectedDay != null) {
      return `${MONTH_LABELS_SHORT[selectedMonth]} ${selectedDay}, ${selectedYear}`;
    }
    return `${MONTH_LABELS[selectedMonth]} ${selectedYear}`;
  })();

  const hasSelection = monthValue.length > 0;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={
          'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium outline-none transition ' +
          (hasSelection
            ? 'border-brand-blue bg-brand-blue text-white hover:bg-brand-blue-hover'
            : 'border-brand-blue-line bg-white text-brand-blue-dark hover:border-brand-blue focus:border-brand-blue')
        }
      >
        <CalendarDays size={14} className={hasSelection ? '' : 'text-brand-blue'} />
        {buttonLabel}
        <ChevronDown size={13} className="opacity-70" />
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute left-0 top-full z-30 mt-2 w-72 rounded-2xl border border-ink-100 bg-white p-3 shadow-elev dark:border-ink-800 dark:bg-ink-900"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous month"
              className="rounded-md p-1 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-white"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={pickMonth}
              title="Filter to the entire month"
              className="rounded-md px-3 py-1 text-sm font-semibold text-ink-900 transition hover:bg-ink-100 dark:text-white dark:hover:bg-ink-800"
            >
              {MONTH_LABELS[viewMonth]} {viewYear}
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next month"
              className="rounded-md p-1 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-white"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-ink-400">
            {WEEKDAY_LABELS.map((d, i) => (
              <div key={i} className="py-1">{d}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              if (c === null) return <div key={i} className="h-8 w-8" />;
              const isSelectedDay =
                selectedYear === viewYear &&
                selectedMonth === viewMonth &&
                selectedDay === c;
              const isSelectedMonthOnly =
                selectedDay == null &&
                selectedYear === viewYear &&
                selectedMonth === viewMonth;
              const isToday =
                today.getFullYear() === viewYear &&
                today.getMonth() === viewMonth &&
                today.getDate() === c;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickDay(c)}
                  className={
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs transition ' +
                    (isSelectedDay
                      ? 'bg-ink-900 font-semibold text-white dark:bg-white dark:text-ink-900'
                      : isSelectedMonthOnly
                        ? 'bg-ink-100 text-ink-900 dark:bg-ink-800 dark:text-white'
                        : isToday
                          ? 'text-ink-900 ring-1 ring-inset ring-ink-300 dark:text-white dark:ring-ink-600'
                          : 'text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800')
                  }
                >
                  {c}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3 dark:border-ink-800">
            <button
              type="button"
              onClick={pickMonth}
              className="text-[11px] font-semibold text-ink-600 transition hover:text-ink-900 dark:text-ink-300 dark:hover:text-white"
            >
              Entire month
            </button>
            <button
              type="button"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              disabled={!hasSelection}
              className="text-[11px] font-semibold text-red-600 transition hover:text-red-700 disabled:opacity-40 disabled:hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

