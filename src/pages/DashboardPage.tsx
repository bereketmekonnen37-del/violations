import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  FileStack,
  FileText,
  Gauge,
  Moon,
  Route as RouteIcon,
  Truck,
  Upload,
  Users,
} from 'lucide-react';
import { useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate, formatDateTime } from '../lib/utils';
import { useUserScope } from '../hooks/useUserScope';
import {
  computeDashboardAnalytics,
  fillDailyRange,
} from '../lib/dashboardAnalytics';
import { filterFilesByTransporter } from '../lib/transporterScope';
import { collectCountedEvents } from '../lib/masterFleet';
import { normalizeVid } from '../lib/locationRules';
import { encodeTransporterSlug } from '../lib/transporterAnalytics';
import { DailyViolationsChart } from '../features/dashboard/DailyViolationsChart';
import { TopOffenderCards } from '../features/dashboard/TopOffenderCards';

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

  const hasBossView = isBoss || isTransporterStaff;

  // Every top-of-dashboard stat is derived from the three unfiltered slices
  // so the Overview cards agree with Uploaded Data, Master Fleet and the
  // Transporter analytics pages. The old `s.uploads.files` slice is legacy
  // and stays empty for new uploads, which is why these cards used to
  // render `0` across the board.
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
  const analytics = useMemo(
    () =>
      computeDashboardAnalytics({
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
      maxDurationSeconds,
      underestimatedRule,
    ],
  );

  const dailySeries = useMemo(
    () => fillDailyRange(analytics.daily),
    [analytics.daily],
  );

  // Same "rules hid all my data" detection MasterFleetPage does. Uploaded
  // events are counted raw here; when a category has raw > 0 but analytics
  // totals = 0, the current thresholds/whitelists have silently dropped
  // everything. The banner below flags it so the boss doesn't sit staring
  // at 0s wondering where the data went.
  const rawTotals = useMemo(() => {
    let speed = 0;
    let nights = 0;
    let continuous = 0;
    speedFiles.forEach((f) => f.drivers.forEach((d) => (speed += d.events.length)));
    nightFiles.forEach((f) => f.drivers.forEach((d) => (nights += d.rows.length)));
    continuousFiles.forEach((f) => f.drivers.forEach((d) => (continuous += d.rows.length)));
    return { speed, nights, continuous };
  }, [speedFiles, nightFiles, continuousFiles]);

  const zeroedKinds = useMemo(
    () =>
      (['speed', 'nights', 'continuous'] as const).filter(
        (k) => rawTotals[k] > 0 && analytics.totals[k] === 0,
      ),
    [rawTotals, analytics.totals],
  );

  const analyticsTotal =
    analytics.totals.speed + analytics.totals.nights + analytics.totals.continuous;

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
    return assigned.map((t) => {
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

  // Same numbers the Uploaded Data page shows: every Speed event, every
  // Nights row, every Continuous row across all uploaded files. Distinct
  // drivers/transporters use normalized keys so identical values with
  // different casing/whitespace don't inflate the counts.
  const filesCount = speedFiles.length + nightFiles.length + continuousFiles.length;
  let totalViolations = 0;
  const driverKeys = new Set<string>();
  const transporterKeys = new Set<string>();
  const addDriver = (vid: string, name: string) => {
    const key = vid.trim().toLowerCase() || name.trim().toLowerCase();
    if (key) driverKeys.add(key);
  };
  const addTransporter = (raw: string) => {
    const key = (raw ?? '').trim().toLowerCase();
    if (key) transporterKeys.add(key);
  };
  speedFiles.forEach((f) =>
    f.drivers.forEach((d) => {
      totalViolations += d.events.length;
      addDriver(d.vid, d.driverName);
      addTransporter(d.transporter);
    }),
  );
  nightFiles.forEach((f) =>
    f.drivers.forEach((d) => {
      totalViolations += d.rows.length;
      addDriver(d.vid, d.driverName);
      addTransporter(d.transporter);
    }),
  );
  continuousFiles.forEach((f) =>
    f.drivers.forEach((d) => {
      totalViolations += d.rows.length;
      addDriver(d.vid, d.driverName);
      addTransporter(d.transporter);
    }),
  );

  interface RecentUpload {
    id: string;
    kind: 'speed' | 'nights' | 'continuous';
    title: string;
    uploadDate: string;
    uploaderName: string;
    fileType: string;
    records: number;
  }
  const recent: RecentUpload[] = [
    ...speedFiles.map((f) => ({
      id: f.id,
      kind: 'speed' as const,
      title: f.title,
      uploadDate: f.uploadDate,
      uploaderName: f.uploaderName,
      fileType: f.fileType,
      records: f.drivers.reduce((n, d) => n + d.events.length, 0),
    })),
    ...nightFiles.map((f) => ({
      id: f.id,
      kind: 'nights' as const,
      title: f.title,
      uploadDate: f.uploadDate,
      uploaderName: f.uploaderName,
      fileType: f.fileType,
      records: f.drivers.reduce((n, d) => n + d.rows.length, 0),
    })),
    ...continuousFiles.map((f) => ({
      id: f.id,
      kind: 'continuous' as const,
      title: f.title,
      uploadDate: f.uploadDate,
      uploaderName: f.uploaderName,
      fileType: f.fileType,
      records: f.drivers.reduce((n, d) => n + d.rows.length, 0),
    })),
  ]
    .sort(
      (a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        eyebrow={
          isBoss ? 'Overview' : isTransporterStaff ? 'Your workspace' : 'Welcome'
        }
        title=""
        subtitle={
          isBoss
            ? 'Real-time view of uploaded violation reports, drivers and transporters.'
            : isTransporterStaff
              ? `You are scoped to ${user.assignedTransporters?.length ?? 0} transporter${(user.assignedTransporters?.length ?? 0) === 1 ? '' : 's'}. Only their data appears below.`
              : 'Upload new violation reports and track your submission history.'
        }
        actions={
          isBoss ? (
            <Link to="/uploaded-data" className="btn-primary">
              View all files <ArrowRight size={16} />
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Uploaded files"
          value={filesCount}
          delta={`${recent.length} in the last batch`}
          icon={FileStack}
        />
        <StatCard
          label="Total violations"
          value={totalViolations.toLocaleString()}
          delta="Across all uploads"
          icon={AlertTriangle}
        />
        <StatCard
          label="Unique drivers"
          value={driverKeys.size}
          delta="Detected from records"
          icon={Users}
        />
        <StatCard
          label="Transporters"
          value={transporterKeys.size}
          delta="Carriers represented"
          icon={Truck}
        />
      </div>

      {zeroedKinds.length > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 sm:p-5 dark:border-amber-800 dark:bg-amber-950/40">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
            <AlertTriangle size={16} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Your Rules are hiding {zeroedKinds.length === 1 ? 'a category' : 'categories'} of uploaded data
            </p>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
              {zeroedKinds
                .map(
                  (k) =>
                    `${k === 'speed' ? 'Speed' : k === 'nights' ? 'Nights' : 'Continuous'} — ${rawTotals[k].toLocaleString()} uploaded, 0 kept`,
                )
                .join(' · ')}
              . Lower the minimum duration on the Rules page (or clear a whitelist) so real events start counting.
            </p>
          </div>
          {isBoss && (
            <Link
              to="/rules"
              className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
            >
              Open Rules
            </Link>
          )}
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
              {transporterBreakdown.map((t) => (
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
                        Transporter
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
        <section className="mt-10">
          <div className="mb-4">
            <h2
              className="text-lg font-semibold tracking-tight"
              style={{ color: 'var(--color-brand-blue-dark)' }}
            >
              Top offenders
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Ranked from unfiltered Speed, Nights and Continuous uploads —
              scored against the current threshold rules.
            </p>
          </div>
          <TopOffenderCards top={analytics.top} />
        </section>
      )}

      {isBoss && (
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
                  <BarChart3 size={18} />
                </span>
                <div>
                  <h2
                    className="text-lg font-semibold tracking-tight"
                    style={{ color: 'var(--color-brand-blue-dark)' }}
                  >
                    Daily violations trend
                  </h2>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Every day on record, oldest to newest · Speed, Nights and
                    Continuous events counted against your rule thresholds.
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
                  {analytics.totals.speed} speed
                </span>
                <span
                  className="rounded-full px-2.5 py-1 font-semibold"
                  style={{
                    background: 'var(--color-brand-blue-soft)',
                    color: 'var(--color-brand-blue-dark)',
                    border: '1px solid var(--color-brand-blue-line)',
                  }}
                >
                  {analytics.totals.nights} nights
                </span>
                <span
                  className="rounded-full px-2.5 py-1 font-semibold"
                  style={{
                    background: 'var(--color-brand-blue-soft)',
                    color: 'var(--color-brand-blue-dark)',
                    border: '1px solid var(--color-brand-blue-line)',
                  }}
                >
                  {analytics.totals.continuous} continuous
                </span>
                <span
                  className="rounded-full px-2.5 py-1 font-semibold"
                  style={{
                    background: 'var(--color-brand-blue)',
                    color: '#ffffff',
                  }}
                >
                  {analyticsTotal} total
                </span>
              </div>
            </div>
            <DailyViolationsChart data={dailySeries} />
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2
              className="text-lg font-semibold tracking-tight"
              style={{ color: 'var(--color-brand-blue-dark)' }}
            >
              Recent uploads
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {hasBossView ? 'Latest reports submitted to the platform.' : 'Your latest submissions.'}
            </p>
          </div>
          {hasBossView && filesCount > 0 && (
            <Link
              to="/uploaded-data"
              className="hidden text-sm font-semibold sm:inline-flex sm:items-center sm:gap-1 hover:underline"
              style={{ color: 'var(--color-brand-accent)' }}
            >
              View all <ArrowUpRight size={14} />
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No uploads yet"
            description={
              hasBossView
                ? 'Once staff submit violation reports, they will appear here for review.'
                : 'Upload your first CSV, XLSX or PDF to get started.'
            }
            action={
              !hasBossView && (
                <Link to="/unfiltered" className="btn-primary">
                  <Upload size={16} /> Upload data
                </Link>
              )
            }
          />
        ) : (
          <div className="card-base overflow-hidden">
            <ul
              className="divide-y"
              style={{ borderColor: 'var(--color-brand-blue-line)' }}
            >
              {recent.map((file) => (
                <li
                  key={`${file.kind}-${file.id}`}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                  style={{ borderColor: 'var(--color-brand-blue-line)' }}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: 'var(--color-brand-blue-soft)',
                        color: 'var(--color-brand-blue)',
                        border: '1px solid var(--color-brand-blue-line)',
                      }}
                    >
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-semibold"
                        style={{ color: 'var(--color-brand-blue-dark)' }}
                      >
                        {file.title}
                      </p>
                      <p
                        className="mt-0.5 truncate text-xs"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {formatDateTime(file.uploadDate)} · {file.uploaderName}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{file.fileType.toUpperCase()}</Badge>
                    <Badge
                      tone={
                        file.kind === 'speed'
                          ? 'accent'
                          : file.kind === 'nights'
                            ? 'info'
                            : 'success'
                      }
                    >
                      {file.kind === 'speed'
                        ? `${file.records} events`
                        : `${file.records} rows`}
                    </Badge>
                    {hasBossView && (
                      <Link
                        to="/uploaded-data"
                        className="btn-secondary !py-1.5 !text-xs"
                      >
                        View <ArrowRight size={13} />
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {hasBossView && recent.length > 0 && (
        <section className="mt-10">
          <h2
            className="mb-4 text-lg font-semibold tracking-tight"
            style={{ color: 'var(--color-brand-blue-dark)' }}
          >
            File summaries
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {recent.slice(0, 6).map((f) => (
              <Link
                key={`${f.kind}-${f.id}`}
                to="/uploaded-data"
                className="card-base group p-5 transition hover:-translate-y-0.5 hover:shadow-elev"
              >
                <div className="flex items-center justify-between">
                  <Badge tone="neutral">{f.fileType.toUpperCase()}</Badge>
                  <span
                    className="text-[11px]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {formatDate(f.uploadDate)}
                  </span>
                </div>
                <p
                  className="mt-4 line-clamp-2 text-base font-semibold"
                  style={{ color: 'var(--color-brand-blue-dark)' }}
                >
                  {f.title}
                </p>
                <div
                  className="mt-4 flex items-center justify-between pt-4 text-xs"
                  style={{
                    borderTop: '1px solid var(--color-brand-blue-line)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <span>
                    {f.records} {f.kind === 'speed' ? 'events' : 'rows'}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 font-semibold"
                    style={{ color: 'var(--color-brand-accent)' }}
                  >
                    View details <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
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
