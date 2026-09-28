import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Loader2,
  Paperclip,
  Search,
  Send,
  Sparkles,
  UserPlus,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/store';
import { Avatar } from '../../components/ui/Avatar';
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
  open: boolean;
  onClose: () => void;
  /** Optional pre-selected staff (used when the boss opens the modal from a
   *  specific staff card so they can quickly hand them a new task). */
  initialAssigneeIds?: string[];
}

/**
 * Centered glass-styled modal for creating a task. Renders on top of a
 * blurred backdrop and animates in from a subtle scale/translate.
 */
export const CreateTaskModal = ({
  open,
  onClose,
  initialAssigneeIds = [],
}: Props) => {
  const dispatch = useAppDispatch();
  const staff = useAppSelector((s) => s.staffUsers.users);
  const staffStatus = useAppSelector((s) => s.staffUsers.status);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<string[]>(initialAssigneeIds);
  const [files, setFiles] = useState<File[]>([]);
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Re-seed the selection every time the modal is opened. Comparing against
  // the previous "open" value lets us do it without a setState-in-effect
  // (which triggers cascading renders) — we only touch state on the
  // closed→open transition.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setSelected(initialAssigneeIds);
    setErr(null);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    // Lazy-load staff list on first open.
    if (staffStatus === 'idle') {
      dispatch(setStaffUsersStatus('loading'));
      fetchStaffUsers()
        .then((list) => dispatch(setStaffUsers(list)))
        .catch((e) =>
          dispatch(
            setStaffUsersError(e instanceof Error ? e.message : String(e)),
          ),
        );
    }
  }, [open, staffStatus, dispatch]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // Lock background scroll while the modal is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const canSubmit = useMemo(
    () => !submitting && title.trim().length > 0 && selected.length > 0,
    [submitting, title, selected],
  );

  const filteredStaff = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q),
    );
  }, [staff, query]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const selectAllVisible = () => {
    const ids = filteredStaff.map((s) => s.id);
    // Union with current selection so hidden picks aren't lost.
    setSelected((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const clearSelection = () => setSelected([]);

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
      // Reset & close.
      setTitle('');
      setDescription('');
      setSelected([]);
      setFiles([]);
      setQuery('');
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label="Create task"
    >
      {/* Glass backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 700px at 50% -10%, rgba(62, 85, 165, 0.35), rgba(15, 20, 40, 0.55) 45%, rgba(15, 20, 40, 0.7))',
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        }}
      />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl shadow-2xl"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(247,248,252,0.94) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.7)',
          boxShadow:
            '0 30px 60px -20px rgba(15, 20, 40, 0.45), 0 0 0 1px rgba(62, 85, 165, 0.08)',
          animation: 'taskModalIn 220ms cubic-bezier(0.2, 0.9, 0.25, 1)',
        }}
      >
        {/* Header */}
        <div
          className="relative flex items-center justify-between px-6 py-5"
          style={{
            background:
              'linear-gradient(135deg, #3e55a5 0%, #34488c 55%, #2a3a72 100%)',
            color: '#ffffff',
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: '1px solid rgba(255,255,255,0.28)',
              }}
            >
              <Sparkles size={16} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                Task management
              </p>
              <h2 className="text-base font-semibold">Create a new task</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-white/85 transition hover:bg-white/15"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="grid gap-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Task title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Follow up with Abebe about Djibouti route"
                maxLength={200}
                autoFocus
                className="mt-1.5 w-full rounded-xl border border-brand-blue-line bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Anything the staff should know before they act on it."
                className="mt-1.5 w-full resize-y rounded-xl border border-brand-blue-line bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Assign to
                </label>
                <div className="flex items-center gap-3 text-[11px]">
                  <button
                    type="button"
                    onClick={selectAllVisible}
                    disabled={filteredStaff.length === 0}
                    className="font-semibold text-brand-blue hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Select all
                  </button>
                  {selected.length > 0 && (
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="font-semibold text-brand-red hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-brand-blue-line bg-white/60 backdrop-blur">
                <div className="flex items-center gap-2 border-b border-brand-blue-line px-3 py-2">
                  <Search size={13} className="text-ink-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search staff by name or email"
                    className="w-full bg-transparent text-xs text-ink-800 outline-none placeholder:text-ink-400"
                  />
                  {selected.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-red px-2 py-0.5 text-[10px] font-bold text-white">
                      <UsersIcon size={10} /> {selected.length}
                    </span>
                  )}
                </div>

                {staffStatus === 'loading' && staff.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-ink-500">
                    <Loader2 size={12} className="mr-1 inline animate-spin" />
                    Loading staff…
                  </p>
                ) : filteredStaff.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs italic text-ink-500">
                    {staff.length === 0
                      ? 'No staff accounts yet. Create one in User Management.'
                      : 'No matches — try a different search.'}
                  </p>
                ) : (
                  <ul className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto p-2 sm:grid-cols-2">
                    {filteredStaff.map((s) => {
                      const active = selected.includes(s.id);
                      return (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => toggle(s.id)}
                            className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition ${
                              active
                                ? 'bg-brand-blue text-white shadow-sm ring-1 ring-brand-blue-dark'
                                : 'bg-white text-ink-800 ring-1 ring-brand-blue-line hover:bg-brand-blue-tint'
                            }`}
                          >
                            <Avatar
                              name={s.name || s.email}
                              size={26}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold">
                                {s.name || s.email}
                              </p>
                              <p
                                className={`truncate text-[10px] ${
                                  active ? 'text-white/75' : 'text-ink-500'
                                }`}
                              >
                                {s.email}
                              </p>
                            </div>
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                                active
                                  ? 'border-white bg-white text-brand-blue'
                                  : 'border-brand-blue-line bg-white text-transparent'
                              }`}
                              aria-hidden
                            >
                              <Check size={12} strokeWidth={3} />
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Attachments
              </label>
              <label className="mt-1.5 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-brand-blue-line bg-white px-3 py-2 text-xs font-medium text-ink-700 transition hover:border-brand-blue hover:bg-brand-blue-soft">
                <Paperclip size={13} />
                Attach PDF or images
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setFiles((prev) => [
                        ...prev,
                        ...Array.from(e.target.files!),
                      ]);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
              {files.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {files.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-blue-line bg-white px-2 py-1 text-[11px] text-ink-700"
                    >
                      <span className="max-w-[160px] truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setFiles((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
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
              <p className="rounded-xl bg-brand-red-muted/40 px-3 py-2 text-xs text-brand-red-dark">
                {err}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3 border-t border-brand-blue-line bg-white/70 px-6 py-4 backdrop-blur"
        >
          <p className="text-[11px] text-ink-500">
            {selected.length === 0
              ? 'Pick one or more staff to hand this task to.'
              : `${selected.length} staff will get this task.`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-xs font-semibold text-ink-600 hover:bg-brand-blue-tint"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-5 py-2 text-xs font-semibold text-white transition hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Assigning…
                </>
              ) : (
                <>
                  <UserPlus size={12} /> Assign task
                  {selected.length > 0 && (
                    <span className="ml-1 rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-bold">
                      {selected.length}
                    </span>
                  )}
                  <Send size={12} className="ml-1 opacity-80" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes taskModalIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};
