import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  FileStack,
  FileText,
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

export const DashboardPage = () => {
  const user = useAppSelector((s) => s.auth.user);
  const allFiles = useAppSelector((s) => s.uploads.files);

  if (!user) return null;

  const isBoss = user.role === 'boss';
  const files = isBoss ? allFiles : allFiles.filter((f) => f.uploaderId === user.id);

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
        eyebrow={isBoss ? 'Overview' : 'Welcome'}
        title={isBoss ? 'Fleet operations dashboard' : `Hello, ${user.name.split(' ')[0]}`}
        subtitle={
          isBoss
            ? 'Real-time view of uploaded violation reports, drivers and transporters.'
            : 'Upload new violation reports and track your submission history.'
        }
        actions={
          isBoss ? (
            <Link to="/violations" className="btn-primary">
              View all files <ArrowRight size={16} />
            </Link>
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

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink-900 dark:text-white">
              Recent uploads
            </h2>
            <p className="text-sm text-ink-500 dark:text-ink-400">
              {isBoss ? 'Latest reports submitted to the platform.' : 'Your latest submissions.'}
            </p>
          </div>
          {isBoss && files.length > 0 && (
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
              isBoss
                ? 'Once staff submit violation reports, they will appear here for review.'
                : 'Upload your first CSV, XLSX or PDF to get started.'
            }
            action={
              !isBoss && (
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
                    {isBoss && (
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

      {isBoss && files.length > 0 && (
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
