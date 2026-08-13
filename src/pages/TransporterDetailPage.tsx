import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Gauge,
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
  const rawDriverRecords = useAppSelector((s) => s.drivers.records);
  const thresholds = useAppSelector((s) => s.rules.thresholds);
  const allowedVidsByType = useAppSelector((s) => s.rules.allowedVidsByType);
  const allowedLocations = useAppSelector((s) => s.rules.allowedLocations);
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
  const driverRecords = useMemo(
    () =>
      isTransporterStaff
        ? rawDriverRecords.filter((r) => matchesTransporter(r.transporter))
        : rawDriverRecords,
    [rawDriverRecords, isTransporterStaff, matchesTransporter],
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
        allowedLocations,
      }),
    [
      speedFiles,
      nightFiles,
      continuousFiles,
      driverRecords,
      thresholds,
      allowedVidsByType,
      allowedLocations,
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
        <span className="font-mono text-ink-800 dark:text-ink-100">{timeA || '—'}</span>
      </span>
      <span>
        <span className="font-semibold text-ink-500 dark:text-ink-400">Time B: </span>
        <span className="font-mono text-ink-800 dark:text-ink-100">{timeB || '—'}</span>
      </span>
    </div>
    {children}
  </li>
);

const SpeedList = ({ events }: { events: FilteredSpeedEvent[] }) =>
  events.length === 0 ? (
    <p className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-8 text-center text-sm text-ink-500 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-400">
      No speed events for this transporter.
    </p>
  ) : (
    <ul className="space-y-3">
      {events.map((e, i) => (
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
              <span className="font-semibold text-ink-500 dark:text-ink-400">Top speed: </span>
              <span className="text-ink-800 dark:text-ink-100">{e.topSpeed || '—'}</span>
            </span>
            <span className="min-w-0">
              <span className="font-semibold text-ink-500 dark:text-ink-400">Position: </span>
              <span className="text-ink-800 dark:text-ink-100">
                {e.overspeedPosition || '—'}
              </span>
            </span>
          </div>
        </RowShell>
      ))}
    </ul>
  );

const NightList = ({ events }: { events: FilteredNightEvent[] }) =>
  events.length === 0 ? (
    <p className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-8 text-center text-sm text-ink-500 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-400">
      No night events for this transporter.
    </p>
  ) : (
    <ul className="space-y-3">
      {events.map((e, i) => (
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
            <span className="font-semibold text-ink-500 dark:text-ink-400">Position: </span>
            <span className="text-ink-800 dark:text-ink-100">{e.position || '—'}</span>
          </div>
        </RowShell>
      ))}
    </ul>
  );

const ContinuousList = ({ events }: { events: FilteredContinuousEvent[] }) =>
  events.length === 0 ? (
    <p className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-8 text-center text-sm text-ink-500 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-400">
      No continuous events for this transporter.
    </p>
  ) : (
    <ul className="space-y-3">
      {events.map((e, i) => (
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
          <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-ink-600 dark:text-ink-300 sm:grid-cols-2">
            <span>
              <span className="font-semibold text-ink-500 dark:text-ink-400">Length: </span>
              <span className="text-ink-800 dark:text-ink-100">{e.length || '—'}</span>
            </span>
            <span className="min-w-0">
              <span className="font-semibold text-ink-500 dark:text-ink-400">Position: </span>
              <span className="text-ink-800 dark:text-ink-100">{e.position || '—'}</span>
            </span>
          </div>
        </RowShell>
      ))}
    </ul>
  );
