import { useMemo } from 'react';
import { Bell } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/store';
import { openDrawer } from './tasksSlice';

const isNewer = (a: string | null, b: string | null): boolean => {
  if (!a) return true;
  if (!b) return false;
  return new Date(a).getTime() > new Date(b).getTime();
};

export const TaskBell = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const tasks = useAppSelector((s) => s.tasks.tasks);

  const isBoss = user?.role === 'boss';
  const userId = user?.id ?? '';

  const unseen = useMemo(() => {
    if (!user) return 0;
    if (isBoss) {
      // A task is "unseen" for the boss when any of its assignments is
      // awaiting_approval and was submitted after the boss's last visit.
      // seen_by_boss_at lives on the task row.
      let count = 0;
      for (const t of tasks) {
        const anyAwaiting = t.assignments.some(
          (a) =>
            a.status === 'awaiting_approval' &&
            isNewer(a.submittedAt ?? a.createdAt, t.seenByBossAt),
        );
        if (anyAwaiting) count += 1;
      }
      return count;
    }
    // Staff: count assignments that are pending / rejected AND we haven't
    // opened the drawer since the task was assigned (or last rejected).
    let count = 0;
    for (const t of tasks) {
      const mine = t.assignments.find((a) => a.staffId === userId);
      if (!mine) continue;
      if (mine.status !== 'pending' && mine.status !== 'rejected') continue;
      if (isNewer(mine.createdAt, mine.seenByStaffAt)) count += 1;
    }
    return count;
  }, [isBoss, userId, tasks, user]);

  if (!user) return null;

  return (
    <button
      type="button"
      onClick={() => dispatch(openDrawer())}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition"
      style={{
        background: '#ffffff',
        borderColor: 'var(--color-brand-blue-line)',
        color: 'var(--color-brand-blue-dark)',
      }}
      aria-label={
        isBoss
          ? `Tasks — ${unseen} awaiting approval`
          : `Tasks — ${unseen} new`
      }
    >
      <Bell size={16} />
      {unseen > 0 && (
        <span
          className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
          style={{
            background: '#000000',
            color: '#ffffff',
            border: '2px solid #ffffff',
            height: 18,
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.35)',
          }}
        >
          {unseen > 99 ? '99+' : unseen}
        </span>
      )}
    </button>
  );
};
