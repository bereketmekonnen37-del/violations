import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Database,
  Download,
  Eye,
  Gauge,
  Loader2,
  Moon,
  RefreshCw,
  Route as RouteIcon,
  Search,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { StatCard } from '../components/ui/StatCard';
import {
  deleteUnfilteredBatch,
  fetchUnfilteredFiles,
} from '../features/unfiltered/unfilteredApi';
import {
  removeUnfilteredFile,
  setUnfilteredFiles,
} from '../features/unfiltered/unfilteredSlice';
import {
  deleteNightBatch,
  fetchNightFiles,
} from '../features/unfilteredNights/unfilteredNightsApi';
import {
  removeNightFile,
  setNightFiles,
} from '../features/unfilteredNights/unfilteredNightsSlice';
import {
  deleteContinuousBatch,
  fetchContinuousFiles,
} from '../features/unfilteredContinuous/unfilteredContinuousApi';
import {
  removeContinuousFile,
  setContinuousFiles,
} from '../features/unfilteredContinuous/unfilteredContinuousSlice';
import { buildDriverProfileLookup } from '../lib/driverLookup';
import { downloadCleanCsv, downloadMasterSpeedCsv } from '../lib/exportCsv';
import {
  downloadCleanNightsCsv,
  downloadMasterNightsCsv,
} from '../lib/nightsExportCsv';
import {
  downloadCleanContinuousCsv,
  downloadMasterContinuousCsv,
} from '../lib/continuousExportCsv';
import { filterFilesByTransporter } from '../lib/transporterScope';
import { formatDateTime } from '../lib/utils';
import { useUserScope } from '../hooks/useUserScope';
import type {
  UnfilteredContinuousFile,
  UnfilteredFile,
  UnfilteredNightFile,
} from '../types';

type Kind = 'speed' | 'nights' | 'continuous';

const KIND_META: Record<Kind, { label: string; icon: LucideIcon; unit: string }> = {
  speed: { label: 'Speed', icon: Gauge, unit: 'events' },
  nights: { label: 'Nights', icon: Moon, unit: 'rows' },
  continuous: { label: 'Continuous', icon: RouteIcon, unit: 'rows' },
};

interface UploadRow {
  kind: Kind;
  id: string;
  title: string;
  uploadDate: string;
  uploaderName: string;
  fileType: string;
  source: string;
  drivers: number;
  records: number;
}

/** One line of a file's data, normalised across the three upload types. */
interface DetailRow {
  key: string;
  vid: string;
  driver: string;
  transporter: string;
  period: string;
  from: string;
  to: string;
  duration: string;
  metric: string;
  position: string;
}

const PAGE_SIZE = 200;

const KindBadge = ({ kind }: { kind: Kind }) => {
  const { label, icon: Icon } = KIND_META[kind];
  return (
    <Badge tone={kind === 'speed' ? 'accent' : kind === 'nights' ? 'info' : 'success'}>
      <Icon size={11} /> {label}
    </Badge>
  );
};

export const UploadedDataPage = () => {
  const dispatch = useAppDispatch();
  const { isBoss, isTransporterStaff, matchesTransporter } = useUserScope();

  const rawSpeed = useAppSelector((s) => s.unfiltered.files);
  const rawNights = useAppSelector((s) => s.unfilteredNights.files);
  const rawCont = useAppSelector((s) => s.unfilteredContinuous.files);
  const loading = useAppSelector(
    (s) =>
      s.unfiltered.status === 'loading' ||
      s.unfilteredNights.status === 'loading' ||
      s.unfilteredContinuous.status === 'loading',
  );
  const driverRecords = useAppSelector((s) => s.drivers.records);
  const resolveProfile = useMemo(
    () => buildDriverProfileLookup(driverRecords),
    [driverRecords],
  );

  const speedFiles = useMemo(
    () => filterFilesByTransporter(rawSpeed, isTransporterStaff, matchesTransporter),
    [rawSpeed, isTransporterStaff, matchesTransporter],
  );
  const nightFiles = useMemo(
    () => filterFilesByTransporter(rawNights, isTransporterStaff, matchesTransporter),
    [rawNights, isTransporterStaff, matchesTransporter],
  );
  const contFiles = useMemo(
    () => filterFilesByTransporter(rawCont, isTransporterStaff, matchesTransporter),
    [rawCont, isTransporterStaff, matchesTransporter],
  );

  const uploads = useMemo<UploadRow[]>(() => {
    const rows: UploadRow[] = [
      ...speedFiles.map((f) => ({
        kind: 'speed' as const,
        id: f.id,
        title: f.title,
        uploadDate: f.uploadDate,
        uploaderName: f.uploaderName,
        fileType: f.fileType,
        source: f.source ?? 'mela',
        drivers: f.drivers.length,
        records: f.drivers.reduce((n, d) => n + d.events.length, 0),
      })),
      ...nightFiles.map((f) => ({
        kind: 'nights' as const,
        id: f.id,
        title: f.title,
        uploadDate: f.uploadDate,
        uploaderName: f.uploaderName,
        fileType: f.fileType,
        source: f.source ?? 'mela',
        drivers: f.drivers.length,
        records: f.drivers.reduce((n, d) => n + d.rows.length, 0),
      })),
      ...contFiles.map((f) => ({
        kind: 'continuous' as const,
        id: f.id,
        title: f.title,
        uploadDate: f.uploadDate,
        uploaderName: f.uploaderName,
        fileType: f.fileType,
        source: f.source ?? 'mela',
        drivers: f.drivers.length,
        records: f.drivers.reduce((n, d) => n + d.rows.length, 0),
      })),
    ];
    return rows.sort(
      (a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime(),
    );
  }, [speedFiles, nightFiles, contFiles]);

  const [kindFilter, setKindFilter] = useState<Kind | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ kind: Kind; id: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UploadRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: uploads.length,
      speed: uploads.filter((u) => u.kind === 'speed').length,
      nights: uploads.filter((u) => u.kind === 'nights').length,
      continuous: uploads.filter((u) => u.kind === 'continuous').length,
    }),
    [uploads],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return uploads.filter(
      (u) =>
        (kindFilter === 'all' || u.kind === kindFilter) &&
        (!q ||
          u.title.toLowerCase().includes(q) ||
          u.uploaderName.toLowerCase().includes(q)),
    );
  }, [uploads, kindFilter, query]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [speed, nights, cont] = await Promise.all([
        fetchUnfilteredFiles(),
        fetchNightFiles(),
        fetchContinuousFiles(),
      ]);
      dispatch(setUnfilteredFiles(speed));
      dispatch(setNightFiles(nights));
      dispatch(setContinuousFiles(cont));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not refresh uploads.');
    } finally {
      setRefreshing(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setDeleting(true);
    setError(null);
    try {
      if (target.kind === 'speed') {
        await deleteUnfilteredBatch(target.id);
        dispatch(removeUnfilteredFile(target.id));
      } else if (target.kind === 'nights') {
        await deleteNightBatch(target.id);
        dispatch(removeNightFile(target.id));
      } else {
        await deleteContinuousBatch(target.id);
        dispatch(removeContinuousFile(target.id));
      }
      if (selected?.id === target.id) setSelected(null);
      setPendingDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete this upload.');
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const deleteDialog = (
    <Modal
      open={pendingDelete != null}
      onClose={() => !deleting && setPendingDelete(null)}
      title="Delete this upload?"
      subtitle={
        pendingDelete
          ? `${KIND_META[pendingDelete.kind].label} · ${pendingDelete.title}`
          : undefined
      }
      widthClassName="w-[92vw] max-w-[460px]"
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm text-ink-600 dark:text-ink-300">
          This permanently removes the file and its{' '}
          <strong>{pendingDelete?.records.toLocaleString()}</strong>{' '}
          {pendingDelete ? KIND_META[pendingDelete.kind].unit : ''} for every user.
          Master Fleet, Dashboard and Transporter numbers will update. This cannot
          be undone.
        </p>
        <div className="flex flex-col-reverse items-stretch justify-end gap-2 border-t border-ink-100 pt-4 dark:border-ink-800 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setPendingDelete(null)}
            disabled={deleting}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={deleting}
            className="btn-danger"
          >
            {deleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            Delete upload
          </button>
        </div>
      </div>
    </Modal>
  );

  /* ── details screen ── */
  if (selected) {
    const upload = uploads.find(
      (u) => u.kind === selected.kind && u.id === selected.id,
    );
    if (!upload) {
      // Deleted (or refreshed away) while open.
      return (
        <div className="mx-auto w-full max-w-7xl">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
          >
            <ArrowLeft size={15} /> All uploads
          </button>
          <EmptyState icon={Database} title="This upload is no longer available" />
        </div>
      );
    }
    const onDownload = () => {
      if (upload.kind === 'speed') {
        downloadCleanCsv(
          speedFiles.filter((f) => f.id === upload.id),
          resolveProfile,
        );
      } else if (upload.kind === 'nights') {
        downloadCleanNightsCsv(
          nightFiles.filter((f) => f.id === upload.id),
          resolveProfile,
        );
      } else {
        downloadCleanContinuousCsv(
          contFiles.filter((f) => f.id === upload.id),
          resolveProfile,
        );
      }
    };
    return (
      <>
        <UploadDetails
          upload={upload}
          speedFiles={speedFiles}
          nightFiles={nightFiles}
          contFiles={contFiles}
          canDelete={isBoss}
          onBack={() => setSelected(null)}
          onDownload={onDownload}
          onDelete={() => setPendingDelete(upload)}
        />
        {deleteDialog}
      </>
    );
  }

  /* ── list screen ── */
  const masterButtons: { kind: Kind; onClick: () => void; disabled: boolean }[] = [
    {
      kind: 'speed',
      onClick: () => downloadMasterSpeedCsv(speedFiles, resolveProfile),
      disabled: speedFiles.length === 0,
    },
    {
      kind: 'nights',
      onClick: () => downloadMasterNightsCsv(nightFiles, resolveProfile),
      disabled: nightFiles.length === 0,
    },
    {
      kind: 'continuous',
      onClick: () => downloadMasterContinuousCsv(contFiles, resolveProfile),
      disabled: contFiles.length === 0,
    },
  ];

  const tabs: (Kind | 'all')[] = ['all', 'speed', 'nights', 'continuous'];

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        eyebrow={isBoss ? 'Manager workspace' : 'Your workspace'}
        title="Uploaded data"
        subtitle="Every Speed, Nights and Continuous file staff have uploaded, in one table. Open Details to see all of a file's data."
        actions={
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary"
          >
            {refreshing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total uploads" value={counts.all} icon={Database} />
        <StatCard label="Speed files" value={counts.speed} icon={Gauge} />
        <StatCard label="Nights files" value={counts.nights} icon={Moon} />
        <StatCard label="Continuous files" value={counts.continuous} icon={RouteIcon} />
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <div className="surface mt-6 rounded-2xl p-5 sm:p-7">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex flex-wrap rounded-xl border border-ink-100 bg-ink-50 p-1 dark:border-ink-800 dark:bg-ink-900">
            {tabs.map((t) => {
              const active = t === kindFilter;
              const Icon = t === 'all' ? Database : KIND_META[t].icon;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setKindFilter(t)}
                  className={
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ' +
                    (active
                      ? 'bg-white text-ink-900 shadow-card dark:bg-ink-950 dark:text-white'
                      : 'text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white')
                  }
                >
                  <Icon size={13} />
                  {t === 'all' ? 'All' : KIND_META[t].label}
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
          <div className="relative w-full lg:w-72">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search file or uploader"
              className="input-base !pl-9"
            />
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-ink-100 dark:border-ink-800">
          <div className="max-h-[65vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-ink-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500 shadow-[0_1px_0_rgba(0,0,0,0.05)] dark:bg-ink-900 dark:text-ink-400">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Uploaded by</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3 text-right">Drivers</th>
                  <th className="px-4 py-3 text-right">Data found</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {visible.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm text-ink-500 dark:text-ink-400"
                    >
                      {loading && uploads.length === 0 ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin" /> Loading
                          uploads…
                        </span>
                      ) : uploads.length === 0 ? (
                        'No uploads yet. Files appear here once staff submit them.'
                      ) : (
                        'No uploads match your filters.'
                      )}
                    </td>
                  </tr>
                ) : (
                  visible.map((u) => (
                    <tr
                      key={`${u.kind}-${u.id}`}
                      className="bg-white transition hover:bg-ink-50/60 dark:bg-ink-950 dark:hover:bg-ink-900/60"
                    >
                      <td className="px-4 py-2.5">
                        <KindBadge kind={u.kind} />
                      </td>
                      <td className="max-w-[280px] truncate px-4 py-2.5 font-medium text-ink-900 dark:text-white">
                        {u.title}
                      </td>
                      <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                        {u.uploaderName || <span className="text-ink-400">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-ink-700 dark:text-ink-200">
                        {formatDateTime(u.uploadDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs uppercase text-ink-700 dark:text-ink-200">
                        {u.source} · {u.fileType}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-ink-800 dark:text-ink-100">
                        {u.drivers.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-ink-900 dark:text-white">
                        {u.records.toLocaleString()}{' '}
                        <span className="text-[10px] font-normal uppercase text-ink-400">
                          {KIND_META[u.kind].unit}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelected({ kind: u.kind, id: u.id })}
                            className="btn-secondary !px-3 !py-1.5 !text-xs"
                          >
                            <Eye size={13} /> Details
                          </button>
                          {isBoss && (
                            <button
                              type="button"
                              onClick={() => setPendingDelete(u)}
                              aria-label={`Delete ${u.title}`}
                              title="Delete this upload"
                              className="btn-ghost h-8 w-8 p-0 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4 text-xs text-ink-500 dark:border-ink-800 dark:text-ink-400">
          <span className="font-semibold uppercase tracking-wider">
            Master sheets (every upload combined)
          </span>
          {masterButtons.map((b) => {
            const Icon = KIND_META[b.kind].icon;
            return (
              <button
                key={b.kind}
                type="button"
                onClick={b.onClick}
                disabled={b.disabled}
                className="btn-ghost !px-3 !py-1.5 !text-xs"
              >
                <Download size={13} /> <Icon size={13} /> {KIND_META[b.kind].label}
              </button>
            );
          })}
        </div>
      </div>

      {deleteDialog}
    </div>
  );
};

interface UploadDetailsProps {
  upload: UploadRow;
  speedFiles: UnfilteredFile[];
  nightFiles: UnfilteredNightFile[];
  contFiles: UnfilteredContinuousFile[];
  canDelete: boolean;
  onBack: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

const UploadDetails = ({
  upload,
  speedFiles,
  nightFiles,
  contFiles,
  canDelete,
  onBack,
  onDownload,
  onDelete,
}: UploadDetailsProps) => {
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE_SIZE);
  const meta = KIND_META[upload.kind];

  const rows = useMemo<DetailRow[]>(() => {
    if (upload.kind === 'speed') {
      const file = speedFiles.find((f) => f.id === upload.id);
      return (file?.drivers ?? []).flatMap((d) =>
        d.events.map((e) => ({
          key: e.id,
          vid: d.vid,
          driver: d.driverName,
          transporter: d.transporter,
          period: d.period,
          from: e.start,
          to: e.end,
          duration: e.duration,
          metric: e.topSpeed,
          position: e.overspeedPosition || e.location,
        })),
      );
    }
    const file =
      upload.kind === 'nights'
        ? nightFiles.find((f) => f.id === upload.id)
        : contFiles.find((f) => f.id === upload.id);
    return (file?.drivers ?? []).flatMap((d) =>
      d.rows.map((r) => ({
        key: r.id,
        vid: d.vid,
        driver: d.driverName,
        transporter: d.transporter,
        period: d.period,
        from: r.timeA,
        to: r.timeB,
        duration: r.duration,
        metric: r.length,
        position: [r.positionA, r.positionB].filter(Boolean).join(' → '),
      })),
    );
  }, [upload, speedFiles, nightFiles, contFiles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.vid, r.driver, r.transporter, r.from, r.duration, r.position].some((f) =>
        (f ?? '').toLowerCase().includes(q),
      ),
    );
  }, [rows, query]);

  const page = filtered.slice(0, shown);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> All uploads
      </button>

      <PageHeader
        eyebrow={`${meta.label} upload`}
        title={upload.title}
        subtitle={`Uploaded ${formatDateTime(upload.uploadDate)}${
          upload.uploaderName ? ` by ${upload.uploaderName}` : ''
        } · ${upload.source.toUpperCase()} (${upload.fileType.toUpperCase()})`}
        actions={
          <>
            <button
              type="button"
              onClick={onDownload}
              disabled={rows.length === 0}
              className="btn-primary"
            >
              <Download size={16} /> Download data
            </button>
            {canDelete && (
              <button type="button" onClick={onDelete} className="btn-danger">
                <Trash2 size={16} /> Delete upload
              </button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard label="Type" value={meta.label} icon={meta.icon} />
        <StatCard label="Drivers" value={upload.drivers.toLocaleString()} icon={Database} />
        <StatCard
          label={`Data found (${meta.unit})`}
          value={upload.records.toLocaleString()}
          icon={meta.icon}
        />
      </div>

      <div className="surface mt-6 rounded-2xl p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-500 dark:text-ink-400">
            Showing {Math.min(shown, filtered.length).toLocaleString()} of{' '}
            {filtered.length.toLocaleString()} {meta.unit}
          </p>
          <div className="relative sm:w-72">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShown(PAGE_SIZE);
              }}
              placeholder="Search VID, driver, time, location"
              className="input-base !pl-9"
            />
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-ink-100 dark:border-ink-800">
          <div className="max-h-[65vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-ink-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500 shadow-[0_1px_0_rgba(0,0,0,0.05)] dark:bg-ink-900 dark:text-ink-400">
                <tr>
                  <th className="px-4 py-3">VID</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Transporter</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">{upload.kind === 'speed' ? 'Start' : 'Time A'}</th>
                  <th className="px-4 py-3">{upload.kind === 'speed' ? 'End' : 'Time B'}</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">
                    {upload.kind === 'speed' ? 'Top speed' : 'Length'}
                  </th>
                  <th className="px-4 py-3">
                    {upload.kind === 'speed' ? 'Position' : 'Position A → B'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {page.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-sm text-ink-500 dark:text-ink-400"
                    >
                      No data matches your search.
                    </td>
                  </tr>
                ) : (
                  page.map((r) => (
                    <tr
                      key={r.key}
                      className="bg-white dark:bg-ink-950"
                    >
                      <td className="px-4 py-2.5 font-mono text-ink-800 dark:text-ink-100">
                        {r.vid || <span className="text-ink-400">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                        {r.driver || <span className="text-ink-400">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-ink-800 dark:text-ink-100">
                        {r.transporter || <span className="text-ink-400">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-ink-700 dark:text-ink-200">
                        {r.period || <span className="text-ink-400">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-ink-700 dark:text-ink-200">
                        {r.from}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-ink-700 dark:text-ink-200">
                        {r.to}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-ink-800 dark:text-ink-100">
                        {r.duration}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-ink-800 dark:text-ink-100">
                        {r.metric || <span className="text-ink-400">—</span>}
                      </td>
                      <td className="min-w-[220px] px-4 py-2.5 text-xs text-ink-700 dark:text-ink-200">
                        {r.position || <span className="text-ink-400">—</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filtered.length > shown && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE_SIZE)}
              className="btn-secondary"
            >
              Show {Math.min(PAGE_SIZE, filtered.length - shown).toLocaleString()} more
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
