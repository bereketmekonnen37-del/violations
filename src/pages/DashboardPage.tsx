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
  const timeMode = useAppSelector((s) => s.timeMode.mode);
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
        timeMode,
      }),
    [
      speedFiles,
      nightFiles,
      continuousFiles,
      driverRecords,
      thresholds,
      allowedVidsByType,
      allowedLocationsByType,
      timeMode,
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
        title=""
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
            <Link
              to="/master-fleet"
              className="hidden text-sm font-semibold sm:inline-flex sm:items-center sm:gap-1 hover:underline"
              style={{ color: 'var(--color-brand-accent)' }}
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
                </div>
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
                    Last {DAILY_WINDOW} days · Speed, Nights and Continuous events
                    counted against your rule thresholds.
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
          {hasBossView && files.length > 0 && (
            <Link
              to="/violations"
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
                <Link to="/upload" className="btn-primary">
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
                  key={file.id}
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
          <h2
            className="mb-4 text-lg font-semibold tracking-tight"
            style={{ color: 'var(--color-brand-blue-dark)' }}
          >
            File summaries
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {files.slice(0, 6).map((f) => (
              <Link
                key={f.id}
                to={`/violations/${f.id}`}
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
                  <span>{f.rowCount} records</span>
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
