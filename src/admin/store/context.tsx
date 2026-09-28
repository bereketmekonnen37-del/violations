/**
 * React glue for the admin store.
 *
 * Only the admin subtree consumes this context. The main application store
 * remains completely untouched.
 */

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AdminAction } from './actions';
import { createAdminStore } from './adminStore';
import type { AdminState } from './reducers';

type StoreInstance = ReturnType<typeof createAdminStore>;

const AdminStoreContext = createContext<StoreInstance | undefined>(undefined);

interface ProviderProps {
  children: ReactNode;
  store?: StoreInstance;
}

export function AdminStoreProvider({ children, store }: ProviderProps) {
  const instance = useMemo(() => store ?? createAdminStore(), [store]);
  return (
    <AdminStoreContext.Provider value={instance}>
      {children}
    </AdminStoreContext.Provider>
  );
}

export function useAdminStoreInstance(): StoreInstance {
  const store = useContext(AdminStoreContext);
  if (!store) throw new Error('AdminStoreProvider is missing from the tree.');
  return store;
}

export function useAdminSelector<T>(selector: (state: AdminState) => T): T {
  const store = useAdminStoreInstance();
  const [value, setValue] = useState<T>(() => selector(store.getState()));
  useEffect(() => {
    return store.subscribe((state) => {
      const next = selector(state);
      setValue((prev) => (Object.is(prev, next) ? prev : next));
    });
  }, [store, selector]);
  return value;
}

export function useAdminDispatch(): (action: AdminAction) => void {
  const store = useAdminStoreInstance();
  return store.dispatch;
}
