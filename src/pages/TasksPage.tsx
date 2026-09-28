import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Undo2,
  Users as UsersIcon,
  X,
  XCircle,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import { useUserScope } from '../hooks/useUserScope';
import type { Task, TaskAssignment, TaskStatus } from '../types';
import {
  approveAssignment,
  deleteTask,
  fetchTasks,
  rejectAssignment,
  reopenAssignment,
} from '../features/tasks/tasksApi';
import { AttachmentChip } from '../features/tasks/AttachmentChip';
import { CompleteTaskForm } from '../features/tasks/CompleteTaskForm';
import { CreateTaskModal } from '../features/tasks/CreateTaskModal';
import {
  removeTask,
  setError,
  setTasks,
  upsertTask,
} from '../features/tasks/tasksSlice';
import { toast } from '../features/toast/toastStore';
import {
  setStaffUsers,
  setStaffUsersError,
  setStaffUsersStatus,
} from '../features/staffUsers/staffUsersSlice';
import { fetchStaffUsers } from '../features/staffUsers/staffUsersApi';

type TabKey = 'all' | 'pending' | 'awaiting_approval' | 'completed' | 'rejected';

interface AssignmentRow {
  task: Task;
  assignment: TaskAssignment;
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: 'Pending',
  awaiting_approval: 'Awaiting approval',
  completed: 'Approved',
  rejected: 'Rejected',
};

const STATUS_STYLE: Record<TaskStatus, string> = {
  pending: 'bg-brand-blue-soft text-brand-blue-dark ring-1 ring-brand-blue-line',
  awaiting_approval:
    'bg-brand-accent-soft text-brand-accent-dark ring-1 ring-brand-accent-line',
  completed: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  rejected: 'bg-brand-red-muted/60 text-brand-red-dark ring-1 ring-brand-red-muted',
};

const relative = (iso: string | null | undefined): string => {
  if (!iso) return '—';
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

export const TasksPage = () => {
  const dispatch = useAppDispatch();
  const { isBoss } = useUserScope();
  const user = useAppSelector((s) => s.auth.user);
  const tasks = useAppSelector((s) => s.tasks.tasks);
  const status = useAppSelector((s) => s.tasks.status);
  const error = useAppSelector((s) => s.tasks.error);
  const staff = useAppSelector((s) => s.staffUsers.users);
  const staffStatus = useAppSelector((s) => s.staffUsers.status);

  const [tab, setTab] = useState<TabKey>('all');
  const [selectedStaffId, setSelectedStaffId] = useState<string | 'all'>('all');
  const [staffQuery, setStaffQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const doRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const fresh = await toast.promise(fetchTasks(), {
        loading: 'Refreshing tasks…',
        success: (list) =>
          `Refreshed — ${list.length} ${list.length === 1 ? 'task' : 'tasks'}`,
        error: 'Could not refresh tasks',
      });
      dispatch(setTasks(fresh));
    } catch (e) {
      dispatch(setError(e instanceof Error ? e.message : String(e)));
    } finally {
      setRefreshing(false);
    }
  };

  // Boss needs the staff list; load once when this page mounts.
  useEffect(() => {
    if (!isBoss) return;
    if (staffStatus !== 'idle') return;
    dispatch(setStaffUsersStatus('loading'));
    fetchStaffUsers()
      .then((list) => dispatch(setStaffUsers(list)))
      .catch((e) =>
        dispatch(
          setStaffUsersError(e instanceof Error ? e.message : String(e)),
        ),
      );
  }, [dispatch, isBoss, staffStatus]);

  const userId = user?.id ?? '';

  // Flatten tasks → assignments so the table shows one row per staff.
  const allRows = useMemo<AssignmentRow[]>(() => {
    const rows: AssignmentRow[] = [];
    for (const t of tasks) {
      for (const a of t.assignments) {
        if (!isBoss && a.staffId !== userId) continue;
        rows.push({ task: t, assignment: a });
      }
    }
    // Newest first — either submission time or creation time.
    rows.sort((a, b) => {
      const at = new Date(
        a.assignment.submittedAt ??
          a.assignment.createdAt ??
          a.task.createdAt,
      ).getTime();
      const bt = new Date(
        b.assignment.submittedAt ??
          b.assignment.createdAt ??
          b.task.createdAt,
      ).getTime();
      return bt - at;
    });
    return rows;
  }, [tasks, isBoss, userId]);

  // Boss filter: rows scoped to a single staff.
  const staffFilteredRows = useMemo(() => {
    if (!isBoss || selectedStaffId === 'all') return allRows;
    return allRows.filter((r) => r.assignment.staffId === selectedStaffId);
  }, [allRows, isBoss, selectedStaffId]);

  const counts = useMemo(() => {
    const c = {
      all: staffFilteredRows.length,
      pending: 0,
      awaiting_approval: 0,
      completed: 0,
      rejected: 0,
    };
    for (const r of staffFilteredRows) {
      c[r.assignment.status] += 1;
    }
    return c;
  }, [staffFilteredRows]);

  const visibleRows = useMemo(() => {
    if (tab === 'all') return staffFilteredRows;
    return staffFilteredRows.filter((r) => r.assignment.status === tab);
  }, [staffFilteredRows, tab]);

  // Per-staff counts for the left rail (independent of the active tab).
  const staffCounts = useMemo(() => {
    const m = new Map<
      string,
      { total: number; awaiting: number; pending: number }
    >();
    for (const t of tasks) {
      for (const a of t.assignments) {
        const cur = m.get(a.staffId) ?? {
          total: 0,
          awaiting: 0,
          pending: 0,
        };
        cur.total += 1;
        if (a.status === 'awaiting_approval') cur.awaiting += 1;
        if (a.status === 'pending' || a.status === 'rejected') cur.pending += 1;
        m.set(a.staffId, cur);
      }
    }
    return m;
  }, [tasks]);

  const filteredStaff = useMemo(() => {
    const q = staffQuery.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q),
    );
  }, [staff, staffQuery]);

  const totalAwaitingForBoss = useMemo(() => {
    return allRows.filter((r) => r.assignment.status === 'awaiting_approval')
      .length;
  }, [allRows]);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        eyebrow={isBoss ? 'Boss workspace' : 'My workspace'}
        title="Task Management"
        subtitle={
          isBoss
            ? 'Assign work to staff, review submissions, and approve completed tasks. Updates land in real time.'
            : 'See everything the boss has assigned to you. Submit work and track approval status live.'
        }
        actions={
          isBoss ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-blue-hover"
              style={{ boxShadow: '0 8px 20px rgba(62, 85, 165, 0.28)' }}
            >
              <Plus size={14} /> Create Task
            </button>
          ) : undefined
        }
      />

      {isBoss && totalAwaitingForBoss > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-brand-red-muted bg-brand-red-muted/25 px-4 py-3">
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: 'var(--color-brand-red)' }}
          >
            <Clock size={14} />
          </span>
          <div className="text-sm">
            <p className="font-semibold text-brand-red-dark">
              {totalAwaitingForBoss} submission
              {totalAwaitingForBoss === 1 ? '' : 's'} awaiting your approval
            </p>
            <p className="mt-0.5 text-xs text-brand-red-dark/80">
              Open the Awaiting tab to review the proof and either approve or
              reject.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTab('awaiting_approval')}
            className="ml-auto rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-red-dark ring-1 ring-brand-red-muted hover:bg-brand-red-muted/40"
          >
            Review now →
          </button>
        </div>
      )}

      <div
        className={`grid gap-5 ${
          isBoss ? 'lg:grid-cols-[280px_minmax(0,1fr)]' : 'grid-cols-1'
        }`}
      >
        {/* ── Left: staff picker (boss only) ─────────────────── */}
        {isBoss && (
          <aside className="surface flex flex-col gap-3 rounded-2xl p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                Staff
              </p>
              <h3 className="mt-0.5 text-sm font-bold text-ink-900">
                Pick a person
              </h3>
              <p className="mt-0.5 text-[11px] text-ink-500">
                See the tasks between you and them.
              </p>
            </div>

            <div className="relative">
              <Search
                size={13}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                type="text"
                value={staffQuery}
                onChange={(e) => setStaffQuery(e.target.value)}
                placeholder="Search staff…"
                className="w-full rounded-xl border border-brand-blue-line bg-white py-2 pl-8 pr-3 text-xs text-ink-800 outline-none focus:border-brand-blue"
              />
            </div>

            <ul className="flex max-h-[65vh] flex-col gap-1 overflow-y-auto pr-1">
              <li>
                <button
                  type="button"
                  onClick={() => setSelectedStaffId('all')}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition ${
                    selectedStaffId === 'all'
                      ? 'bg-brand-blue text-white shadow-sm'
                      : 'bg-white text-ink-800 ring-1 ring-brand-blue-line hover:bg-brand-blue-tint'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        selectedStaffId === 'all'
                          ? 'bg-white/25'
                          : 'bg-brand-blue-soft text-brand-blue-dark'
                      }`}
                    >
                      <UsersIcon size={13} />
                    </span>
                    <span className="font-semibold">All staff</span>
                  </span>
                  <span
                    className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                      selectedStaffId === 'all'
                        ? 'bg-white/25 text-white'
                        : 'bg-brand-blue-soft text-brand-blue-dark'
                    }`}
                  >
                    {allRows.length}
                  </span>
                </button>
              </li>
              {staffStatus === 'loading' && staff.length === 0 && (
                <li className="px-2 py-3 text-center text-[11px] text-ink-500">
                  <Loader2 size={12} className="mr-1 inline animate-spin" />
                  Loading staff…
                </li>
              )}
              {filteredStaff.map((s) => {
                const active = selectedStaffId === s.id;
                const c = staffCounts.get(s.id) ?? {
                  total: 0,
                  awaiting: 0,
                  pending: 0,
                };
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedStaffId(s.id)}
                      className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition ${
                        active
                          ? 'bg-brand-blue text-white shadow-sm'
                          : 'bg-white text-ink-800 ring-1 ring-brand-blue-line hover:bg-brand-blue-tint'
                      }`}
                    >
                      <Avatar name={s.name || s.email} size={28} />
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
                      <div className="flex shrink-0 flex-col items-end gap-0.5">
                        {c.awaiting > 0 && (
                          <span
                            className="inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                            style={{ background: 'var(--color-brand-red)' }}
                            title="Awaiting your approval"
                          >
                            {c.awaiting}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold ${
                            active ? 'text-white/80' : 'text-ink-500'
                          }`}
                        >
                          {c.total}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
              {staffStatus === 'loaded' && filteredStaff.length === 0 && (
                <li className="px-2 py-3 text-center text-[11px] italic text-ink-500">
                  {staff.length === 0
                    ? 'No staff yet. Create one in User Management.'
                    : 'No staff matches your search.'}
                </li>
              )}
            </ul>
          </aside>
        )}

        {/* ── Right: tabs + table ─────────────────────────────── */}
        <section className="min-w-0">
          <div className="surface flex flex-col rounded-2xl">
            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-brand-blue-line p-3">
              <TabButton
                label="All"
                count={counts.all}
                active={tab === 'all'}
                onClick={() => setTab('all')}
                tone="neutral"
              />
              <TabButton
                label="Pending"
                count={counts.pending}
                active={tab === 'pending'}
                onClick={() => setTab('pending')}
                tone="blue"
              />
              <TabButton
                label="Awaiting approval"
                count={counts.awaiting_approval}
                active={tab === 'awaiting_approval'}
                onClick={() => setTab('awaiting_approval')}
                tone="red"
              />
              <TabButton
                label="Approved"
                count={counts.completed}
                active={tab === 'completed'}
                onClick={() => setTab('completed')}
                tone="green"
              />
              <TabButton
                label="Rejected"
                count={counts.rejected}
                active={tab === 'rejected'}
                onClick={() => setTab('rejected')}
                tone="red"
              />
              <button
                type="button"
                onClick={doRefresh}
                disabled={refreshing}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-brand-blue-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:border-brand-blue hover:bg-brand-blue-tint disabled:cursor-not-allowed disabled:opacity-60"
                title="Fetch the latest tasks from the server"
                aria-label="Refresh tasks"
              >
                <RefreshCw
                  size={13}
                  className={refreshing ? 'animate-spin' : ''}
                />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            {/* Table */}
            <div className="min-h-[40vh] p-2 sm:p-3">
              {status === 'loading' && tasks.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-500">
                  <Loader2 size={14} className="animate-spin" /> Loading tasks…
                </div>
              ) : error ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Couldn't load tasks"
                  description={error}
                />
              ) : visibleRows.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Nothing here yet"
                  description={
                    tab === 'all'
                      ? isBoss
                        ? 'Assign your first task with the Create Task button above.'
                        : "You don't have any tasks yet."
                      : `No tasks in the ${STATUS_LABEL[tab as TaskStatus] ?? 'this'} state.`
                  }
                />
              ) : (
                <TaskTable rows={visibleRows} isBoss={isBoss} />
              )}
            </div>
          </div>
        </section>
      </div>

      {isBoss && (
        <CreateTaskModal
          open={creating}
          onClose={() => setCreating(false)}
          initialAssigneeIds={
            selectedStaffId !== 'all' ? [selectedStaffId] : []
          }
        />
      )}
    </div>
  );

  // ─── inner components ────────────────────────────────────────────

  function TaskTable({
    rows,
    isBoss,
  }: {
    rows: AssignmentRow[];
    isBoss: boolean;
  }) {
    return (
      <div className="overflow-hidden rounded-xl border border-brand-blue-line">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead
              className="text-[10px] font-semibold uppercase tracking-wider text-brand-blue-dark"
              style={{ background: 'var(--color-brand-blue-soft)' }}
            >
              <tr>
                <th className="px-3 py-2.5">Task</th>
                {isBoss && <th className="px-3 py-2.5">Staff</th>}
                {!isBoss && <th className="px-3 py-2.5">From</th>}
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Updated</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-blue-line bg-white">
              {rows.map((r) => (
                <TaskRow key={r.assignment.id} row={r} isBoss={isBoss} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
};

/* ─────────────── row + tab pieces ─────────────── */

const TabButton = ({
  label,
  count,
  active,
  onClick,
  tone,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  tone: 'neutral' | 'blue' | 'red' | 'green';
}) => {
  const badgeStyle: Record<typeof tone, string> = {
    neutral: 'bg-ink-100 text-ink-700',
    blue: 'bg-brand-blue-soft text-brand-blue-dark',
    red: 'text-white',
    green: 'bg-emerald-100 text-emerald-800',
  };
  const badgeInline =
    tone === 'red' ? { background: 'var(--color-brand-red)' } : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
        active
          ? 'bg-brand-blue text-white shadow-sm'
          : 'bg-white text-ink-700 ring-1 ring-brand-blue-line hover:bg-brand-blue-tint'
      }`}
    >
      {label}
      {count > 0 && (
        <span
          className={`inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
            active ? 'bg-white/25 text-white' : badgeStyle[tone]
          }`}
          style={!active && tone === 'red' ? badgeInline : undefined}
        >
          {count}
        </span>
      )}
    </button>
  );
};

interface TaskRowProps {
  row: AssignmentRow;
  isBoss: boolean;
}

const TaskRow = ({ row, isBoss }: TaskRowProps) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr
        className="cursor-pointer transition hover:bg-brand-blue-tint"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="max-w-[320px] px-3 py-3">
          <div className="flex items-start gap-2">
            <span
              className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-brand-blue-dark"
              style={{ background: 'var(--color-brand-blue-soft)' }}
            >
              <ClipboardList size={12} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-ink-900">
                {row.task.title}
              </p>
              {row.task.description && (
                <p className="truncate text-[11px] text-ink-500">
                  {row.task.description}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            <Avatar
              name={
                isBoss
                  ? row.assignment.staffName || row.assignment.staffEmail
                  : row.task.assignedByName || 'Boss'
              }
              size={22}
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink-800">
                {isBoss
                  ? row.assignment.staffName ||
                    row.assignment.staffEmail ||
                    'Unknown'
                  : row.task.assignedByName || 'Boss'}
              </p>
              {isBoss && row.assignment.staffEmail && (
                <p className="truncate text-[10px] text-ink-500">
                  {row.assignment.staffEmail}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[row.assignment.status]}`}
          >
            {STATUS_LABEL[row.assignment.status]}
          </span>
        </td>
        <td className="px-3 py-3 text-[11px] text-ink-500">
          {relative(
            row.assignment.submittedAt ??
              row.assignment.completedAt ??
              row.assignment.createdAt,
          )}
        </td>
        <td className="px-3 py-3 text-right">
          <span className="text-[10px] font-semibold text-brand-blue">
            {expanded ? 'Hide' : 'View'}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={isBoss ? 5 : 5} className="bg-brand-blue-tint/60 px-3 pb-4 pt-1">
            <TaskDetail row={row} isBoss={isBoss} onClose={() => setExpanded(false)} />
          </td>
        </tr>
      )}
    </>
  );
};

const TaskDetail = ({
  row,
  isBoss,
  onClose,
}: {
  row: AssignmentRow;
  isBoss: boolean;
  onClose: () => void;
}) => {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [reopening, setReopening] = useState(false);

  const { task, assignment } = row;

  const staffLabel =
    assignment.staffName || assignment.staffEmail || 'staff';

  const doApprove = async () => {
    setBusy(true);
    try {
      const updated = await toast.promise(
        approveAssignment(assignment.id, task.id),
        {
          loading: 'Approving submission…',
          success: `Approved ${staffLabel}'s submission`,
          successDescription: `"${task.title}"`,
          error: 'Could not approve',
        },
      );
      dispatch(upsertTask(updated));
    } catch {
      /* toast surfaces the error */
    } finally {
      setBusy(false);
    }
  };

  const doReject = async () => {
    if (!rejectReason.trim()) return;
    setBusy(true);
    try {
      const updated = await toast.promise(
        rejectAssignment(assignment.id, task.id, rejectReason),
        {
          loading: 'Sending back to staff…',
          success: `Sent back to ${staffLabel}`,
          successDescription: 'They will get a notification to redo it.',
          error: 'Could not reject',
        },
      );
      dispatch(upsertTask(updated));
      setRejecting(false);
      setRejectReason('');
    } catch {
      /* toast surfaces the error */
    } finally {
      setBusy(false);
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
    <div className="rounded-2xl border border-brand-blue-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-ink-900">{task.title}</h4>
          <p className="mt-0.5 text-[11px] text-ink-500">
            Created {relative(task.createdAt)} by{' '}
            {task.assignedByName || 'Boss'} · Assigned to {task.assignments.length}{' '}
            {task.assignments.length === 1 ? 'staff' : 'staff'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {isBoss && (
            <button
              type="button"
              onClick={doDelete}
              disabled={deleting}
              className="rounded-full p-1.5 text-ink-400 hover:bg-brand-red-muted/40 hover:text-brand-red disabled:opacity-50"
              aria-label="Delete task"
            >
              {deleting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Trash2 size={13} />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-500 hover:bg-brand-blue-tint"
            aria-label="Collapse"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {task.description && (
        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-brand-blue-tint px-3 py-2 text-xs text-ink-700">
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

      {/* Assignment-specific proof + note */}
      <div className="mt-3 rounded-xl border border-brand-blue-line bg-brand-blue-tint p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Avatar
              name={assignment.staffName || assignment.staffEmail}
              size={22}
            />
            <div>
              <p className="text-xs font-semibold text-ink-900">
                {assignment.staffName ||
                  assignment.staffEmail ||
                  'Unknown staff'}
              </p>
              <p className="text-[10px] text-ink-500">
                {assignment.submittedAt
                  ? `Submitted ${relative(assignment.submittedAt)}`
                  : assignment.completedAt
                    ? `Completed ${relative(assignment.completedAt)}`
                    : `Assigned ${relative(assignment.createdAt)}`}
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[assignment.status]}`}
          >
            {STATUS_LABEL[assignment.status]}
          </span>
        </div>

        {assignment.staffNote && (
          <p className="mt-2 rounded bg-white px-2.5 py-2 text-[11px] italic text-ink-700">
            "{assignment.staffNote}"
          </p>
        )}

        {assignment.proofAttachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {assignment.proofAttachments.map((f) => (
              <AttachmentChip key={f.id} file={f} />
            ))}
          </div>
        )}

        {assignment.bossResponse && assignment.status === 'rejected' && (
          <p className="mt-2 text-[11px] text-brand-red-dark">
            <span className="font-semibold">Boss note:</span>{' '}
            {assignment.bossResponse}
          </p>
        )}

        {/* Boss action row */}
        {isBoss && assignment.status === 'awaiting_approval' && (
          <div className="mt-3">
            {rejecting ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  autoFocus
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Why is this being rejected?"
                  className="rounded-lg border border-brand-blue-line bg-white px-3 py-1.5 text-xs outline-none focus:border-brand-red"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRejecting(false);
                      setRejectReason('');
                    }}
                    className="rounded-full px-3 py-1 text-[11px] text-ink-600 hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={doReject}
                    disabled={busy || !rejectReason.trim()}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-red px-3 py-1 text-[11px] font-semibold text-white hover:bg-brand-red-hover disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <XCircle size={11} />
                    )}
                    Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejecting(true)}
                  className="rounded-full border border-brand-red-muted px-3 py-1 text-[11px] font-semibold text-brand-red hover:bg-brand-red-muted/40"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={doApprove}
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Check size={11} />
                  )}
                  Approve
                </button>
              </div>
            )}
          </div>
        )}

        {/* Staff action row */}
        {!isBoss && (
          <>
            {(assignment.status === 'pending' ||
              assignment.status === 'rejected') &&
              (completing ? (
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
                      className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue-line bg-white px-3 py-1 text-[11px] font-semibold text-ink-700 hover:bg-brand-blue-tint disabled:opacity-50"
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
              ))}
            {assignment.status === 'awaiting_approval' && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-500">
                <Clock size={11} /> Waiting for boss to approve.
              </p>
            )}
            {assignment.status === 'completed' && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-700">
                <CheckCircle2 size={11} /> Approved by boss.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
