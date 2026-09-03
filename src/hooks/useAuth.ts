import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../app/store';
import { loginSuccess, logout as logoutAction, updateProfile } from '../features/auth/authSlice';
import { supabase } from '../lib/supabaseClient';
import type { User, UserRole } from '../types';

interface Credentials {
  email: string;
  password: string;
}

interface ProfileRow {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  assigned_transporters: string[];
}

const toUser = (row: ProfileRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  assignedTransporters: row.assigned_transporters ?? [],
});

const fetchProfile = async (userId: string): Promise<User> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, role, assigned_transporters')
    .eq('id', userId)
    .single();
  if (error || !data) {
    throw new Error(
      'Signed in, but no profile record was found for this account. Ask a boss to check the profiles table.',
    );
  }
  return toUser(data as ProfileRow);
};

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, initializing } = useAppSelector((s) => s.auth);

  const login = async ({ email, password }: Credentials) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.user) {
      throw new Error(error?.message ?? 'Invalid email or password');
    }
    const profile = await fetchProfile(data.user.id);
    dispatch(loginSuccess(profile));
    return profile;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    dispatch(logoutAction());
  };

  return {
    user,
    isAuthenticated,
    initializing,
    login,
    logout,
    updateProfile: (patch: Partial<Pick<User, 'name' | 'email' | 'avatar'>>) =>
      dispatch(updateProfile(patch)),
  };
};

/**
 * Mounted once near the app root. Restores an existing Supabase session on
 * load (so a page refresh doesn't bounce the user to /login) and keeps Redux
 * in sync with sign-outs/token refreshes that happen outside `useAuth`
 * (e.g. another tab, or a session expiring).
 */
export const useAuthBootstrap = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const { data } = await supabase.auth.getSession();
      const authUser = data.session?.user;
      if (!authUser) {
        if (!cancelled) dispatch(logoutAction());
        return;
      }
      try {
        const profile = await fetchProfile(authUser.id);
        if (!cancelled) dispatch(loginSuccess(profile));
      } catch {
        if (!cancelled) dispatch(logoutAction());
      }
    };
    void restore();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        dispatch(logoutAction());
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        fetchProfile(session.user.id)
          .then((profile) => dispatch(loginSuccess(profile)))
          .catch(() => dispatch(logoutAction()));
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [dispatch]);
};
