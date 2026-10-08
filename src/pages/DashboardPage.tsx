import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Crown,
  FolderArchive,
  Gauge,
  IdCard,
  Loader2,
  Moon,
  Route as RouteIcon,
  Truck,
  Upload,
  Users,
} from 'lucide-react';
import { useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { useUserScope } from '../hooks/useUserScope';
import { collectCountedEvents } from '../lib/masterFleet';
import { normalizeVid } from '../lib/locationRules';
import { encodeTransporterSlug } from '../lib/transporterAnalytics';
import { EmptyState } from '../components/ui/EmptyState';
import { filterFilesByTransporter } from '../lib/transporterScope';
import {
  CurrentMonthChart,
  type DailyBucket,
} from '../features/dashboard/CurrentMonthChart';
import { fetchSnapshot, listSnapshots } from '../features/snapshots/snapshotsApi';
import type { SnapshotMeta } from '../lib/snapshots';
import type { MasterFleetRow } from '../lib/masterFleet';

/**
 * Legacy staff (no assigned transporters): the dashboard is intentionally a
 * dead end. Three tiles that link to the three uploaders — no totals, no
 * charts, no history — so nothing leaks back that they submitted.
 */
const LegacyStaffDashboard = () => (
  <div className="mx-auto w-full max-w-4xl">
    <PageHeader
      eyebrow="Welcome"
      title=""
      subtitle="Your job here is to upload the three violation exports. Only the boss can review, filter and delete them — you'll never see the parsed data back."
    />
    <div className="grid gap-4 sm:grid-cols-3">
      <Link to="/unfiltered" className="card-base group p-5 transition hover:-translate-y-0.5 hover:shadow-elev">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--color-brand-blue)', color: '#fff' }}>
            <Gauge size={18} />
          </span>
          <div>
            <p className="font-display text-lg font-semibold" style={{ color: 'var(--color-brand-blue-dark)' }}>Speed</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Overspeed exports</p>
          </div>
        </div>
        <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--color-brand-accent)' }}>
          Upload <ArrowRight size={14} />
        </p>
      </Link>
      <Link to="/unfiltered-nights" className="card-base group p-5 transition hover:-translate-y-0.5 hover:shadow-elev">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--color-brand-blue)', color: '#fff' }}>
            <Moon size={18} />
          </span>
          <div>
            <p className="font-display text-lg font-semibold" style={{ color: 'var(--color-brand-blue-dark)' }}>Nights</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Unauthorised time exports</p>
          </div>
        </div>
        <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--color-brand-accent)' }}>
          Upload <ArrowRight size={14} />
        </p>
      </Link>
      <Link to="/unfiltered-continuous" className="card-base group p-5 transition hover:-translate-y-0.5 hover:shadow-elev">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--color-brand-blue)', color: '#fff' }}>
            <RouteIcon size={18} />
          </span>
          <div>
            <p className="font-display text-lg font-semibold" style={{ color: 'var(--color-brand-blue-dark)' }}>Continuous</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Continuous-driving exports</p>
          </div>
        </div>
        <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--color-brand-accent)' }}>
          Upload <ArrowRight size={14} />
        </p>
      </Link>
    </div>
  </div>
);

const BossDashboard = () => {
  const user = useAppSelector((s) => s.auth.user);
  const rawSpeedFiles = useAppSelector((s) => s.unfiltered.files);
  const rawNightFiles = useAppSelector((s) => s.unfilteredNights.files);
  const rawContFiles = useAppSelector((s) => s.unfilteredContinuous.files);
  const driverRecords = useAppSelector((s) => s.drivers.records);
  const thresholds = useAppSelector((s) => s.rules.thresholds);
  const maxDurationSeconds = useAppSelector((s) => s.rules.maxDurationSeconds);
  const underestimatedRule = useAppSelector(
    (s) => s.rules.underestimatedRule ?? null,
  );
  const allowedVidsByType = useAppSelector((s) => s.rules.allowedVidsByType);
  const allowedLocationsByType = useAppSelector(
    (s) => s.rules.allowedLocationsByType,
  );
  const mergeNights = useAppSelector((s) => s.nightMerge.enabled);
  const { isBoss, isTransporterStaff, matchesBlock } = useUserScope();

  // Transporter-staff view still needs the file slices to compute its
  // per-transporter breakdown. The boss view below ignores these entirely
  // and only looks at saved-violation snapshots for the current month.
  const speedFiles = useMemo(
    () => filterFilesByTransporter(rawSpeedFiles, isTransporterStaff, matchesBlock),
    [rawSpeedFiles, isTransporterStaff, matchesBlock],
  );
  const nightFiles = useMemo(
    () => filterFilesByTransporter(rawNightFiles, isTransporterStaff, matchesBlock),
    [rawNightFiles, isTransporterStaff, matchesBlock],
  );
  const continuousFiles = useMemo(
    () => filterFilesByTransporter(rawContFiles, isTransporterStaff, matchesBlock),
    [rawContFiles, isTransporterStaff, matchesBlock],
  );

  // Boss landing shows saved violations ("snapshots") for the current
  // month only. The whole set is fetched once; filtering is done locally so
  // the daily chart and the stat cards stay in sync.
  const [snapshots, setSnapshots] = useState<SnapshotMeta[] | null>(null);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [snapshotsError, setSnapshotsError] = useState<string | null>(null);

  useEffect(() => {
    if (!isBoss) return;
    let cancelled = false;
    setSnapshotsLoading(true);
    setSnapshotsError(null);
    listSnapshots()
      .then((rows) => {
        if (!cancelled) setSnapshots(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setSnapshotsError(
            e instanceof Error ? e.message : 'Could not load saved violations.',
          );
      })
      .finally(() => {
        if (!cancelled) setSnapshotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isBoss]);

  const now = useMemo(() => new Date(), []);
  const monthLabel = useMemo(
    () =>
      now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    [now],
  );
  const daysInMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    [now],
  );

  const monthSnapshots = useMemo(() => {
    if (!snapshots) return [];
    const y = now.getFullYear();
    const m = now.getMonth();
    return snapshots.filter((s) => {
      const d = new Date(s.createdAt);
      if (Number.isNaN(d.getTime())) return false;
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [snapshots, now]);

  const monthDaily = useMemo<DailyBucket[]>(() => {
    const buckets: DailyBucket[] = Array.from(
      { length: daysInMonth },
      (_, i) => ({ day: i + 1, speed: 0, nights: 0, continuous: 0 }),
    );
    monthSnapshots.forEach((s) => {
      const d = new Date(s.createdAt);
      if (Number.isNaN(d.getTime())) return;
      const idx = d.getDate() - 1;
      if (idx < 0 || idx >= buckets.length) return;
      buckets[idx].speed += s.summary.speed;
      buckets[idx].nights += s.summary.nights;
      buckets[idx].continuous += s.summary.continuous;
    });
    return buckets;
  }, [monthSnapshots, daysInMonth]);

  const monthTotals = useMemo(
    () =>
      monthSnapshots.reduce(
        (acc, s) => ({
          speed: acc.speed + s.summary.speed,
          nights: acc.nights + s.summary.nights,
          continuous: acc.continuous + s.summary.continuous,
          drivers: acc.drivers + s.summary.drivers,
          transporters: acc.transporters + s.summary.transporters,
          total: acc.total + s.summary.total,
        }),
        { speed: 0, nights: 0, continuous: 0, drivers: 0, transporters: 0, total: 0 },
      ),
    [monthSnapshots],
  );

  const hasMonthData = monthSnapshots.length > 0 && monthTotals.total > 0;

  // Load full snapshot payloads for the current month so we can aggregate
  // per-driver rows across every snapshot saved since the 1st and rank the
  // top offenders. Snapshot payload is gzipped — small enough to fetch a
  // handful per month.
  const [monthRows, setMonthRows] = useState<MasterFleetRow[]>([]);
  const [topLoading, setTopLoading] = useState(false);
  const monthIds = useMemo(
    () => monthSnapshots.map((s) => s.id).sort().join(','),
    [monthSnapshots],
  );

  useEffect(() => {
    if (!isBoss) return;
    if (monthSnapshots.length === 0) {
      setMonthRows([]);
      return;
    }
    let cancelled = false;
    setTopLoading(true);
    Promise.all(monthSnapshots.map((s) => fetchSnapshot(s.id)))
      .then((results) => {
        if (cancelled) return;
        const combined = results.flatMap((r) => r.data.rows);
        setMonthRows(combined);
      })
      .catch(() => {
        if (!cancelled) setMonthRows([]);
      })
      .finally(() => {
        if (!cancelled) setTopLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBoss, monthIds]);

  const topOffenders = useMemo(() => {
    if (monthRows.length === 0) return [];
    const byVid = new Map<string, MasterFleetRow>();
    monthRows.forEach((r) => {
      const key = (r.vid || r.driverName).trim().toLowerCase();
      if (!key) return;
      const existing = byVid.get(key);
      if (existing) {
        existing.speed += r.speed;
        existing.nights += r.nights;
        existing.continuous += r.continuous;
        existing.total += r.total;
      } else {
        byVid.set(key, { ...r });
      }
    });
    return Array.from(byVid.values())
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total || a.driverName.localeCompare(b.driverName))
      .slice(0, 4);
  }, [monthRows]);

  // Per-assigned-transporter breakdown (transporter-staff view only).
  // Uses the same `collectCountedEvents` engine as Master Fleet + Analytics,
  // and — critically — resolves each event's transporter via the same
  // VID → roster canonical lookup the boss's Transporters page uses. That
  // way an event whose raw upload cell is blank or spelled differently is
  // still credited to the correct assigned transporter.
  const transporterBreakdown = useMemo(() => {
    if (!isTransporterStaff) return [];
    const assigned = user?.assignedTransporters ?? [];

    const vidToTransporter = new Map<string, string>();
    driverRecords.forEach((r) => {
      const key = normalizeVid(r.vid);
      if (!key) return;
      if (!vidToTransporter.has(key) && r.transporter) {
        vidToTransporter.set(key, r.transporter.trim());
      }
    });
    const resolveTransporter = (
      vidKey: string,
      blockTransporter: string,
      driverName: string,
    ): string => {
      const canonical = vidToTransporter.get(vidKey);
      if (canonical) return canonical.trim();
      if (blockTransporter && blockTransporter.trim()) return blockTransporter.trim();
      return driverName ? driverName.trim() : '';
    };

    const { events } = collectCountedEvents({
      speedFiles,
      nightFiles,
      continuousFiles,
      driverRecords,
      thresholds,
      allowedVidsByType,
      allowedLocationsByType,
      mergeNights,
      maxDurationSeconds,
      underestimatedRule,
    });
    // Rank the staff's assigned transporters by their own violation totals
    // (highest first). Staff never see the boss's global top-offender ranking;
    // this is the equivalent ranking, scoped to their assignment only.
    return assigned
      .map((t) => {
        const target = t.trim().toLowerCase();
        let speedEvents = 0;
        let nightRows = 0;
        let continuousRows = 0;
        let driverBlocks = 0;
        const seenVids = new Set<string>();
        events.forEach((e) => {
          const resolved = resolveTransporter(e.vidKey, e.transporter, e.driverName);
          if (resolved.trim().toLowerCase() !== target) return;
          if (e.vidKey && !seenVids.has(e.vidKey)) {
            seenVids.add(e.vidKey);
            driverBlocks += 1;
          }
          if (e.kind === 'speed') speedEvents += 1;
          else if (e.kind === 'nights') nightRows += 1;
          else continuousRows += 1;
        });
        const driverList = driverRecords.filter(
          (r) => (r.transporter ?? '').trim().toLowerCase() === target,
        );
        return {
          name: t,
          driverListCount: driverList.length,
          driverBlocks,
          speedEvents,
          nightRows,
          continuousRows,
          total: speedEvents + nightRows + continuousRows,
        };
      })
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.name.localeCompare(b.name);
      });
  }, [
    isTransporterStaff,
    user,
    speedFiles,
    nightFiles,
    continuousFiles,
    driverRecords,
    thresholds,
    allowedVidsByType,
    allowedLocationsByType,
    mergeNights,
    maxDurationSeconds,
    underestimatedRule,
  ]);

  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        eyebrow={
          isBoss ? monthLabel : isTransporterStaff ? 'Your workspace' : 'Welcome'
        }
        title=""
        subtitle={
          isBoss
            ? `Saved violations snapshotted this month. Everything below is scoped to ${monthLabel} only.`
            : isTransporterStaff
              ? `You are scoped to ${user.assignedTransporters?.length ?? 0} transporter${(user.assignedTransporters?.length ?? 0) === 1 ? '' : 's'}. Only their data appears below.`
              : 'Upload new violation reports and track your submission history.'
        }
        actions={
          isBoss ? (
            <Link to="/snapshots" className="btn-primary">
              <FolderArchive size={16} /> Saved violations
            </Link>
          ) : isTransporterStaff ? (
            <Link to="/unfiltered" className="btn-primary">
              <Upload size={16} /> Upload data
            </Link>
          ) : (
            <Link to="/unfiltered" className="btn-primary">
              <Upload size={16} /> Upload new data
            </Link>
          )
        }
      />

      {isBoss && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Saved this month"
            value={monthSnapshots.length}
            delta={`${monthLabel} snapshots`}
            icon={FolderArchive}
          />
          <StatCard
            label="Total violations"
            value={monthTotals.total.toLocaleString()}
            delta="From saved snapshots"
            icon={AlertTriangle}
            accent
          />
          <StatCard
            label="Drivers covered"
            value={monthTotals.drivers.toLocaleString()}
            delta="Across this month's snapshots"
            icon={Users}
          />
          <StatCard
            label="Transporters covered"
            value={monthTotals.transporters.toLocaleString()}
            delta="Across this month's snapshots"
            icon={Truck}
          />
        </div>
      )}

      {isBoss && snapshotsError && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 sm:p-5 dark:border-rose-800 dark:bg-rose-950/40">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white">
            <AlertTriangle size={16} />
          </span>
          <p className="flex-1 text-sm font-semibold text-rose-900 dark:text-rose-100">
            {snapshotsError}
          </p>
        </div>
      )}

      {isTransporterStaff && (
        <section className="mt-10">
          <div className="mb-4">
            <h2
              className="text-lg font-semibold tracking-tight"
              style={{ color: 'var(--color-brand-blue-dark)' }}
            >
              Your transporters
            </h2>
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Every upload here is filtered to just these transporters.
            </p>
          </div>

          {transporterBreakdown.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No transporters assigned"
              description="Ask the boss to assign at least one transporter to your account."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {transporterBreakdown.map((t, idx) => (
                <Link
                  key={t.name}
                  to={`/transporters/${encodeTransporterSlug(t.name)}`}
                  className="card-base group relative overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-elev"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p
                        className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                        style={{ color: 'var(--color-brand-accent)' }}
                      >
                        #{idx + 1} · Transporter
                      </p>
                      <h3
                        className="mt-1 truncate font-display text-xl font-semibold tracking-tight"
                        style={{ color: 'var(--color-brand-blue-dark)' }}
                      >
                        {t.name}
                      </h3>
                    </div>
                    <span
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: 'var(--color-brand-blue)',
                        color: '#ffffff',
                      }}
                    >
                      <Truck size={18} />
                    </span>
                  </div>

                  {t.total === 0 && t.driverListCount === 0 ? (
                    <p
                      className="mt-4 text-xs italic"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      No data found for this transporter yet.
                    </p>
                  ) : (
                    <>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div
                          className="rounded-xl p-2.5"
                          style={{
                            background: 'var(--color-brand-accent-soft)',
                            border: '1px solid var(--color-brand-accent-line)',
                          }}
                        >
                          <p
                            className="inline-flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--color-brand-accent-dark)' }}
                          >
                            <Gauge size={10} /> Speed
                          </p>
                          <p
                            className="mt-0.5 text-lg font-semibold"
                            style={{ color: 'var(--color-brand-blue-dark)' }}
                          >
                            {t.speedEvents}
                          </p>
                        </div>
                        <div
                          className="rounded-xl p-2.5"
                          style={{
                            background: 'var(--color-brand-blue-soft)',
                            border: '1px solid var(--color-brand-blue-line)',
                          }}
                        >
                          <p
                            className="inline-flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--color-brand-blue)' }}
                          >
                            <Moon size={10} /> Nights
                          </p>
                          <p
                            className="mt-0.5 text-lg font-semibold"
                            style={{ color: 'var(--color-brand-blue-dark)' }}
                          >
                            {t.nightRows}
                          </p>
                        </div>
                        <div
                          className="rounded-xl p-2.5"
                          style={{
                            background: 'var(--color-brand-blue-soft)',
                            border: '1px solid var(--color-brand-blue-line)',
                          }}
                        >
                          <p
                            className="inline-flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--color-brand-blue)' }}
                          >
                            <RouteIcon size={10} /> Cont.
                          </p>
                          <p
                            className="mt-0.5 text-lg font-semibold"
                            style={{ color: 'var(--color-brand-blue-dark)' }}
                          >
                            {t.continuousRows}
                          </p>
                        </div>
                      </div>

                      <div
                        className="mt-4 flex items-center justify-between pt-3 text-xs"
                        style={{
                          borderTop: '1px solid var(--color-brand-blue-line)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Users size={12} /> {t.driverListCount} in drivers list
                        </span>
                        <span>
                          <span
                            className="font-semibold"
                            style={{ color: 'var(--color-brand-accent-dark)' }}
                          >
                            {t.total}
                          </span>{' '}
                          events
                        </span>
                      </div>
                    </>
                  )}
                  <div
                    className="mt-4 flex items-center justify-end gap-1 text-xs font-semibold transition"
                    style={{ color: 'var(--color-brand-blue)' }}
                  >
                    View details
                    <ArrowRight
                      size={13}
                      className="transition group-hover:translate-x-0.5"
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {isBoss && (
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2
                className="text-lg font-semibold tracking-tight"
                style={{ color: 'var(--color-brand-blue-dark)' }}
              >
                Top offenders · {monthLabel}
              </h2>
              <p
                className="text-sm"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Ranked across every snapshot saved since the 1st of this month.
              </p>
            </div>
            {topLoading && (
              <span
                className="inline-flex items-center gap-1.5 text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Loader2 size={14} className="animate-spin" /> Loading
              </span>
            )}
          </div>

          {topOffenders.length === 0 ? (
            <div
              className="card-base flex items-center gap-3 p-5"
              style={{
                background:
                  'linear-gradient(135deg, var(--color-brand-blue-soft) 0%, #ffffff 100%)',
              }}
            >
              <span
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: 'var(--color-brand-blue-soft)',
                  color: 'var(--color-brand-blue)',
                  border: '1px solid var(--color-brand-blue-line)',
                }}
              >
                <Crown size={18} />
              </span>
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-brand-blue-dark)' }}
                >
                  No offenders ranked yet for {monthLabel}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Save a Master Fleet snapshot and the top 4 drivers will
                  appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {topOffenders.map((row, idx) => {
                const palette =
                  idx === 0
                    ? {
                        bar: 'var(--color-brand-accent)',
                        pipBg: 'var(--color-brand-accent-soft)',
                        pipColor: 'var(--color-brand-accent-dark)',
                        pipBorder: 'var(--color-brand-accent-line)',
                        accent: 'var(--color-brand-accent-dark)',
                      }
                    : {
                        bar: 'var(--color-brand-blue)',
                        pipBg: 'var(--color-brand-blue-soft)',
                        pipColor: 'var(--color-brand-blue)',
                        pipBorder: 'var(--color-brand-blue-line)',
                        accent: 'var(--color-brand-blue-dark)',
                      };
                return (
                  <div
                    key={`${row.vid}-${idx}`}
                    className="group card-base relative overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-elev"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-1"
                      style={{ background: palette.bar }}
                    />
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p
                          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                          style={{ color: 'var(--color-brand-accent)' }}
                        >
                          #{idx + 1} · Offender
                        </p>
                        <h3
                          className="mt-1 truncate font-display text-xl font-semibold tracking-tight"
                          style={{ color: 'var(--color-brand-blue-dark)' }}
                        >
                          {row.driverName || 'Not found'}
                        </h3>
                        <p
                          className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <span className="inline-flex items-center gap-1">
                            <IdCard size={12} /> VID {row.vid || '—'}
                          </span>
                          {row.transporter && (
                            <>
                              <span aria-hidden>·</span>
                              <span className="inline-flex items-center gap-1 truncate">
                                <Truck size={12} /> {row.transporter}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <span
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105"
                        style={{
                          background: palette.pipBg,
                          color: palette.pipColor,
                          border: `1px solid ${palette.pipBorder}`,
                        }}
                      >
                        {idx === 0 ? <Crown size={18} /> : <Gauge size={18} />}
                      </span>
                    </div>

                    <div className="mt-5 flex items-end justify-between">
                      <div>
                        <p
                          className="font-display text-4xl font-semibold leading-none tracking-tight"
                          style={{ color: palette.accent }}
                        >
                          {row.total}
                        </p>
                        <p
                          className="mt-1 text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          combined
                        </p>
                      </div>
                      <div
                        className="text-right text-[11px] leading-tight"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        <p>
                          <span
                            className="font-semibold"
                            style={{ color: 'var(--color-brand-blue-dark)' }}
                          >
                            {row.speed}
                          </span>{' '}
                          speed
                        </p>
                        <p>
                          <span
                            className="font-semibold"
                            style={{ color: 'var(--color-brand-blue-dark)' }}
                          >
                            {row.nights}
                          </span>{' '}
                          nights
                        </p>
                        <p>
                          <span
                            className="font-semibold"
                            style={{ color: 'var(--color-brand-blue-dark)' }}
                          >
                            {row.continuous}
                          </span>{' '}
                          cont.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {isBoss && (
        <section className="mt-8">
          <div
            className="card-base relative overflow-hidden p-5 sm:p-7"
            style={{
              background:
                'linear-gradient(135deg, var(--color-brand-blue-soft) 0%, #ffffff 55%, var(--color-brand-accent-soft) 100%)',
            }}
          >
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-start gap-3">
                <span
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-elev"
                  style={{
                    background:
                      'linear-gradient(145deg, var(--color-brand-blue) 0%, var(--color-brand-blue-dark) 100%)',
                    color: '#ffffff',
                  }}
                >
                  <BarChart3 size={18} />
                </span>
                <div>
                  <h2
                    className="text-lg font-semibold tracking-tight"
                    style={{ color: 'var(--color-brand-blue-dark)' }}
                  >
                    {monthLabel} · Saved violations
                  </h2>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Each bar sums the Speed, Nights and Continuous violations
                    from snapshots saved on that day.
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
                  {monthTotals.speed} speed
                </span>
                <span
                  className="rounded-full px-2.5 py-1 font-semibold"
                  style={{
                    background: 'var(--color-brand-blue-soft)',
                    color: 'var(--color-brand-blue-dark)',
                    border: '1px solid var(--color-brand-blue-line)',
                  }}
                >
                  {monthTotals.nights} nights
                </span>
                <span
                  className="rounded-full px-2.5 py-1 font-semibold"
                  style={{
                    background: 'var(--color-brand-blue-soft)',
                    color: 'var(--color-brand-blue-dark)',
                    border: '1px solid var(--color-brand-blue-line)',
                  }}
                >
                  {monthTotals.continuous} continuous
                </span>
                <span
                  className="rounded-full px-2.5 py-1 font-semibold text-white"
                  style={{
                    background:
                      'linear-gradient(145deg, var(--color-brand-blue) 0%, var(--color-brand-blue-dark) 100%)',
                  }}
                >
                  {monthTotals.total} total
                </span>
              </div>
            </div>

            {snapshotsLoading ? (
              <div
                className="flex h-[360px] items-center justify-center gap-2 text-sm"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Loader2 size={16} className="animate-spin" />
                Loading saved violations…
              </div>
            ) : hasMonthData ? (
              <CurrentMonthChart data={monthDaily} monthLabel={monthLabel} />
            ) : (
              <div
                className="relative overflow-hidden rounded-2xl"
                style={{
                  background:
                    'linear-gradient(145deg, rgba(62,85,165,0.06) 0%, rgba(244,130,33,0.04) 100%)',
                  minHeight: 360,
                }}
              >
                <CurrentMonthChart data={monthDaily} monthLabel={monthLabel} />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className="pointer-events-auto flex max-w-sm flex-col items-center gap-3 rounded-2xl p-6 text-center shadow-elev"
                    style={{
                      background: 'rgba(255,255,255,0.92)',
                      border: '1px solid var(--color-brand-blue-line)',
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    <span
                      className="inline-flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{
                        background: 'var(--color-brand-blue-soft)',
                        color: 'var(--color-brand-blue)',
                        border: '1px solid var(--color-brand-blue-line)',
                      }}
                    >
                      <FolderArchive size={20} />
                    </span>
                    <div>
                      <p
                        className="text-base font-semibold"
                        style={{ color: 'var(--color-brand-blue-dark)' }}
                      >
                        Nothing uploaded yet for {monthLabel}
                      </p>
                      <p
                        className="mt-1 text-xs"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        Save a Master Fleet snapshot this month and it will
                        appear right here.
                      </p>
                    </div>
                    <Link to="/snapshots" className="btn-primary mt-1">
                      <FolderArchive size={16} /> Go to saved violations
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export const DashboardPage = () => {
  const { isLegacyStaff } = useUserScope();
  return isLegacyStaff ? <LegacyStaffDashboard /> : <BossDashboard />;
};
