/**
 * useAdminSession
 *
 * Wraps the session service and keeps the store informed. Also provides
 * helpers for login/logout that consumers can call directly.
 */

import { useCallback } from 'react';
import {
  login as loginRequest,
  logout as logoutRequest,
} from '../services/adminSession.service';
import type { AdminLoginCredentials } from '../services/adminSession.service';
import type { AdminAction } from '../store/actions';
import { useAdminDispatch, useAdminSelector } from '../store/context';
import { selectSession } from '../store/selectors';

export function useAdminSession() {
  const dispatch = useAdminDispatch();
  const session = useAdminSelector(selectSession);

  const performLogin = useCallback(
    async (credentials: AdminLoginCredentials) => {
      const result = await loginRequest(credentials);
      if (result.status === 'failure') {
        return { ok: false as const, error: result.error.message };
      }
      const action: AdminAction = { type: 'session/set', session: result.data };
      dispatch(action);
      return { ok: true as const, session: result.data };
    },
    [dispatch],
  );

  const performLogout = useCallback(async () => {
    await logoutRequest();
    dispatch({ type: 'session/clear' } as AdminAction);
  }, [dispatch]);

  return { session, login: performLogin, logout: performLogout };
}
