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
          className="card-base group flex w-full flex-col p-5 text-left transition hover:-translate-y-0.5 hover:shadow-elev"
        >
          <div className="flex items-start justify-between">
            <div
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
              style={{
                background: 'var(--color-brand-blue-soft)',
                color: 'var(--color-brand-blue)',
                border: '1px solid var(--color-brand-blue-line)',
              }}
            >
              <Icon size={18} />
            </div>
            <Badge tone="info">{f.fileType.toUpperCase()}</Badge>
          </div>

          <h3
            className="mt-5 line-clamp-2 text-lg font-semibold tracking-tight"
            style={{ color: 'var(--color-brand-blue-dark)' }}
          >
            {f.title}
          </h3>
          <p
            className="mt-1 text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Uploaded {formatDate(f.uploadDate)} · {f.uploaderName}
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <div
              className="rounded-xl p-3"
              style={{
                background: 'var(--color-brand-blue-soft)',
                border: '1px solid var(--color-brand-blue-line)',
              }}
            >
              <dt
                className="font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-brand-blue)' }}
              >
                Drivers
              </dt>
              <dd
                className="mt-1 text-lg font-semibold"
                style={{ color: 'var(--color-brand-blue-dark)' }}
              >
                {f.driverCount}
              </dd>
            </div>
            <div
              className="rounded-xl p-3"
              style={{
                background: 'var(--color-brand-blue-soft)',
                border: '1px solid var(--color-brand-blue-line)',
              }}
            >
              <dt
                className="font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-brand-blue)' }}
              >
                {f.rowLabel}
              </dt>
              <dd
                className="mt-1 text-lg font-semibold"
                style={{ color: 'var(--color-brand-blue-dark)' }}
              >
                {f.rowCount.toLocaleString()}
              </dd>
            </div>
          </dl>

          <div
            className="mt-5 flex items-center justify-between pt-4 text-sm font-semibold"
            style={{
              borderTop: '1px solid var(--color-brand-blue-line)',
              color: 'var(--color-brand-accent)',
            }}
          >
            <span>Open file</span>
            <ArrowRight size={16} className="transition group-hover:translate-x-1" />
          </div>
        </button>
      ))}
    </div>
  );
};
