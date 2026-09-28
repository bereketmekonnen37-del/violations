import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/store';
import { supabase } from '../../lib/supabaseClient';
import {
  clear,
  setError,
  setStatus,
  setTasks,
} from './tasksSlice';
import { fetchTasks } from './tasksApi';

/**
 * Mounted once (inside <AppShell />). Loads tasks on sign-in and
 * subscribes to realtime changes on the task tables so the badge
 * and drawer stay live without polling.
 */
export const useTasksLoader = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const userId = useAppSelector((s) => s.auth.user?.id ?? null);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      dispatch(clear());
      return;
    }

    let cancelled = false;
    const load = async () => {
      dispatch(setStatus('loading'));
      try {
        const tasks = await fetchTasks();
        if (!cancelled) dispatch(setTasks(tasks));
      } catch (err) {
        if (!cancelled) {
          dispatch(setError(err instanceof Error ? err.message : String(err)));
        }
      }
    };
    void load();

    const reload = () => {
      // debounce a burst of changes (assignment insert + attachment
      // insert land back-to-back when a task is created)
      window.clearTimeout(reloadTimer);
      reloadTimer = window.setTimeout(() => {
        void load();
      }, 250);
    };
    let reloadTimer = 0;

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        reload,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_assignments' },
        reload,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_attachments' },
        reload,
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.clearTimeout(reloadTimer);
      void supabase.removeChannel(channel);
    };
  }, [dispatch, isAuthenticated, userId]);
};
