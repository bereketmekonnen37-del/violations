/**
 * Ultra-light toast store. No dependency — a module-level pub/sub that
 * <ToastHost /> subscribes to. Use the `toast` singleton anywhere:
 *
 *   toast.success('Saved');
 *   toast.error('Something went wrong');
 *   const id = toast.loading('Uploading…');
 *   toast.dismiss(id);
 *   await toast.promise(fetch(...), {
 *     loading: 'Assigning…',
 *     success: 'Task assigned',
 *     error: (e) => `Failed: ${e.message}`,
 *   });
 */

export type ToastKind = 'loading' | 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  /** Auto-dismiss after N ms. `null` (default for `loading`) means persist. */
  duration: number | null;
  /** Millisecond epoch at which this toast was shown. */
  createdAt: number;
}

type Listener = (items: ToastItem[]) => void;

const listeners = new Set<Listener>();
let items: ToastItem[] = [];
const timers = new Map<string, number>();

const emit = () => {
  for (const l of listeners) l(items);
};

const uid = () =>
  `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const scheduleDismiss = (id: string, duration: number | null) => {
  if (duration === null || duration <= 0) return;
  const existing = timers.get(id);
  if (existing) window.clearTimeout(existing);
  const handle = window.setTimeout(() => {
    dismiss(id);
  }, duration);
  timers.set(id, handle);
};

const push = (item: Omit<ToastItem, 'id' | 'createdAt'>): string => {
  const id = uid();
  const t: ToastItem = { ...item, id, createdAt: Date.now() };
  items = [...items, t];
  scheduleDismiss(id, t.duration);
  emit();
  return id;
};

const update = (
  id: string,
  patch: Partial<Omit<ToastItem, 'id' | 'createdAt'>>,
): void => {
  const idx = items.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const merged = { ...items[idx], ...patch };
  items = items.map((t, i) => (i === idx ? merged : t));
  // Re-arm the auto-dismiss based on the patched duration.
  if (patch.duration !== undefined) {
    const timer = timers.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.delete(id);
    }
    scheduleDismiss(id, merged.duration);
  }
  emit();
};

const dismiss = (id: string): void => {
  const timer = timers.get(id);
  if (timer) {
    window.clearTimeout(timer);
    timers.delete(id);
  }
  items = items.filter((t) => t.id !== id);
  emit();
};

const clear = (): void => {
  for (const [, handle] of timers) window.clearTimeout(handle);
  timers.clear();
  items = [];
  emit();
};

const subscribe = (fn: Listener): (() => void) => {
  listeners.add(fn);
  fn(items);
  return () => {
    listeners.delete(fn);
  };
};

interface ShowInput {
  title: string;
  description?: string;
  duration?: number | null;
}

const shorten = (text: string, max = 160): string => {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
};

const resolveMessage = <T,>(
  value: string | ((v: T) => string),
  arg: T,
): string => (typeof value === 'function' ? value(arg) : value);

export interface PromiseMessages<T> {
  loading: string;
  success: string | ((value: T) => string);
  error: string | ((err: Error) => string);
  /** Optional smaller-print description shown under `success` / `error`. */
  successDescription?: string | ((value: T) => string | undefined);
  errorDescription?: string | ((err: Error) => string | undefined);
}

export const toast = {
  success(title: string | ShowInput): string {
    const p =
      typeof title === 'string' ? { title } : title;
    return push({
      kind: 'success',
      title: p.title,
      description: p.description,
      duration: p.duration ?? 3500,
    });
  },
  error(title: string | ShowInput): string {
    const p =
      typeof title === 'string' ? { title } : title;
    return push({
      kind: 'error',
      title: p.title,
      description: p.description,
      duration: p.duration ?? 5500,
    });
  },
  info(title: string | ShowInput): string {
    const p =
      typeof title === 'string' ? { title } : title;
    return push({
      kind: 'info',
      title: p.title,
      description: p.description,
      duration: p.duration ?? 3500,
    });
  },
  loading(title: string | ShowInput): string {
    const p =
      typeof title === 'string' ? { title } : title;
    return push({
      kind: 'loading',
      title: p.title,
      description: p.description,
      duration: p.duration ?? null,
    });
  },
  dismiss,
  clear,
  subscribe,
  async promise<T>(
    input: Promise<T> | (() => Promise<T>),
    messages: PromiseMessages<T>,
  ): Promise<T> {
    const id = push({
      kind: 'loading',
      title: messages.loading,
      duration: null,
    });
    const p = typeof input === 'function' ? input() : input;
    try {
      const value = await p;
      const title = resolveMessage(messages.success, value);
      const description = messages.successDescription
        ? resolveMessage(messages.successDescription, value)
        : undefined;
      update(id, {
        kind: 'success',
        title,
        description,
        duration: 3500,
      });
      return value;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      const title = resolveMessage(messages.error, e);
      const description = messages.errorDescription
        ? resolveMessage(messages.errorDescription, e)
        : shorten(e.message);
      update(id, {
        kind: 'error',
        title,
        description,
        duration: 6000,
      });
      throw err;
    }
  },
};

// Re-export so callers can subscribe directly if they want.
export const subscribeToasts = subscribe;
