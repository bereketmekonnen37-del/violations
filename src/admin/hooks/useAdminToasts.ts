/**
 * useAdminToasts
 *
 * Push transient toast notifications. The reducer keeps the stack trimmed
 * to a manageable size and auto-dismiss is handled here for convenience.
 */

import { useCallback, useEffect } from 'react';
import { ADMIN_TOAST_DEFAULT_DURATION_MS } from '../utils/constants';
import { generateId } from '../utils/id';
import type { AdminToast } from '../types/admin.types';
import type { AdminAction } from '../store/actions';
import { useAdminDispatch, useAdminSelector } from '../store/context';
import { selectToasts } from '../store/selectors';

export function useAdminToasts() {
  const dispatch = useAdminDispatch();
  const toasts = useAdminSelector(selectToasts);

  const push = useCallback(
    (partial: Partial<AdminToast> & { title: string }) => {
      const toast: AdminToast = {
        id: partial.id ?? generateId('toast', 10),
        createdAt: partial.createdAt ?? new Date().toISOString(),
        kind: partial.kind ?? 'info',
        title: partial.title,
        message: partial.message,
        autoDismissMs: partial.autoDismissMs ?? ADMIN_TOAST_DEFAULT_DURATION_MS,
      };
      dispatch({ type: 'toast/push', toast } as AdminAction);
      return toast;
    },
    [dispatch],
  );

  const dismiss = useCallback(
    (id: string) => {
      dispatch({ type: 'toast/dismiss', id } as AdminAction);
    },
    [dispatch],
  );

  useEffect(() => {
    const timers = toasts
      .filter((toast) => toast.autoDismissMs && toast.autoDismissMs > 0)
      .map((toast) =>
        window.setTimeout(() => dismiss(toast.id), toast.autoDismissMs ?? 4000),
      );
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [toasts, dismiss]);

  return { toasts, push, dismiss };
}
