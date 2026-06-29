import { useMemo, useState } from 'react';
import {
  AlertOctagon,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Trash2,
  Users,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { FilePickerGrid } from '../components/ui/FilePickerGrid';
import { StatCard } from '../components/ui/StatCard';
import { DriverCard } from '../features/unfiltered/DriverCard';
import { DriverModal } from '../features/unfiltered/DriverModal';
import { UnfilteredFilters } from '../features/unfiltered/UnfilteredFilters';
import { UnfilteredUpload } from '../features/unfiltered/UnfilteredUpload';
import {
  removeUnfilteredFile,
} from '../features/unfiltered/unfilteredSlice';
import {
  useUnfilteredData,
  type AggregatedDriver,
} from '../features/unfiltered/useUnfilteredData';
import { buildCleanRows, downloadCleanCsv } from '../lib/exportCsv';
import { buildDriverLookup } from '../lib/driverLookup';
import { formatDateTime } from '../lib/utils';

const StaffView = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user)!;
  const { files, totalEvents } = useUnfilteredData(user.id);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        eyebrow="Staff workspace"
        title="Unfiltered speed"
        subtitle="Upload messy Excel or CSV exports and we'll parse the Object/Group/Period blocks into clean overspeed records."
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <UnfilteredUpload user={user} />

        <div className="surface rounded-2xl p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink-900 dark:text-white">
              Your uploads
            </h3>
            <Badge tone="neutral">{files.length}</Badge>
          </div>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
            History of your unfiltered submissions ({totalEvents} parsed events).
          </p>
          <div className="mt-5 space-y-2">
            {files.length === 0 ? (
              <EmptyState
                icon={FileSpreadsheet}
                title="No uploads yet"
                description="Drop a raw export to extract drivers and overspeed events."
              />
            ) : (
              files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-ink-100 bg-white p-3 dark:border-ink-800 dark:bg-ink-900"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                      <FileSpreadsheet size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                        {f.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-500 dark:text-ink-400">
                        {formatDateTime(f.uploadDate)} · {f.drivers.length} drivers ·{' '}
                        {f.totalEvents} events · {f.fileType.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => dispatch(removeUnfilteredFile(f.id))}
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
  const allFiles = useAppSelector((s) => s.unfiltered.files);
  const {
    files,
    drivers,
    filtered,
    filters,
    setFilters,
    reset,
    eventTypes,
    activeCount,
    totalEvents,
    matchedEvents,
  } = useUnfilteredData(undefined, selectedFileId ?? undefined);
  const [openDriver, setOpenDriver] = useState<AggregatedDriver | null>(null);
  const driverRecords = useAppSelector((s) => s.drivers.records);
  const resolveDriver = useMemo(
    () => buildDriverLookup(driverRecords),
    [driverRecords],
  );

  const cleanCount = useMemo(
    () => buildCleanRows(files, resolveDriver).length,
    [files, resolveDriver],
  );
  const onDownload = () => {
    if (files.length === 0) return;
    downloadCleanCsv(files, resolveDriver);
  };

  // ── File-picker screen ──
  if (!selectedFileId) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <PageHeader
          eyebrow="Manager workspace"
          title="Unfiltered speed"
          subtitle="Pick an uploaded file to inspect its parsed drivers and download clean data."
        />
        {allFiles.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No unfiltered uploads yet"
            description="Once staff submit raw Excel/CSV exports, files will appear here."
          />
        ) : (
          <FilePickerGrid
            icon={FileSpreadsheet}
            files={allFiles.map((f) => ({
              id: f.id,
              title: f.title,
              uploadDate: f.uploadDate,
              uploaderName: f.uploaderName,
              fileType: f.fileType,
              driverCount: f.drivers.length,
              rowCount: f.totalEvents,
              rowLabel: 'Events',
            }))}
            onSelect={(id) => setSelectedFileId(id)}
          />
        )}
      </div>
    );
  }

  // ── Selected-file detail screen ──
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
        eyebrow="Unfiltered speed file"
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
        <StatCard label="Overspeed events" value={totalEvents.toLocaleString()} icon={AlertOctagon} />
        <StatCard label="Clean rows ready" value={cleanCount.toLocaleString()} icon={Layers} />
      </div>

      <div className="mt-6">
        <UnfilteredFilters
          filters={filters}
          onChange={setFilters}
          onReset={reset}
          eventTypes={eventTypes}
          activeCount={activeCount}
          matchedEvents={matchedEvents}
          totalEvents={totalEvents}
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
              <DriverCard
                key={`${d.fileId}-${d.blockId}`}
                driver={d}
                onOpen={() => setOpenDriver(d)}
              />
            ))}
          </div>
        )}
      </div>

      <DriverModal driver={openDriver} onClose={() => setOpenDriver(null)} />
    </div>
  );
};

export const UnfilteredPage = () => {
  const role = useAppSelector((s) => s.auth.user?.role);
  return role === 'boss' ? <BossView /> : <StaffView />;
};
