import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Trash2,
  Undo2,
  X,
  XCircle,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/store';
import type { Task, TaskAssignment, TaskStatus } from '../../types';
import { closeDrawer, removeTask, upsertTask } from './tasksSlice';
import {
  approveAssignment,
  deleteTask,
  markSeenByBoss,
  markSeenByStaff,
  rejectAssignment,
  reopenAssignment,
} from './tasksApi';
import { CreateTaskForm } from './CreateTaskForm';
import { CompleteTaskForm } from './CompleteTaskForm';
import { AttachmentChip } from './AttachmentChip';
import { toast } from '../toast/toastStore';

type BossTab = 'awaiting_approval' | 'active' | 'completed';
type StaffTab = 'pending' | 'awaiting_approval' | 'completed';

const STATUS_TEXT: Record<TaskStatus, string> = {
  pending: 'Pending',
  awaiting_approval: 'Awaiting approval',
  completed: 'Completed',
  rejected: 'Rejected — please redo',
};

const STATUS_TONE: Record<TaskStatus, string> = {
  pending: 'bg-brand-blue-soft text-brand-blue-dark',
  awaiting_approval: 'bg-brand-accent-soft text-brand-accent-dark',
  completed: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-brand-red-muted/60 text-brand-red-dark',
};

const relative = (iso: string): string => {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
};

export const TaskDrawer = () => {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.tasks.drawerOpen);
  const tasks = useAppSelector((s) => s.tasks.tasks);
  const status = useAppSelector((s) => s.tasks.status);
  const error = useAppSelector((s) => s.tasks.error);
  const user = useAppSelector((s) => s.auth.user);

  const isBoss = user?.role === 'boss';
  const userId = user?.id ?? '';

  const [creating, setCreating] = useState(false);
  const [bossTab, setBossTab] = useState<BossTab>('awaiting_approval');
  const [staffTab, setStaffTab] = useState<StaffTab>('pending');

  // Mark as seen when drawer opens.
  useEffect(() => {
    if (!open) return;
    if (isBoss) {
      void markSeenByBoss().catch(() => {
        /* non-fatal */
      });
    } else {
      const mine = tasks
        .flatMap((t) => t.assignments)
        .filter((a) => a.staffId === userId)
        .map((a) => a.id);
      void markSeenByStaff(mine).catch(() => {
        /* non-fatal */
      });
    }
    // We only re-run when the drawer opens (not on every task change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const bossBuckets = useMemo(() => {
    const awaiting: Task[] = [];
    const active: Task[] = [];
    const completed: Task[] = [];
    for (const t of tasks) {
      if (t.assignments.some((a) => a.status === 'awaiting_approval')) {
        awaiting.push(t);
      }
      if (t.assignments.some((a) => a.status === 'pending' || a.status === 'rejected')) {
        active.push(t);
      }
      if (t.assignments.length > 0 && t.assignments.every((a) => a.status === 'completed')) {
        completed.push(t);
      }
    }
    return { awaiting, active, completed };
  }, [tasks]);

  const staffBuckets = useMemo(() => {
    const mine = tasks
      .map((t) => ({
        task: t,
        assignment: t.assignments.find((a) => a.staffId === userId),
      }))
      .filter((x): x is { task: Task; assignment: TaskAssignment } =>
        Boolean(x.assignment),
      );
    return {
      pending: mine.filter(
        (m) => m.assignment.status === 'pending' || m.assignment.status === 'rejected',
      ),
      awaiting_approval: mine.filter(
        (m) => m.assignment.status === 'awaiting_approval',
      ),
      completed: mine.filter((m) => m.assignment.status === 'completed'),
    };
  }, [tasks, userId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close task drawer"
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={() => dispatch(closeDrawer())}
      />
      {/* panel */}
      <aside className="flex h-full w-full max-w-md flex-col border-l border-brand-blue-line bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-brand-blue-line px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-blue">
              Task management
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-ink-900">
              {isBoss ? 'Tasks you assigned' : 'My tasks'}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {isBoss && !creating && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-blue-hover"
              >
                <Plus size={13} /> New task
              </button>
            )}
            <button
              type="button"
              onClick={() => dispatch(closeDrawer())}
              className="rounded-full p-1.5 text-ink-500 hover:bg-brand-blue-tint hover:text-ink-900"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {status === 'loading' && tasks.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-ink-500">
              <Loader2 size={14} className="animate-spin" /> Loading tasks…
            </div>
          )}
          {error && (
            <p className="rounded-lg bg-brand-red-muted/40 px-3 py-2 text-xs text-brand-red-dark">
              {error}
            </p>
          )}

          {isBoss && creating && (
            <div className="mb-4">
              <CreateTaskForm
                onDone={() => setCreating(false)}
                onCancel={() => setCreating(false)}
              />
            </div>
          )}

          {isBoss ? (
            <BossView
              tab={bossTab}
              setTab={setBossTab}
              buckets={bossBuckets}
            />
          ) : (
            <StaffView
              tab={staffTab}
              setTab={setStaffTab}
              buckets={staffBuckets}
              userId={userId}
            />
          )}
        </div>
      </aside>
    </div>
  );
};

// ── Boss view ────────────────────────────────────────────────────

interface BossViewProps {
  tab: BossTab;
  setTab: (t: BossTab) => void;
  buckets: { awaiting: Task[]; active: Task[]; completed: Task[] };
}

const BossView = ({ tab, setTab, buckets }: BossViewProps) => {
  const list =
    tab === 'awaiting_approval'
      ? buckets.awaiting
      : tab === 'active'
        ? buckets.active
        : buckets.completed;

  return (
    <>
      <div className="mb-3 flex gap-1 rounded-full bg-brand-blue-tint p-1">
        <TabPill
          label="Awaiting"
          count={buckets.awaiting.length}
          active={tab === 'awaiting_approval'}
          onClick={() => setTab('awaiting_approval')}
        />
        <TabPill
          label="Active"
          count={buckets.active.length}
          active={tab === 'active'}
          onClick={() => setTab('active')}
        />
        <TabPill
          label="Done"
          count={buckets.completed.length}
          active={tab === 'completed'}
          onClick={() => setTab('completed')}
        />
      </div>
      {list.length === 0 ? (
        <p className="mt-6 text-center text-xs text-ink-500">
          Nothing here yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((t) => (
            <li key={t.id}>
              <BossTaskCard task={t} focusTab={tab} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

const BossTaskCard = ({ task, focusTab }: { task: Task; focusTab: BossTab }) => {
  const dispatch = useAppDispatch();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const relevant = task.assignments.filter((a) => {
    if (focusTab === 'awaiting_approval') return a.status === 'awaiting_approval';
    if (focusTab === 'active') return a.status === 'pending' || a.status === 'rejected';
    return a.status === 'completed';
  });
  const visible = relevant.length > 0 ? relevant : task.assignments;

  const doApprove = async (a: TaskAssignment) => {
    setBusyId(a.id);
    const staffLabel = a.staffName || a.staffEmail || 'staff';
    try {
      const updated = await toast.promise(approveAssignment(a.id, task.id), {
        loading: 'Approving submission…',
        success: `Approved ${staffLabel}'s submission`,
        successDescription: `"${task.title}"`,
        error: 'Could not approve',
      });
      dispatch(upsertTask(updated));
    } catch {
      /* toast surfaces the error */
    } finally {
      setBusyId(null);
    }
  };

  const doReject = async (a: TaskAssignment) => {
    if (!rejectReason.trim()) return;
    setBusyId(a.id);
    const staffLabel = a.staffName || a.staffEmail || 'staff';
    try {
      const updated = await toast.promise(
        rejectAssignment(a.id, task.id, rejectReason),
        {
          loading: 'Sending back to staff…',
          success: `Sent back to ${staffLabel}`,
          successDescription: 'They will get a notification to redo it.',
          error: 'Could not reject',
        },
      );
      dispatch(upsertTask(updated));
      setRejectingId(null);
      setRejectReason('');
    } catch {
      /* toast surfaces the error */
    } finally {
      setBusyId(null);
    }
  };

  const doDelete = async () => {
    if (
      !window.confirm(`Delete task "${task.title}"? This can't be undone.`)
    ) {
      return;
    }
    setDeleting(true);
    try {
      await toast.promise(deleteTask(task.id), {
        loading: 'Deleting task…',
        success: 'Task deleted',
        successDescription: `"${task.title}"`,
        error: 'Could not delete task',
      });
      dispatch(removeTask(task.id));
    } catch {
      /* toast surfaces the error */
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article className="rounded-2xl border border-brand-blue-line bg-white p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink-900">
            {task.title}
          </h3>
          <p className="mt-0.5 text-[11px] text-ink-500">
            Assigned {relative(task.createdAt)} · {task.assignments.length}{' '}
            {task.assignments.length === 1 ? 'staff' : 'staff'}
          </p>
        </div>
        <button
          type="button"
          onClick={doDelete}
          disabled={deleting}
          className="rounded-full p-1 text-ink-400 hover:bg-brand-red-muted/40 hover:text-brand-red disabled:opacity-50"
          aria-label="Delete task"
        >
          {deleting ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Trash2 size={13} />
          )}
        </button>
      </header>

      {task.description && (
        <p className="mt-2 whitespace-pre-wrap text-xs text-ink-700">
          {task.description}
        </p>
      )}

      {task.briefAttachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {task.briefAttachments.map((f) => (
            <AttachmentChip key={f.id} file={f} />
          ))}
        </div>
      )}

      <ul className="mt-3 flex flex-col gap-2">
        {visible.map((a) => (
          <li
            key={a.id}
            className="rounded-xl border border-brand-blue-line bg-brand-blue-tint p-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink-800">
                  {a.staffName || a.staffEmail || 'Unknown staff'}
                </p>
                <p className="text-[10px] text-ink-500">
                  {a.submittedAt
                    ? `Submitted ${relative(a.submittedAt)}`
                    : a.status === 'completed' && a.completedAt
                      ? `Completed ${relative(a.completedAt)}`
                      : `Created ${relative(a.createdAt)}`}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONE[a.status]}`}
              >
                {STATUS_TEXT[a.status]}
              </span>
            </div>

            {a.staffNote && (
              <p className="mt-1.5 rounded bg-white px-2 py-1.5 text-[11px] italic text-ink-700">
                "{a.staffNote}"
              </p>
            )}

            {a.proofAttachments.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {a.proofAttachments.map((f) => (
                  <AttachmentChip key={f.id} file={f} />
                ))}
              </div>
            )}

            {a.bossResponse && a.status === 'rejected' && (
              <p className="mt-1.5 text-[11px] text-brand-red-dark">
                <span className="font-semibold">Your note:</span> {a.bossResponse}
              </p>
            )}

            {a.status === 'awaiting_approval' && (
              <div className="mt-2">
                {rejectingId === a.id ? (
                  <div className="flex flex-col gap-1.5">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Why is this being rejected?"
                      className="rounded border border-brand-blue-line bg-white px-2 py-1 text-[11px]"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectReason('');
                        }}
                        className="rounded-full px-2 py-1 text-[10px] text-ink-600 hover:bg-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => doReject(a)}
                        disabled={busyId === a.id || !rejectReason.trim()}
                        className="inline-flex items-center gap-1 rounded-full bg-brand-red px-2 py-1 text-[10px] font-semibold text-white hover:bg-brand-red-hover disabled:opacity-50"
                      >
                        {busyId === a.id ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <XCircle size={10} />
                        )}
                        Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRejectingId(a.id)}
                      className="rounded-full border border-brand-red-muted px-2.5 py-1 text-[10px] font-semibold text-brand-red hover:bg-brand-red-muted/40"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => doApprove(a)}
                      disabled={busyId === a.id}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busyId === a.id ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <Check size={10} />
                      )}
                      Approve
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
};

// ── Staff view ───────────────────────────────────────────────────

interface StaffViewProps {
  tab: StaffTab;
  setTab: (t: StaffTab) => void;
  buckets: {
    pending: { task: Task; assignment: TaskAssignment }[];
    awaiting_approval: { task: Task; assignment: TaskAssignment }[];
    completed: { task: Task; assignment: TaskAssignment }[];
  };
  userId: string;
}

const StaffView = ({ tab, setTab, buckets }: StaffViewProps) => {
  const list = buckets[tab];
  return (
    <>
      <div className="mb-3 flex gap-1 rounded-full bg-brand-blue-tint p-1">
        <TabPill
          label="To do"
          count={buckets.pending.length}
          active={tab === 'pending'}
          onClick={() => setTab('pending')}
        />
        <TabPill
          label="Sent"
          count={buckets.awaiting_approval.length}
          active={tab === 'awaiting_approval'}
          onClick={() => setTab('awaiting_approval')}
        />
        <TabPill
          label="Done"
          count={buckets.completed.length}
          active={tab === 'completed'}
          onClick={() => setTab('completed')}
        />
      </div>
      {list.length === 0 ? (
        <p className="mt-6 text-center text-xs text-ink-500">
          Nothing here.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map(({ task, assignment }) => (
            <li key={assignment.id}>
              <StaffTaskCard task={task} assignment={assignment} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

const StaffTaskCard = ({
  task,
  assignment,
}: {
  task: Task;
  assignment: TaskAssignment;
}) => {
  const dispatch = useAppDispatch();
  const [completing, setCompleting] = useState(false);
  const [reopening, setReopening] = useState(false);

  const doReopen = async () => {
    setReopening(true);
    try {
      const updated = await toast.promise(
        reopenAssignment(assignment.id, task.id),
        {
          loading: 'Reopening task…',
          success: 'Task reopened',
          successDescription: 'Give it another shot.',
          error: 'Could not reopen',
        },
      );
      dispatch(upsertTask(updated));
    } catch {
      /* toast surfaces the error */
    } finally {
      setReopening(false);
    }
  };

  return (
    <article className="rounded-2xl border border-brand-blue-line bg-white p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink-900">
            {task.title}
          </h3>
          <p className="mt-0.5 text-[11px] text-ink-500">
            From {task.assignedByName || 'Boss'} · {relative(task.createdAt)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONE[assignment.status]}`}
        >
          {STATUS_TEXT[assignment.status]}
        </span>
      </header>

      {task.description && (
        <p className="mt-2 whitespace-pre-wrap text-xs text-ink-700">
          {task.description}
        </p>
      )}

      {task.briefAttachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {task.briefAttachments.map((f) => (
            <AttachmentChip key={f.id} file={f} />
          ))}
        </div>
      )}

      {assignment.status === 'rejected' && assignment.bossResponse && (
        <p className="mt-2 rounded bg-brand-red-muted/30 px-2 py-1.5 text-[11px] text-brand-red-dark">
          <span className="font-semibold">Boss note:</span> {assignment.bossResponse}
        </p>
      )}

      {assignment.staffNote && assignment.status !== 'pending' && (
        <p className="mt-2 rounded bg-brand-blue-tint px-2 py-1.5 text-[11px] italic text-ink-700">
          You wrote: "{assignment.staffNote}"
        </p>
      )}

      {assignment.proofAttachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {assignment.proofAttachments.map((f) => (
            <AttachmentChip key={f.id} file={f} />
          ))}
        </div>
      )}

      {assignment.status === 'pending' || assignment.status === 'rejected' ? (
        completing ? (
          <CompleteTaskForm
            assignment={assignment}
            onDone={() => setCompleting(false)}
            onCancel={() => setCompleting(false)}
          />
        ) : (
          <div className="mt-3 flex justify-end gap-2">
            {assignment.status === 'rejected' && (
              <button
                type="button"
                onClick={doReopen}
                disabled={reopening}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue-line px-3 py-1 text-[11px] font-semibold text-ink-700 hover:bg-brand-blue-tint disabled:opacity-50"
              >
                {reopening ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Undo2 size={11} />
                )}
                Start over
              </button>
            )}
            <button
              type="button"
              onClick={() => setCompleting(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-3 py-1 text-[11px] font-semibold text-white hover:bg-brand-blue-hover"
            >
              <CheckCircle2 size={11} /> Mark complete
            </button>
          </div>
        )
      ) : assignment.status === 'awaiting_approval' ? (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-500">
          <Clock size={11} /> Waiting for boss to approve.
        </p>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700">
          <CheckCircle2 size={11} /> Approved by boss.
        </p>
      )}
    </article>
  );
};

// ── Small pieces ──────────────────────────────────────────────────

const TabPill = ({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
      active
        ? 'bg-white text-brand-blue-dark shadow-sm'
        : 'text-ink-600 hover:text-ink-900'
    }`}
  >
    {label}
    {count > 0 && (
      <span
        className={`ml-1.5 inline-flex min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${
          active ? 'bg-brand-blue text-white' : 'bg-white/60 text-ink-600'
        }`}
      >
        {count}
      </span>
    )}
  </button>
);
