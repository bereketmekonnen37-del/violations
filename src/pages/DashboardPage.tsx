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
  Trophy,
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
  fillDailyWindow,
} from '../lib/dashboardAnalytics';
import { filterFilesByTransporter } from '../lib/transporterScope';
import { parseDurationSeconds } from '../lib/duration';
import { DailyViolationsChart } from '../features/dashboard/DailyViolationsChart';
import { TopOffenderCards } from '../features/dashboard/TopOffenderCards';
import { TransporterAnalytics } from '../features/dashboard/TransporterAnalytics';
import { computeTransporterAnalytics } from '../lib/transporterAnalytics';

const DAILY_WINDOW = 14;

export const DashboardPage = () => {
  const user = useAppSelector((s) => s.auth.user);
  const allFiles = useAppSelector((s) => s.uploads.files);
  const rawSpeedFiles = useAppSelector((s) => s.unfiltered.files);
  const rawNightFiles = useAppSelector((s) => s.unfilteredNights.files);
  const rawContFiles = useAppSelector((s) => s.unfilteredContinuous.files);
  const driverRecords = useAppSelector((s) => s.drivers.records);
  const thresholds = useAppSelector((s) => s.rules.thresholds);
  const allowedVidsByType = useAppSelector((s) => s.rules.allowedVidsByType);
  const allowedLocationsByType = useAppSelector(
    (s) => s.rules.allowedLocationsByType,
  );
  const { isBoss, isTransporterStaff, matchesTransporter } = useUserScope();

  const hasBossView = isBoss || isTransporterStaff;

  const scopedFiles = hasBossView
    ? allFiles
    : allFiles.filter((f) => f.uploaderId === user?.id);

  // For transporter staff, keep only files that contain at least one record
  // from an assigned transporter, and filter down the records themselves.
  const files = isTransporterStaff
    ? scopedFiles
        .map((f) => {
          const records = f.records.filter((r) => matchesTransporter(r.transporter));
          return { ...f, records, rowCount: records.length };
        })
        .filter((f) => f.records.length > 0)
    : scopedFiles;

  // Analytics: filter unfiltered files by transporter for scoped staff.
  const speedFiles = useMemo(
    () => filterFilesByTransporter(rawSpeedFiles, isTransporterStaff, matchesTransporter),
    [rawSpeedFiles, isTransporterStaff, matchesTransporter],
  );
  const nightFiles = useMemo(
    () => filterFilesByTransporter(rawNightFiles, isTransporterStaff, matchesTransporter),
    [rawNightFiles, isTransporterStaff, matchesTransporter],
  );
  const continuousFiles = useMemo(
    () => filterFilesByTransporter(rawContFiles, isTransporterStaff, matchesTransporter),
    [rawContFiles, isTransporterStaff, matchesTransporter],
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

  const dailySeries = useMemo(
    () => fillDailyWindow(analytics.daily, DAILY_WINDOW),
    [analytics.daily],
  );

  const transporterRows = useMemo(
    () =>
      computeTransporterAnalytics({
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

  const analyticsTotal =
    analytics.totals.speed + analytics.totals.nights + analytics.totals.continuous;

  // Per-assigned-transporter breakdown (transporter-staff view only).
  // Counts follow the same rules the Master Fleet page uses: an event or
  // row is counted only when its duration passes the corresponding
  // threshold from the Rules page.
  const transporterBreakdown = useMemo(() => {
    if (!isTransporterStaff) return [];
    const assigned = user?.assignedTransporters ?? [];
    return assigned.map((t) => {
      const norm = t.trim().toLowerCase();
      let speedEvents = 0;
      let nightRows = 0;
      let continuousRows = 0;
      let driverBlocks = 0;
      speedFiles.forEach((f) =>
        f.drivers.forEach((d) => {
          if ((d.transporter ?? '').trim().toLowerCase() !== norm) return;
          driverBlocks += 1;
          d.events.forEach((e) => {
            const s = parseDurationSeconds(e.duration);
            if (Number.isFinite(s) && s >= thresholds.speed) speedEvents += 1;
          });
        }),
      );
      nightFiles.forEach((f) =>
        f.drivers.forEach((d) => {
          if ((d.transporter ?? '').trim().toLowerCase() !== norm) return;
          d.rows.forEach((r) => {
            const s = parseDurationSeconds(r.duration);
            if (Number.isFinite(s) && s >= thresholds.nights) nightRows += 1;
          });
        }),
      );
      continuousFiles.forEach((f) =>
        f.drivers.forEach((d) => {
          if ((d.transporter ?? '').trim().toLowerCase() !== norm) return;
          d.rows.forEach((r) => {
            const s = parseDurationSeconds(r.duration);
            if (Number.isFinite(s) && s >= thresholds.continuous) continuousRows += 1;
          });
        }),
      );
      const driverList = driverRecords.filter(
        (r) => (r.transporter ?? '').trim().toLowerCase() === norm,
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
  ]);

  if (!user) return null;

  const totalViolations = files.reduce((sum, f) => sum + f.rowCount, 0);
  const drivers = new Set<string>();
  const transporters = new Set<string>();
  files.forEach((f) =>
    f.records.forEach((r) => {
      if (r.driverName) drivers.add(r.driverName.trim().toLowerCase());
      if (r.transporter) transporters.add(r.transporter.trim().toLowerCase());
    }),
  );

  const recent = files.slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        eyebrow={
          isBoss ? 'Overview' : isTransporterStaff ? 'Your workspace' : 'Welcome'
        }
        title={
          isBoss
            ? 'Fleet operations dashboard'
            : isTransporterStaff
              ? `Hello, ${user.name.split(' ')[0]}`
              : `Hello, ${user.name.split(' ')[0]}`
        }
        subtitle={
          isBoss
            ? 'Real-time view of uploaded violation reports, drivers and transporters.'
            : isTransporterStaff
              ? `You are scoped to ${user.assignedTransporters?.length ?? 0} transporter${(user.assignedTransporters?.length ?? 0) === 1 ? '' : 's'}. Upload new reports or jump to the master sheet.`
              : 'Upload new violation reports and track your submission history.'
        }
        actions={
          isBoss ? (
            <Link to="/violations" className="btn-primary">
              View all files <ArrowRight size={16} />
            </Link>
          ) : isTransporterStaff ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/upload" className="btn-ghost">
                <Upload size={16} /> Upload data
              </Link>
              <Link to="/master-fleet" className="btn-primary">
                <Trophy size={16} /> Master sheet
              </Link>
            </div>
          ) : (
            <Link to="/upload" className="btn-primary">
              <Upload size={16} /> Upload new data
            </Link>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Uploaded files"
          value={files.length}
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
          value={drivers.size}
          delta="Detected from records"
          icon={Users}
        />
        <StatCard
          label="Transporters"
          value={transporters.size}
          delta="Carriers represented"
          icon={Truck}
        />
      </div>

      {isTransporterStaff && (
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-ink-900 dark:text-white">
                Your transporters
              </h2>
              <p className="text-sm text-ink-500 dark:text-ink-400">
                Every upload here is filtered to just these transporters.
              </p>
            </div>
            <Link
              to="/master-fleet"
              className="hidden text-sm font-medium text-ink-700 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white sm:inline-flex sm:items-center sm:gap-1"
            >
              Open master sheet <ArrowUpRight size={14} />
            </Link>
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
                <div
                  key={t.name}
                  className="surface relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-white via-white to-ink-50 dark:from-ink-900 dark:via-ink-900 dark:to-ink-950"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
                        Transporter
                      </p>
                      <h3 className="mt-1 truncate font-display text-xl font-semibold tracking-tight text-ink-900 dark:text-white">
                        {t.name}
                      </h3>
                    </div>
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-white shadow-card dark:bg-white dark:text-ink-900">
                      <Truck size={18} />
                    </span>
                  </div>

                  {t.total === 0 && t.driverListCount === 0 ? (
                    <p className="mt-4 text-xs italic text-ink-500 dark:text-ink-400">
                      No data found for this transporter yet.
                    </p>
                  ) : (
                    <>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl border border-ink-100 bg-white/80 p-2.5 dark:border-ink-800 dark:bg-ink-900/70">
                          <p className="inline-flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-300">
                            <Gauge size={10} /> Speed
                          </p>
                          <p className="mt-0.5 text-lg font-semibold text-ink-900 dark:text-white">
                            {t.speedEvents}
                          </p>
                        </div>
                        <div className="rounded-xl border border-ink-100 bg-white/80 p-2.5 dark:border-ink-800 dark:bg-ink-900/70">
                          <p className="inline-flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                            <Moon size={10} /> Nights
                          </p>
                          <p className="mt-0.5 text-lg font-semibold text-ink-900 dark:text-white">
                            {t.nightRows}
                          </p>
                        </div>
                        <div className="rounded-xl border border-ink-100 bg-white/80 p-2.5 dark:border-ink-800 dark:bg-ink-900/70">
                          <p className="inline-flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                            <RouteIcon size={10} /> Cont.
                          </p>
                          <p className="mt-0.5 text-lg font-semibold text-ink-900 dark:text-white">
                            {t.continuousRows}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 text-xs text-ink-500 dark:border-ink-800 dark:text-ink-400">
                        <span className="inline-flex items-center gap-1">
                          <Users size={12} /> {t.driverListCount} in drivers list
                        </span>
                        <span>
                          <span className="font-semibold text-ink-900 dark:text-white">
                            {t.total}
                          </span>{' '}
                          events
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {isBoss && (
        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight text-ink-900 dark:text-white">
              Top offenders
            </h2>
            <p className="text-sm text-ink-500 dark:text-ink-400">
              Ranked from unfiltered Speed, Nights and Continuous uploads —
              scored against the current threshold rules.
            </p>
          </div>
          <TopOffenderCards top={analytics.top} />
        </section>
      )}

      {isBoss && (
        <section className="mt-10">
          <div className="surface rounded-2xl p-5 sm:p-7">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-white dark:bg-white dark:text-ink-900">
                  <BarChart3 size={18} />
                </span>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-ink-900 dark:text-white">
                    Daily violations trend
                  </h2>
                  <p className="text-sm text-ink-500 dark:text-ink-400">
                    Last {DAILY_WINDOW} days · Speed, Nights and Continuous events
                    counted against your rule thresholds.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800">
                  {analytics.totals.speed} speed
                </span>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-800">
                  {analytics.totals.nights} nights
                </span>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800">
                  {analytics.totals.continuous} continuous
                </span>
                <span className="rounded-full bg-ink-900 px-2.5 py-1 font-semibold text-white dark:bg-white dark:text-ink-900">
                  {analyticsTotal} total
                </span>
              </div>
            </div>
            <DailyViolationsChart data={dailySeries} />
          </div>
        </section>
      )}

      {(isBoss || isTransporterStaff) && (
        <TransporterAnalytics
          rows={
            isTransporterStaff
              ? transporterRows.filter((r) => matchesTransporter(r.name))
              : transporterRows
          }
        />
      )}

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink-900 dark:text-white">
              Recent uploads
            </h2>
            <p className="text-sm text-ink-500 dark:text-ink-400">
              {hasBossView ? 'Latest reports submitted to the platform.' : 'Your latest submissions.'}
            </p>
          </div>
          {hasBossView && files.length > 0 && (
            <Link
              to="/violations"
              className="hidden text-sm font-medium text-ink-700 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white sm:inline-flex sm:items-center sm:gap-1"
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
                <Link to="/upload" className="btn-primary">
                  <Upload size={16} /> Upload data
                </Link>
              )
            }
          />
        ) : (
          <div className="surface overflow-hidden rounded-2xl">
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {recent.map((file) => (
                <li
                  key={file.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                        {file.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-500 dark:text-ink-400">
                        {formatDateTime(file.uploadDate)} · {file.uploaderName}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{file.fileType.toUpperCase()}</Badge>
                    <Badge tone="info">{file.rowCount} records</Badge>
                    {hasBossView && (
                      <Link
                        to={`/violations/${file.id}`}
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

      {hasBossView && files.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink-900 dark:text-white">
            File summaries
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {files.slice(0, 6).map((f) => (
              <Link
                key={f.id}
                to={`/violations/${f.id}`}
                className="surface group rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-elev"
              >
                <div className="flex items-center justify-between">
                  <Badge tone="neutral">{f.fileType.toUpperCase()}</Badge>
                  <span className="text-[11px] text-ink-500 dark:text-ink-400">
                    {formatDate(f.uploadDate)}
                  </span>
                </div>
                <p className="mt-4 line-clamp-2 text-base font-semibold text-ink-900 dark:text-white">
                  {f.title}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4 text-xs text-ink-500 dark:border-ink-800 dark:text-ink-400">
                  <span>{f.rowCount} records</span>
                  <span className="inline-flex items-center gap-1 text-ink-700 group-hover:text-ink-900 dark:text-ink-300 dark:group-hover:text-white">
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
