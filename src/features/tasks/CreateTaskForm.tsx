import { useEffect, useMemo, useState } from 'react';
import { Loader2, Paperclip, Send, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/store';
import {
  setStaffUsers,
  setStaffUsersError,
  setStaffUsersStatus,
} from '../staffUsers/staffUsersSlice';
import { fetchStaffUsers } from '../staffUsers/staffUsersApi';
import { createTask } from './tasksApi';
import { upsertTask } from './tasksSlice';
import { toast } from '../toast/toastStore';

interface Props {
  onDone: () => void;
  onCancel: () => void;
}

export const CreateTaskForm = ({ onDone, onCancel }: Props) => {
  const dispatch = useAppDispatch();
  const staff = useAppSelector((s) => s.staffUsers.users);
  const staffStatus = useAppSelector((s) => s.staffUsers.status);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Lazy-load the staff list the first time the form opens.
  useEffect(() => {
    if (staffStatus !== 'idle') return;
    dispatch(setStaffUsersStatus('loading'));
    fetchStaffUsers()
      .then((list) => dispatch(setStaffUsers(list)))
      .catch((e) =>
        dispatch(setStaffUsersError(e instanceof Error ? e.message : String(e))),
      );
  }, [dispatch, staffStatus]);

  const canSubmit = useMemo(
    () =>
      !submitting &&
      title.trim().length > 0 &&
      selected.length > 0,
    [submitting, title, selected],
  );

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const onFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErr(null);
    const staffCount = selected.length;
    const fileCount = files.length;
    try {
      const task = await toast.promise(
        createTask({
          title,
          description,
          assigneeIds: selected,
          briefFiles: files,
        }),
        {
          loading:
            fileCount > 0
              ? `Uploading ${fileCount} attachment${fileCount === 1 ? '' : 's'} & assigning…`
              : 'Assigning task…',
          success: `Task assigned to ${staffCount} ${staffCount === 1 ? 'person' : 'people'}`,
          successDescription: (t) => `"${t.title}"`,
          error: 'Could not assign task',
        },
      );
      dispatch(upsertTask(task));
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-brand-blue-line bg-brand-blue-tint p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-brand-blue-dark">New task</h4>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full p-1 text-ink-500 hover:bg-white hover:text-ink-900"
          aria-label="Cancel"
        >
          <X size={14} />
        </button>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
          Title
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Call driver Abebe about Djibouti route"
          maxLength={200}
          className="rounded-lg border border-brand-blue-line bg-white px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-brand-blue"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
          Description (optional)
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Anything the staff should know before they act on it."
          className="resize-y rounded-lg border border-brand-blue-line bg-white px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-brand-blue"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
          Assign to
        </span>
        {staffStatus === 'loading' && (
          <p className="text-xs text-ink-500">Loading staff…</p>
        )}
        {staffStatus === 'error' && (
          <p className="text-xs text-brand-red">Failed to load staff list.</p>
        )}
        {staff.length === 0 && staffStatus === 'loaded' && (
          <p className="text-xs text-ink-500">
            No staff accounts yet — create one in User Management first.
          </p>
        )}
        {staff.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {staff.map((s) => {
              const active = selected.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    active
                      ? 'bg-brand-blue text-white'
                      : 'border border-brand-blue-line bg-white text-ink-700 hover:border-brand-blue'
                  }`}
                >
                  {s.name || s.email}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
          Attachments (optional)
        </span>
        <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-brand-blue-line bg-white px-3 py-2 text-xs font-medium text-ink-700 transition hover:border-brand-blue hover:bg-brand-blue-soft">
          <Paperclip size={13} />
          Attach PDF or images
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
        {files.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-blue-line bg-white px-2 py-1 text-[11px] text-ink-700"
              >
                <span className="max-w-[160px] truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    setFiles((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="text-ink-500 hover:text-brand-red"
                  aria-label={`Remove ${f.name}`}
                >
                  <X size={11} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {err && (
        <p className="rounded-lg bg-brand-red-muted/40 px-3 py-2 text-xs text-brand-red-dark">
          {err}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 size={12} className="animate-spin" /> Assigning…
            </>
          ) : (
            <>
              <Send size={12} /> Assign task
            </>
          )}
        </button>
      </div>
    </div>
  );
};
