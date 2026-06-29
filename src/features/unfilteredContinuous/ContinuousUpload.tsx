import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Route,
  Upload as UploadIcon,
  X,
} from 'lucide-react';
import { useAppDispatch } from '../../app/store';
import { addContinuousFile } from './unfilteredContinuousSlice';
import {
  detectContinuousKind,
  parseContinuousFile,
} from '../../lib/continuousParser';
import { cn, newId } from '../../lib/utils';
import type { UnfilteredFileKind, User } from '../../types';

interface Props {
  user: User;
}
interface FormValues {
  title: string;
}

export const ContinuousUpload = ({ user }: Props) => {
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<UnfilteredFileKind | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { title: '' } });

  const pick = (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      setKind(null);
      return;
    }
    const k = detectContinuousKind(f);
    if (!k) {
      setError('Only CSV, XLSX, or XLS files are supported here.');
      return;
    }
    setFile(f);
    setKind(k);
  };

  const onSubmit = async ({ title }: FormValues) => {
    if (!file || !kind) {
      setError('Please select a file before uploading.');
      return;
    }
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      const drivers = await parseContinuousFile(file, kind);
      const totalRows = drivers.reduce((s, d) => s + d.rows.length, 0);
      dispatch(
        addContinuousFile({
          id: newId(),
          title: title.trim(),
          uploadDate: new Date().toISOString(),
          uploaderId: user.id,
          uploaderName: user.name,
          fileType: kind,
          drivers,
          totalRows,
        }),
      );
      setOkMsg(
        `Parsed ${drivers.length} driver${drivers.length === 1 ? '' : 's'} · ${totalRows} continuous trip${totalRows === 1 ? '' : 's'}.`,
      );
      setFile(null);
      setKind(null);
      if (inputRef.current) inputRef.current.value = '';
      reset();
      setTimeout(() => setOkMsg(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not parse the file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="surface rounded-2xl p-5 sm:p-7">
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
          File title
        </label>
        <input
          type="text"
          placeholder="e.g. Continuous driving sheet — Week 23"
          className="input-base mt-2"
          {...register('title', {
            required: 'Add a title before uploading.',
            minLength: { value: 3, message: 'Title must be at least 3 characters.' },
          })}
        />
        {errors.title && (
          <p className="mt-1.5 text-xs text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div className="mt-6">
        <label className="text-xs font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
          Travel sheet source file
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
            if (f) pick(f);
          }}
          className={cn(
            'mt-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition',
            dragging
              ? 'border-ink-900 bg-ink-50 dark:border-white dark:bg-ink-800'
              : 'border-ink-200 bg-ink-50/60 dark:border-ink-700 dark:bg-ink-900/60',
          )}
        >
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-ink-700 shadow-card dark:bg-ink-800 dark:text-ink-100">
            <Route size={20} />
          </div>
          <p className="text-sm font-semibold text-ink-900 dark:text-white">
            Drop your “Travel Sheet (Continuous Driving)” export
          </p>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
            Repeated <code className="font-mono">Object / Group / Period</code> blocks
            with Time A / Time B trip rows are supported. Sub-total summary rows are
            skipped.
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
            accept=".csv,.xlsx,.xls"
            hidden
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      {file && kind && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-ink-200 bg-white px-4 py-3 dark:border-ink-700 dark:bg-ink-900">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
              <FileSpreadsheet size={16} />
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
            onClick={() => pick(null)}
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

      {okMsg && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 size={16} /> {okMsg}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button type="submit" className="btn-primary" disabled={busy || !file}>
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Parsing blocks…
            </>
          ) : (
            <>
              <UploadIcon size={16} /> Upload & parse
            </>
          )}
        </button>
      </div>
    </form>
  );
};
