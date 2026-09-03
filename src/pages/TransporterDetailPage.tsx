import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Gauge,
  GitMerge,
  IdCard,
  MapPin,
  Moon,
  Route as RouteIcon,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { StatCard } from '../components/ui/StatCard';
import { collectFilteredEvents } from '../lib/masterFleet';
import type {
  FilteredContinuousEvent,
  FilteredNightEvent,
  FilteredSpeedEvent,
} from '../lib/masterFleet';
import { decodeTransporterSlug } from '../lib/transporterAnalytics';
import { filterFilesByTransporter } from '../lib/transporterScope';
import { useUserScope } from '../hooks/useUserScope';
import { eventDateKey } from '../lib/locationRules';

const MONTH_LABELS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Format a "YYYY-MM-DD" bucket key into "Fri, Jun 5, 2026". */
const formatBusinessDay = (key: string): string => {
  const [y, mo, d] = key.split('-').map(Number);
  if (!y || !mo || !d) return key;
  const dt = new Date(Date.UTC(y, mo - 1, d, 12));
  return `${WEEKDAY_LABELS[dt.getUTCDay()]}, ${MONTH_LABELS_SHORT[mo - 1]} ${d}, ${y}`;
};

type EventTab = 'speed' | 'nights' | 'continuous';

const TAB_META: Record<EventTab, { label: string; icon: typeof Gauge }> = {
  speed: { label: 'Speed', icon: Gauge },
  nights: { label: 'Nights', icon: Moon },
  continuous: { label: 'Continuous', icon: RouteIcon },
};

const matches = (a: string, b: string): boolean =>
  (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

export const TransporterDetailPage = () => {
  const { transporter } = useParams<{ transporter: string }>();
  const navigate = useNavigate();
  const target = decodeTransporterSlug(transporter ?? '');

  const rawSpeed = useAppSelector((s) => s.unfiltered.files);
  const rawNights = useAppSelector((s) => s.unfilteredNights.files);
  const rawCont = useAppSelector((s) => s.unfilteredContinuous.files);
  const driverRecords = useAppSelector((s) => s.drivers.records);
  const thresholds = useAppSelector((s) => s.rules.thresholds);
  const allowedVidsByType = useAppSelector((s) => s.rules.allowedVidsByType);
  const allowedLocationsByType = useAppSelector(
    (s) => s.rules.allowedLocationsByType,
  );
  const mergeNights = useAppSelector((s) => s.nightMerge.enabled);
  const { isTransporterStaff, matchesTransporter } = useUserScope();

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
        mergeNights,
      }),
    [
      speedFiles,
      nightFiles,
      continuousFiles,
      driverRecords,
      thresholds,
      allowedVidsByType,
      allowedLocationsByType,
      mergeNights,
    ],
  );

  const scoped = useMemo(() => {
    const speed = filteredEvents.speed.filter((e) => matches(e.transporter, target));
    const nights = filteredEvents.nights.filter((e) => matches(e.transporter, target));
    const continuous = filteredEvents.continuous.filter((e) =>
      matches(e.transporter, target),
    );
    return { speed, nights, continuous };
  }, [filteredEvents, target]);

  const vidCount = useMemo(() => {
    const set = new Set<string>();
    [...scoped.speed, ...scoped.nights, ...scoped.continuous].forEach((e) => {
      if (e.vid) set.add(e.vid);
    });
    return set.size;
  }, [scoped]);

  const [tab, setTab] = useState<EventTab>('speed');

  const counts = {
    speed: scoped.speed.length,
    nights: scoped.nights.length,
    continuous: scoped.continuous.length,
  };
  const total = counts.speed + counts.nights + counts.continuous;
  const hasAny = total > 0;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        eyebrow="Transporter workspace"
        title={target || 'Transporter'}
        subtitle="Every violation attributed to this transporter, one by one."
        actions={
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-ghost"
          >
            <ArrowLeft size={14} /> Back
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total violations" value={total} icon={Truck} />
        <StatCard label="Speed events" value={counts.speed} icon={Gauge} />
        <StatCard label="Night rows" value={counts.nights} icon={Moon} />
        <StatCard
          label="Continuous rows"
          value={counts.continuous}
          icon={RouteIcon}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
        <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 font-semibold text-ink-700 dark:bg-ink-800 dark:text-ink-200">
          <IdCard size={11} /> {vidCount} VID{vidCount === 1 ? '' : 's'}
        </span>
        <Link
          to="/master-fleet"
          className="ml-auto text-[11px] font-semibold text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
        >
          Open master fleet →
        </Link>
      </div>

      {!hasAny ? (
        <div className="mt-8">
          <EmptyState
            icon={Truck}
            title="No data found"
            description={`No speed, night or continuous events pass the current thresholds for ${target || 'this transporter'}.`}
          />
        </div>
      ) : (
        <section className="surface mt-8 rounded-2xl p-5 sm:p-7">
          <div className="mb-4 inline-flex rounded-xl border border-ink-100 bg-ink-50 p-1 dark:border-ink-800 dark:bg-ink-900">
            {(Object.keys(TAB_META) as EventTab[]).map((t) => {
              const { label, icon: Icon } = TAB_META[t];
              const active = t === tab;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
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

          {tab === 'speed' && <SpeedList events={scoped.speed} />}
          {tab === 'nights' && <NightList events={scoped.nights} />}
          {tab === 'continuous' && <ContinuousList events={scoped.continuous} />}
        </section>
      )}
    </div>
  );
};

const RowShell = ({
  index,
  vid,
  driverName,
  timeA,
  timeB,
  duration,
  allowedVid,
  allowedLocation,
  mergedCount,
  children,
}: {
  index: number;
  vid: string;
  driverName: string;
  timeA: string;
  timeB: string;
  duration: string;
  allowedVid?: boolean;
  allowedLocation?: boolean;
  mergedCount?: number;
  children?: React.ReactNode;
}) => (
  <li
    className={
      'rounded-xl border p-4 ' +
      (allowedVid || allowedLocation
        ? 'border-red-200 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/20'
        : 'border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900')
    }
  >
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
        <span className="rounded-md bg-ink-900 px-2 py-0.5 font-mono text-[11px] font-semibold text-white dark:bg-white dark:text-ink-900">
          #{index + 1}
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-ink-800 dark:text-ink-100">
          <IdCard size={11} /> {vid || '—'}
        </span>
        {mergedCount && mergedCount > 1 && (
          <span
            title={`Merged ${mergedCount} night events from the same 18:00–06:00 shift`}
            className="inline-flex items-center gap-1 rounded-full bg-brand-blue-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand-blue-dark ring-1 ring-brand-blue-line"
          >
            <GitMerge size={10} /> Merged ×{mergedCount}
          </span>
        )}
        <span>·</span>
        <span className="truncate text-ink-800 dark:text-ink-100">
          {driverName || 'Not found'}
        </span>
        {allowedVid && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800 ring-1 ring-red-200 dark:bg-red-900/60 dark:text-red-100 dark:ring-red-800">
            <ShieldCheck size={10} /> Allowed VID
          </span>
        )}
        {allowedLocation && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-800 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800">
            <MapPin size={10} /> Allowed location
          </span>
        )}
      </div>
      <span className="font-mono text-xs font-semibold text-ink-800 dark:text-ink-100">
        {duration}
      </span>
    </div>
    <div className="grid grid-cols-1 gap-1 text-xs text-ink-600 dark:text-ink-300 sm:grid-cols-2">
      <span>
        <span className="font-semibold text-ink-500 dark:text-ink-400">Time A: </span>
        <span className="font-mono text-ink-800 dark:text-ink-100">
          {timeA || '—'}
        </span>
      </span>
      <span>
        <span className="font-semibold text-ink-500 dark:text-ink-400">Time B: </span>
        <span className="font-mono text-ink-800 dark:text-ink-100">
          {timeB || '—'}
        </span>
      </span>
    </div>
    {children}
  </li>
);

const PositionAB = ({
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
    <div className="mt-2 flex flex-col gap-1 text-xs text-ink-600 dark:text-ink-300">
      {row('A', positionA, matchedA)}
      {row('B', positionB, matchedB)}
    </div>
  );
};

const DayGroupHeader = ({ dateKey, count }: { dateKey: string; count: number }) => (
  <li className="sticky top-0 z-10 -mx-1 flex items-center justify-between rounded-lg bg-ink-900/95 px-3 py-2 text-xs font-semibold text-white shadow-card backdrop-blur dark:bg-white/95 dark:text-ink-900">
    <span className="inline-flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">
        Day
      </span>
      {formatBusinessDay(dateKey)}
    </span>
    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold dark:bg-ink-900/15">
      {count} violation{count === 1 ? '' : 's'}
    </span>
  </li>
);

/**
 * Group flat events by calendar day (parsed from the primary/secondary time
 * fields) and hand back a stable, chronologically-sorted list of
 * `{ dateKey, events }` sections. Events with no parseable date fall into
 * a single trailing "Unknown date" bucket so the boss can still see them.
 */
const groupByDay = <T extends { timeA?: string; timeB?: string; start?: string; end?: string }>(
  events: T[],
  primary: (e: T) => string,
  secondary: (e: T) => string,
): Array<{ dateKey: string; events: T[] }> => {
  const buckets = new Map<string, T[]>();
  const order: string[] = [];
  events.forEach((e) => {
    const key = eventDateKey(primary(e), secondary(e)) ?? '__unknown';
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(e);
  });
  order.sort((a, b) => {
    if (a === '__unknown') return 1;
    if (b === '__unknown') return -1;
    return b.localeCompare(a);
  });
  return order.map((dateKey) => ({
    dateKey: dateKey === '__unknown' ? 'Unknown date' : dateKey,
    events: buckets.get(dateKey)!,
  }));
};

const SpeedList = ({ events }: { events: FilteredSpeedEvent[] }) => {
  const groups = useMemo(
    () => groupByDay(events, (e) => e.start, (e) => e.end),
    [events],
  );
  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-8 text-center text-sm text-ink-500 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-400">
        No speed events for this transporter.
      </p>
    );
  }
  let running = 0;
  return (
    <ul className="space-y-3">
      {groups.map(({ dateKey, events: bucket }) => (
        <div key={dateKey} className="space-y-3">
          <DayGroupHeader
            dateKey={dateKey === 'Unknown date' ? dateKey : dateKey}
            count={bucket.length}
          />
          {bucket.map((e) => {
            const i = running++;
            return (
              <RowShell
                key={e.id}
                index={i}
                vid={e.vid}
                driverName={e.driverName}
                timeA={e.start}
                timeB={e.end}
                duration={e.duration}
                allowedVid={e.allowedVid}
                allowedLocation={e.allowedLocation}
              >
                <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-ink-600 dark:text-ink-300 sm:grid-cols-2">
                  <span>
                    <span className="font-semibold text-ink-500 dark:text-ink-400">
                      Top speed:{' '}
                    </span>
                    <span className="text-ink-800 dark:text-ink-100">
                      {e.topSpeed || '—'}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="font-semibold text-ink-500 dark:text-ink-400">
                      Position:{' '}
                    </span>
                    <span
                      className={
                        e.allowedLocation
                          ? 'font-semibold text-red-800 dark:text-red-200'
                          : 'text-ink-800 dark:text-ink-100'
                      }
                    >
                      {e.overspeedPosition || '—'}
                    </span>
                  </span>
                </div>
              </RowShell>
            );
          })}
        </div>
      ))}
    </ul>
  );
};

const NightList = ({ events }: { events: FilteredNightEvent[] }) => {
  const groups = useMemo(
    () => groupByDay(events, (e) => e.timeA, (e) => e.timeB),
    [events],
  );
  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-8 text-center text-sm text-ink-500 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-400">
        No night events for this transporter.
      </p>
    );
  }
  let running = 0;
  return (
    <ul className="space-y-3">
      {groups.map(({ dateKey, events: bucket }) => (
        <div key={dateKey} className="space-y-3">
          <DayGroupHeader dateKey={dateKey} count={bucket.length} />
          {bucket.map((e) => {
            const i = running++;
            return (
              <RowShell
                key={e.id}
                index={i}
                vid={e.vid}
                driverName={e.driverName}
                timeA={e.timeA}
                timeB={e.timeB}
                duration={e.duration}
                allowedVid={e.allowedVid}
                allowedLocation={e.allowedLocation}
                mergedCount={e.mergedCount}
              >
                <PositionAB
                  positionA={e.positionA}
                  positionB={e.positionB}
                  matchedA={e.allowedLocationA}
                  matchedB={e.allowedLocationB}
                />
              </RowShell>
            );
          })}
        </div>
      ))}
    </ul>
  );
};

const ContinuousList = ({ events }: { events: FilteredContinuousEvent[] }) => {
  const groups = useMemo(
    () => groupByDay(events, (e) => e.timeA, (e) => e.timeB),
    [events],
  );
  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-8 text-center text-sm text-ink-500 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-400">
        No continuous events for this transporter.
      </p>
    );
  }
  let running = 0;
  return (
    <ul className="space-y-3">
      {groups.map(({ dateKey, events: bucket }) => (
        <div key={dateKey} className="space-y-3">
          <DayGroupHeader dateKey={dateKey} count={bucket.length} />
          {bucket.map((e) => {
            const i = running++;
            return (
              <RowShell
                key={e.id}
                index={i}
                vid={e.vid}
                driverName={e.driverName}
                timeA={e.timeA}
                timeB={e.timeB}
                duration={e.duration}
                allowedVid={e.allowedVid}
                allowedLocation={e.allowedLocation}
              >
                <div className="mt-2 text-xs text-ink-600 dark:text-ink-300">
                  <span className="font-semibold text-ink-500 dark:text-ink-400">
                    Length:{' '}
                  </span>
                  <span className="text-ink-800 dark:text-ink-100">
                    {e.length || '—'}
                  </span>
                </div>
                <PositionAB
                  positionA={e.positionA}
                  positionB={e.positionB}
                  matchedA={e.allowedLocationA}
                  matchedB={e.allowedLocationB}
                />
              </RowShell>
            );
          })}
        </div>
      ))}
    </ul>
  );
};
