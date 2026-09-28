import { useState } from 'react';
import { Loader2, Paperclip, Send, X } from 'lucide-react';
import { useAppDispatch } from '../../app/store';
import type { TaskAssignment } from '../../types';
import { submitCompletion } from './tasksApi';
import { upsertTask } from './tasksSlice';
import { toast } from '../toast/toastStore';

interface Props {
  assignment: TaskAssignment;
  onDone: () => void;
  onCancel: () => void;
}

export const CompleteTaskForm = ({ assignment, onDone, onCancel }: Props) => {
  const dispatch = useAppDispatch();
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErr(null);
    const fileCount = files.length;
    try {
      const task = await toast.promise(
        submitCompletion({
          assignmentId: assignment.id,
          taskId: assignment.taskId,
          note,
          proofFiles: files,
        }),
        {
          loading:
            fileCount > 0
              ? `Uploading ${fileCount} proof file${fileCount === 1 ? '' : 's'}…`
              : 'Submitting for approval…',
          success: 'Sent to boss for approval',
          successDescription:
            "You'll get a notification when it's approved or sent back.",
          error: 'Could not submit',
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
    <div className="mt-2 flex flex-col gap-3 rounded-xl border border-brand-blue-line bg-white p-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
          What did you do? (optional)
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Short note for the boss."
          className="resize-y rounded-lg border border-brand-blue-line bg-brand-blue-tint px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-blue"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-brand-blue-line bg-brand-blue-tint px-3 py-2 text-xs font-medium text-ink-700 transition hover:border-brand-blue">
          <Paperclip size={13} />
          Attach proof (optional)
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
              }
              e.target.value = '';
            }}
          />
        </label>
        {files.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-blue-line bg-brand-blue-tint px-2 py-1 text-[11px] text-ink-700"
              >
                <span className="max-w-[140px] truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    setFiles((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  aria-label={`Remove ${f.name}`}
                  className="text-ink-500 hover:text-brand-red"
                >
                  <X size={11} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {err && (
        <p className="rounded bg-brand-red-muted/40 px-2 py-1.5 text-[11px] text-brand-red-dark">
          {err}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-3 py-1 text-[11px] font-semibold text-ink-600 hover:bg-brand-blue-tint"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-brand-blue-hover disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 size={11} className="animate-spin" /> Sending…
            </>
          ) : (
            <>
              <Send size={11} /> Submit for approval
            </>
          )}
        </button>
      </div>
    </div>
  );
};
