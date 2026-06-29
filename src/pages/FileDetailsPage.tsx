import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { AlertOctagon, ArrowLeft, FileText, Users } from 'lucide-react';
import { useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ViolationCard } from '../features/violations/ViolationCard';
import { ViolationFilterBar } from '../features/violations/ViolationFilterBar';
import { Pagination } from '../features/violations/Pagination';
import { useViolationFilters } from '../features/violations/useViolationFilters';
import { formatDate } from '../lib/utils';

const PAGE_SIZE = 20;

export const FileDetailsPage = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const file = useAppSelector((s) => s.uploads.files.find((f) => f.id === fileId));

  const records = file?.records ?? [];
  const {
    filters,
    setFilters,
    filtered,
    eventTypes,
    reset,
    activeCount,
    getCount,
    maxViolations,
  } = useViolationFilters(records);

  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  const driverCount = useMemo(() => {
    const s = new Set<string>();
    records.forEach((r) => r.driverName && s.add(r.driverName.trim().toLowerCase()));
    return s.size;
  }, [records]);

  if (!file) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <EmptyState
          icon={FileText}
          title="File not found"
          description="This violation file may have been removed or never existed."
          action={
            <Link to="/violations" className="btn-primary">
              Back to files
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <Link
        to="/violations"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> All files
      </Link>

      <PageHeader
        eyebrow="Violation file"
        title={file.title}
        subtitle={`Uploaded ${formatDate(file.uploadDate)} by ${file.uploaderName}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{file.fileType.toUpperCase()}</Badge>
            <Badge tone="info">{file.rowCount.toLocaleString()} records</Badge>
            <Badge tone="neutral">
              <Users size={11} /> {driverCount} drivers
            </Badge>
            {maxViolations > 1 && (
              <Badge tone="danger">
                <AlertOctagon size={11} /> Worst driver · {maxViolations}× violations
              </Badge>
            )}
          </div>
        }
      />

      <ViolationFilterBar
        filters={filters}
        onChange={setFilters}
        onReset={reset}
        eventTypes={eventTypes}
        activeCount={activeCount}
        total={records.length}
        matched={filtered.length}
        maxViolations={maxViolations}
      />

      <div className="mt-6">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No matching violations"
            description="Adjust your filters or clear them to see more results."
          />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {paginated.map((r, i) => (
                <ViolationCard
                  key={r.id}
                  record={r}
                  index={(page - 1) * PAGE_SIZE + i + 1}
                  driverViolationCount={getCount(r)}
                />
              ))}
            </div>
            <div className="mt-8">
              <Pagination page={page} pageCount={pageCount} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
