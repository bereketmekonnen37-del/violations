import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { ArrowRight, FileText, Search } from 'lucide-react';
import { useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate } from '../lib/utils';
import { useUserScope } from '../hooks/useUserScope';

export const ViolationFilesPage = () => {
  const allFiles = useAppSelector((s) => s.uploads.files);
  const { isTransporterStaff, matchesTransporter } = useUserScope();
  const [query, setQuery] = useState('');

  const files = useMemo(() => {
    if (!isTransporterStaff) return allFiles;
    return allFiles
      .map((f) => {
        const records = f.records.filter((r) => matchesTransporter(r.transporter));
        return { ...f, records, rowCount: records.length };
      })
      .filter((f) => f.records.length > 0);
  }, [allFiles, isTransporterStaff, matchesTransporter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.uploaderName.toLowerCase().includes(q) ||
        f.fileType.toLowerCase().includes(q),
    );
  }, [files, query]);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        eyebrow="Manager workspace"
        title="Violation files"
        subtitle="Every uploaded report from your team — searchable, summarised, and ready for review."
        actions={
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-2.5 text-ink-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files…"
              className="input-base !py-2 pl-9 sm:w-72"
            />
          </div>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={query ? 'No matching files' : 'No uploaded files yet'}
          description={
            query
              ? 'Try a different search term or clear the filter.'
              : 'Once staff start submitting reports, every file will appear here.'
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((f) => {
            const drivers = new Set(
              f.records.map((r) => r.driverName.trim().toLowerCase()).filter(Boolean),
            );
            return (
              <Link
                key={f.id}
                to={`/violations/${f.id}`}
                className="surface group flex flex-col rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-elev"
              >
                <div className="flex items-start justify-between">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                    <FileText size={18} />
                  </div>
                  <Badge tone="neutral">{f.fileType.toUpperCase()}</Badge>
                </div>

                <h3 className="mt-5 line-clamp-2 text-lg font-semibold tracking-tight text-ink-900 dark:text-white">
                  {f.title}
                </h3>
                <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                  Uploaded {formatDate(f.uploadDate)} · {f.uploaderName}
                </p>

                <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-3 dark:border-ink-800 dark:bg-ink-900">
                    <dt className="font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
                      Records
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-ink-900 dark:text-white">
                      {f.rowCount}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-3 dark:border-ink-800 dark:bg-ink-900">
                    <dt className="font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
                      Drivers
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-ink-900 dark:text-white">
                      {drivers.size}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4 text-sm font-medium text-ink-700 dark:border-ink-800 dark:text-ink-300">
                  <span>View details</span>
                  <ArrowRight
                    size={16}
                    className="transition group-hover:translate-x-1"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
