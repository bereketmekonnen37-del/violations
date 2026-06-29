import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Trash2,
  Upload as UploadIcon,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { addFile, removeFile } from '../features/uploads/uploadsSlice';
import { detectFileKind, parseFile } from '../lib/parsers';
import { cn, formatDateTime, newId } from '../lib/utils';
import type { FileKind } from '../types';

interface FormValues {
  title: string;
}

const acceptString = '.csv,.xlsx,.xls,.pdf';

const FILE_ICON: Record<FileKind, typeof FileText> = {
  csv: FileSpreadsheet,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  pdf: FileText,
};

export const UploadPage = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user)!;
  const myFiles = useAppSelector((s) =>
    s.uploads.files.filter((f) => f.uploaderId === user.id),
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<FileKind | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { title: '' } });

  useEffect(() => {
    if (!successId) return;
    const t = setTimeout(() => setSuccessId(null), 3500);
    return () => clearTimeout(t);
  }, [successId]);

  const pickFile = (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      setKind(null);
      return;
    }
    const k = detectFileKind(f);
    if (!k) {
      setError('Unsupported file. Please upload CSV, XLSX, XLS or PDF.');
      return;
    }
    setFile(f);
    setKind(k);
  };

  const onSubmit = async ({ title }: FormValues) => {
    if (!file || !kind) {
      setError('Please choose a file before uploading.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const records = await parseFile(file, kind);
      const id = newId();
      dispatch(
        addFile({
          id,
          title: title.trim(),
          uploadDate: new Date().toISOString(),
          fileType: kind,
          uploaderId: user.id,
          uploaderName: user.name,
          rowCount: records.length,
          records,
        }),
      );
      setSuccessId(id);
      setFile(null);
      setKind(null);
      if (inputRef.current) inputRef.current.value = '';
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse the file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        eyebrow="Staff workspace"
        title="Upload violation data"
        subtitle="Submit daily reports as CSV, XLSX, XLS or PDF. Files are parsed and securely stored in your workspace."
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <form onSubmit={handleSubmit(onSubmit)} className="surface rounded-2xl p-5 sm:p-7">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
              File title
            </label>
            <input
              type="text"
              placeholder="e.g. Daily Driver Violations — Week 28"
              className="input-base mt-2"
              {...register('title', {
                required: 'A title is required before uploading.',
                minLength: { value: 3, message: 'Title must be at least 3 characters.' },
              })}
            />
            {errors.title && (
              <p className="mt-1.5 text-xs text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="mt-6">
            <label className="text-xs font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
              Source file
            </label>
            <div
              onDragEnter={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) pickFile(f);
              }}
              className={cn(
                'mt-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition',
                dragging
                  ? 'border-ink-900 bg-ink-50 dark:border-white dark:bg-ink-800'
                  : 'border-ink-200 bg-ink-50/60 dark:border-ink-700 dark:bg-ink-900/60',
              )}
            >
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-ink-700 shadow-card dark:bg-ink-800 dark:text-ink-100">
                <UploadIcon size={20} />
              </div>
              <p className="text-sm font-semibold text-ink-900 dark:text-white">
                Drag & drop your report here
              </p>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                or click to browse — CSV, XLSX, XLS or PDF
              </p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="btn-secondary mt-5"
              >
                Choose file
              </button>
              <input
                ref={inputRef}
                type="file"
                accept={acceptString}
                hidden
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          {file && kind && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-ink-200 bg-white px-4 py-3 dark:border-ink-700 dark:bg-ink-900">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                  <FileText size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">
                    {file.name}
                  </p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">
                    {(file.size / 1024).toFixed(1)} KB · {kind.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => pickFile(null)}
                className="btn-ghost h-9 w-9 p-0"
                aria-label="Remove file"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          {successId && (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 size={16} /> File uploaded and parsed successfully.
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-500 dark:text-ink-400">
              Files are stored privately in your workspace and visible to managers.
            </p>
            <button type="submit" className="btn-primary" disabled={busy || !file}>
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Parsing…
                </>
              ) : (
                <>
                  <UploadIcon size={16} /> Upload report
                </>
              )}
            </button>
          </div>
        </form>

        <div className="surface rounded-2xl p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink-900 dark:text-white">
              Your uploads
            </h3>
            <Badge tone="neutral">{myFiles.length}</Badge>
          </div>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
            History of all reports you've submitted.
          </p>

          <div className="mt-5 space-y-2">
            {myFiles.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No uploads yet"
                description="Drop a CSV or PDF in the panel on the left to begin."
              />
            ) : (
              myFiles.map((f) => {
                const Icon = FILE_ICON[f.fileType];
                return (
                  <div
                    key={f.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-ink-100 bg-white p-3 dark:border-ink-800 dark:bg-ink-900"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                          {f.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-500 dark:text-ink-400">
                          {formatDateTime(f.uploadDate)} · {f.rowCount} records ·{' '}
                          {f.fileType.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => dispatch(removeFile(f.id))}
                      className="btn-ghost h-8 w-8 p-0 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                      aria-label="Delete upload"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
