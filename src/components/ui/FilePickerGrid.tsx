import { ArrowRight, FileSpreadsheet, type LucideIcon } from 'lucide-react';
import { Badge } from './Badge';
import { formatDate } from '../../lib/utils';

export interface FilePickerCard {
  id: string;
  title: string;
  uploadDate: string;
  uploaderName: string;
  fileType: string;
  driverCount: number;
  rowCount: number;
  rowLabel: string;
}

interface Props {
  files: FilePickerCard[];
  onSelect: (id: string) => void;
  icon?: LucideIcon;
}

export const FilePickerGrid = ({ files, onSelect, icon: Icon = FileSpreadsheet }: Props) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {files.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onSelect(f.id)}
          className="surface group flex w-full flex-col rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:shadow-elev"
        >
          <div className="flex items-start justify-between">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
              <Icon size={18} />
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
                Drivers
              </dt>
              <dd className="mt-1 text-lg font-semibold text-ink-900 dark:text-white">
                {f.driverCount}
              </dd>
            </div>
            <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-3 dark:border-ink-800 dark:bg-ink-900">
              <dt className="font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
                {f.rowLabel}
              </dt>
              <dd className="mt-1 text-lg font-semibold text-ink-900 dark:text-white">
                {f.rowCount.toLocaleString()}
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4 text-sm font-medium text-ink-700 dark:border-ink-800 dark:text-ink-300">
            <span>Open file</span>
            <ArrowRight size={16} className="transition group-hover:translate-x-1" />
          </div>
        </button>
      ))}
    </div>
  );
};
