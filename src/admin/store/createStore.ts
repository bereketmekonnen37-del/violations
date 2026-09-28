/**
 * Tiny reducer store.
 *
 * The admin dashboard uses this instead of Redux so that it does not have
 * to reach into the main application store. Kept intentionally small: state
 * + dispatch + subscribe, in that order.
 */

export type AdminReducer<S, A> = (state: S, action: A) => S;

export interface AdminStore<S, A> {
  getState: () => S;
  dispatch: (action: A) => void;
  subscribe: (listener: (state: S) => void) => () => void;
  replaceState: (state: S) => void;
}

export function createStore<S, A>(
  reducer: AdminReducer<S, A>,
  initial: S,
): AdminStore<S, A> {
  let state = initial;
  const listeners = new Set<(state: S) => void>();
  return {
    getState: () => state,
    dispatch: (action: A) => {
      const next = reducer(state, action);
      if (next !== state) {
        state = next;
        for (const listener of listeners) listener(state);
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    replaceState: (next: S) => {
      state = next;
      for (const listener of listeners) listener(state);
    },
  };
}

export function combineReducers<S extends object, A>(
  reducers: { [K in keyof S]: AdminReducer<S[K], A> },
): AdminReducer<S, A> {
  return (state, action) => {
    let changed = false;
    const next = {} as S;
    for (const key of Object.keys(reducers) as (keyof S)[]) {
      const previous = state[key];
      const updated = reducers[key](previous, action);
      next[key] = updated;
      if (updated !== previous) changed = true;
    }
    return changed ? next : state;
  };
}
