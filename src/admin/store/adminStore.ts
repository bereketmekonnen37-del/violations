/**
 * Admin store bootstrap.
 *
 * The store is created once and consumed via the AdminStoreContext / the
 * useAdminStore hook so the tree only needs a single provider.
 */

import { combineReducers, createStore } from './createStore';
import {
  auditReducer,
  initialAudit,
  initialUsers,
  sessionReducer,
  statsReducer,
  toastReducer,
  usersReducer,
} from './reducers';
import type { AdminState } from './reducers';
import type { AdminAction } from './actions';

const rootReducer = combineReducers<AdminState, AdminAction>({
  session: sessionReducer,
  users: usersReducer,
  stats: statsReducer,
  audit: auditReducer,
  toast: toastReducer,
});

export function initialAdminState(): AdminState {
  return {
    session: { session: undefined },
    users: initialUsers(),
    stats: { loading: false },
    audit: initialAudit(),
    toast: { items: [] },
  };
}

export function createAdminStore() {
  return createStore(rootReducer, initialAdminState());
}
