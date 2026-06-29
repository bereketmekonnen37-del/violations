import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Route,
  Trash2,
  Users,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { FilePickerGrid } from '../components/ui/FilePickerGrid';
import { StatCard } from '../components/ui/StatCard';
import { ContinuousDriverCard } from '../features/unfilteredContinuous/ContinuousDriverCard';
import { ContinuousDriverModal } from '../features/unfilteredContinuous/ContinuousDriverModal';
import { ContinuousFilters } from '../features/unfilteredContinuous/ContinuousFilters';
import { ContinuousUpload } from '../features/unfilteredContinuous/ContinuousUpload';
import { removeContinuousFile } from '../features/unfilteredContinuous/unfilteredContinuousSlice';
import {
  useUnfilteredContinuousData,
  type AggregatedContinuousDriver,
} from '../features/unfilteredContinuous/useUnfilteredContinuousData';
import {
  buildCleanContinuousRows,
  downloadCleanContinuousCsv,
} from '../lib/continuousExportCsv';
import { buildDriverLookup } from '../lib/driverLookup';
import { formatDateTime } from '../lib/utils';

const StaffView = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user)!;
  const { files, totalRows } = useUnfilteredContinuousData(user.id);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        eyebrow="Staff workspace"
        title="Unfiltered continuous"
        subtitle="Upload raw “Travel Sheet (Continuous Driving)” exports. We'll parse the Object/Group/Period blocks and skip the sub-total summary rows."
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <ContinuousUpload user={user} />

        <div className="surface rounded-2xl p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink-900 dark:text-white">
              Your uploads
            </h3>
            <Badge tone="neutral">{files.length}</Badge>
          </div>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
            History of your continuous submissions ({totalRows} parsed trips).
          </p>
          <div className="mt-5 space-y-2">
            {files.length === 0 ? (
              <EmptyState
                icon={Route}
                title="No uploads yet"
                description="Drop a raw travel sheet to extract drivers and continuous trips."
              />
            ) : (
              files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-ink-100 bg-white p-3 dark:border-ink-800 dark:bg-ink-900"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                      <Route size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                        {f.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-500 dark:text-ink-400">
                        {formatDateTime(f.uploadDate)} · {f.drivers.length} drivers ·{' '}
                        {f.totalRows} trips · {f.fileType.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => dispatch(removeContinuousFile(f.id))}
                    className="btn-ghost h-8 w-8 p-0 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    aria-label="Delete upload"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const BossView = () => {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const allFiles = useAppSelector((s) => s.unfilteredContinuous.files);
  const {
    files,
    drivers,
    filtered,
    filters,
    setFilters,
    reset,
    activeCount,
    totalRows,
    matchedRows,
  } = useUnfilteredContinuousData(undefined, selectedFileId ?? undefined);
  const [openDriver, setOpenDriver] = useState<AggregatedContinuousDriver | null>(null);
  const driverRecords = useAppSelector((s) => s.drivers.records);
  const resolveDriver = useMemo(
    () => buildDriverLookup(driverRecords),
    [driverRecords],
  );

  const cleanCount = useMemo(
    () => buildCleanContinuousRows(files, resolveDriver).length,
    [files, resolveDriver],
  );
  const onDownload = () => {
    if (files.length === 0) return;
    downloadCleanContinuousCsv(files, resolveDriver);
  };

  if (!selectedFileId) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <PageHeader
          eyebrow="Manager workspace"
          title="Unfiltered continuous"
          subtitle="Pick an uploaded file to inspect its parsed drivers and download clean data."
        />
        {allFiles.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No continuous uploads yet"
            description="Once staff submit raw Continuous Driving exports, files will appear here."
          />
        ) : (
          <FilePickerGrid
            icon={Route}
            files={allFiles.map((f) => ({
              id: f.id,
              title: f.title,
              uploadDate: f.uploadDate,
              uploaderName: f.uploaderName,
              fileType: f.fileType,
              driverCount: f.drivers.length,
              rowCount: f.totalRows,
              rowLabel: 'Trips',
            }))}
            onSelect={(id) => setSelectedFileId(id)}
          />
        )}
      </div>
    );
  }

  const file = allFiles.find((f) => f.id === selectedFileId);
  return (
    <div className="mx-auto w-full max-w-7xl">
      <button
        type="button"
        onClick={() => setSelectedFileId(null)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> All files
      </button>

      <PageHeader
        eyebrow="Unfiltered continuous file"
        title={file?.title ?? 'Unknown file'}
        subtitle={
          file
            ? `Uploaded ${new Date(file.uploadDate).toLocaleDateString()} · ${file.uploaderName}`
            : undefined
        }
        actions={
          <button
            type="button"
            onClick={onDownload}
            disabled={files.length === 0}
            className="btn-primary"
          >
            <Download size={16} /> Download clean data
            {cleanCount > 0 && (
              <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold dark:bg-ink-900/20">
                {cleanCount}
              </span>
            )}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="File type" value={file?.fileType.toUpperCase() ?? '—'} icon={FileSpreadsheet} />
        <StatCard label="Drivers" value={drivers.length} icon={Users} />
        <StatCard label="Continuous trips" value={totalRows.toLocaleString()} icon={Route} />
        <StatCard label="Clean rows ready" value={cleanCount.toLocaleString()} icon={Layers} />
      </div>

      <div className="mt-6">
        <ContinuousFilters
          filters={filters}
          onChange={setFilters}
          onReset={reset}
          activeCount={activeCount}
          matchedRows={matchedRows}
          totalRows={totalRows}
        />
      </div>

      <div className="mt-8">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No matching drivers"
            description="Adjust your filters to widen the result set."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((d) => (
              <ContinuousDriverCard
                key={`${d.fileId}-${d.blockId}`}
                driver={d}
                onOpen={() => setOpenDriver(d)}
              />
            ))}
          </div>
        )}
      </div>

      <ContinuousDriverModal driver={openDriver} onClose={() => setOpenDriver(null)} />
    </div>
  );
};

export const UnfilteredContinuousPage = () => {
  const role = useAppSelector((s) => s.auth.user?.role);
  return role === 'boss' ? <BossView /> : <StaffView />;
};
