import { useMemo } from 'react';
import { AlertTriangle, BarChart3, Crown, Truck, Users } from 'lucide-react';
import { useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { useUserScope } from '../hooks/useUserScope';
import { filterFilesByTransporter } from '../lib/transporterScope';
import { computeTransporterAnalytics } from '../lib/transporterAnalytics';
import { TransporterAnalytics } from '../features/dashboard/TransporterAnalytics';
import { TransporterViolationsChart } from '../features/transporters/TransporterViolationsChart';

export const TransportersPage = () => {
  const rawSpeed = useAppSelector((s) => s.unfiltered.files);
  const rawNights = useAppSelector((s) => s.unfilteredNights.files);
  const rawCont = useAppSelector((s) => s.unfilteredContinuous.files);
  const driverRecords = useAppSelector((s) => s.drivers.records);
  const thresholds = useAppSelector((s) => s.rules.thresholds);
  const maxDurationSeconds = useAppSelector((s) => s.rules.maxDurationSeconds);
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

  const allRows = useMemo(
    () =>
      computeTransporterAnalytics({
        speedFiles,
        nightFiles,
        continuousFiles,
        driverRecords,
        thresholds,
        allowedVidsByType,
        allowedLocationsByType,
        mergeNights,
        maxDurationSeconds,
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
    ],
  );

  const rows = isTransporterStaff
    ? allRows.filter((r) => matchesTransporter(r.name))
    : allRows;

  const withData = rows.filter((r) => r.total > 0);
  const totalViolations = rows.reduce((sum, r) => sum + r.total, 0);
  const topOffender = rows[0] && rows[0].total > 0 ? rows[0] : null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        eyebrow="Manager workspace"
        title="Transporters"
        subtitle="Every transporter's activity in one place — who's clean, who's racking up violations, and where to look next."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Transporters tracked" value={rows.length} icon={Truck} />
        <StatCard
          label="With violations"
          value={withData.length}
          delta={`${rows.length - withData.length} clean`}
          icon={Users}
        />
        <StatCard
          label="Total violations"
          value={totalViolations.toLocaleString()}
          icon={AlertTriangle}
        />
        <StatCard
          label="Top offender"
          value={topOffender ? topOffender.name : '—'}
          delta={topOffender ? `${topOffender.total} violations` : 'No violations yet'}
          icon={Crown}
        />
      </div>

      <section className="mt-10">
        <div className="card-base p-5 sm:p-7">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-start gap-3">
              <span
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'var(--color-brand-blue)', color: '#ffffff' }}
              >
                <BarChart3 size={18} />
              </span>
              <div>
                <h2
                  className="text-lg font-semibold tracking-tight"
                  style={{ color: 'var(--color-brand-blue-dark)' }}
                >
                  Violations by transporter
                </h2>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Highest total first — Speed, Nights and Continuous events
                  counted against your rule thresholds.
                </p>
              </div>
            </div>
          </div>
          <TransporterViolationsChart rows={rows} limit={10} />
        </div>
      </section>

      <TransporterAnalytics rows={rows} />
    </div>
  );
};
