import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Loader2,
  Moon,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { FilePickerGrid } from '../components/ui/FilePickerGrid';
import { StatCard } from '../components/ui/StatCard';
import { NightDriverCard } from '../features/unfilteredNights/NightDriverCard';
import { NightDriverModal } from '../features/unfilteredNights/NightDriverModal';
import { NightsFilters } from '../features/unfilteredNights/NightsFilters';
import { NightsUpload } from '../features/unfilteredNights/NightsUpload';
import { fetchNightFiles } from '../features/unfilteredNights/unfilteredNightsApi';
import { setNightFiles } from '../features/unfilteredNights/unfilteredNightsSlice';
import {
  useUnfilteredNightsData,
  type AggregatedNightDriver,
} from '../features/unfilteredNights/useUnfilteredNightsData';
import {
  buildCleanNightRows,
  buildMasterNightRows,
  downloadCleanNightsCsv,
  downloadMasterNightsCsv,
} from '../lib/nightsExportCsv';
import { buildDriverProfileLookup } from '../lib/driverLookup';
import { filterFilesByTransporter } from '../lib/transporterScope';
import { useUserScope } from '../hooks/useUserScope';

const StaffView = () => {
  const user = useAppSelector((s) => s.auth.user)!;
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        eyebrow="Staff workspace"
        title="Upload nights data"
        subtitle="Drop a raw “Travel sheet (Unauthorized Time)” export — we'll parse it into clean night records for the boss to review."
      />
      <NightsUpload user={user} />
    </div>
  );
};

const BossView = () => {
  const dispatch = useAppDispatch();
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const rawFiles = useAppSelector((s) => s.unfilteredNights.files);
  const status = useAppSelector((s) => s.unfilteredNights.status);
  const { isTransporterStaff, matchesTransporter } = useUserScope();

  const handleRefresh = async () => {
    setRefreshing(true);
    setListError(null);
    try {
      const fresh = await fetchNightFiles();
      dispatch(setNightFiles(fresh));
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Could not refresh files.');
    } finally {
      setRefreshing(false);
    }
  };
  const allFiles = useMemo(
    () => filterFilesByTransporter(rawFiles, isTransporterStaff, matchesTransporter),
    [rawFiles, isTransporterStaff, matchesTransporter],
  );
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
  } = useUnfilteredNightsData(undefined, selectedFileId ?? undefined);
  const [openDriver, setOpenDriver] = useState<AggregatedNightDriver | null>(null);
  const driverRecords = useAppSelector((s) => s.drivers.records);
  const resolveProfile = useMemo(
    () => buildDriverProfileLookup(driverRecords),
    [driverRecords],
  );

  const cleanCount = useMemo(
    () => buildCleanNightRows(files, resolveProfile).length,
    [files, resolveProfile],
  );
  const masterCount = useMemo(
    () => buildMasterNightRows(allFiles, resolveProfile).length,
    [allFiles, resolveProfile],
  );
  const onDownload = () => {
    if (files.length === 0) return;
    downloadCleanNightsCsv(files, resolveProfile);
  };
  const onDownloadMaster = () => {
    if (allFiles.length === 0) return;
    downloadMasterNightsCsv(allFiles, resolveProfile);
  };

  if (!selectedFileId) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <PageHeader
          eyebrow="Manager workspace"
          title="Unfiltered nights"
          subtitle="Pick an uploaded file to inspect it — or download the master sheet combining every upload (Mela + Global)."
          actions={
            <div className="flex items-center gap-2">
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
              <button
                type="button"
                onClick={onDownloadMaster}
                disabled={allFiles.length === 0}
                className="btn-primary"
              >
                <Download size={16} /> Download master sheet
                {masterCount > 0 && (
                  <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold dark:bg-ink-900/20">
                    {masterCount}
                  </span>
                )}
              </button>
            </div>
          }
        />
        {listError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {listError}
          </div>
        )}
        {allFiles.length === 0 && status === 'loading' ? (
          <EmptyState
            icon={Loader2}
            title="Loading uploaded files…"
            description="Fetching every staff submission from the server."
          />
        ) : allFiles.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No night uploads yet"
            description="Once staff submit raw Travel sheet exports, files will appear here."
          />
        ) : (
          <FilePickerGrid
            icon={Moon}
            files={allFiles.map((f) => ({
              id: f.id,
              title: `${f.title} · ${(f.source ?? 'mela').toUpperCase()}`,
              uploadDate: f.uploadDate,
              uploaderName: f.uploaderName,
              fileType: f.fileType,
              driverCount: f.drivers.length,
              rowCount: f.totalRows,
              rowLabel: 'Nights',
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
        eyebrow="Unfiltered nights file"
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
        <StatCard label="Night events" value={totalRows.toLocaleString()} icon={Moon} />
        <StatCard label="Clean rows ready" value={cleanCount.toLocaleString()} icon={Layers} />
      </div>

      <div className="mt-6">
        <NightsFilters
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
              <NightDriverCard
                key={`${d.fileId}-${d.blockId}`}
                driver={d}
                onOpen={() => setOpenDriver(d)}
              />
            ))}
          </div>
        )}
      </div>

      <NightDriverModal driver={openDriver} onClose={() => setOpenDriver(null)} />
    </div>
  );
};

export const UnfilteredNightsPage = () => {
  const { isBoss } = useUserScope();
  return isBoss ? <BossView /> : <StaffView />;
};
