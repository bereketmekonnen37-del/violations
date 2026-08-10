import { useAppDispatch, useAppSelector } from '../app/store';
import { loginSuccess, logout, updateProfile } from '../features/auth/authSlice';
import type { User } from '../types';

interface Credentials {
  email: string;
  password: string;
}

const DEMO_USERS: Array<User & { password: string }> = [
  {
    id: 'u-boss-1',
    email: 'boss@demo.com',
    password: 'boss123',
    name: 'Daniel Carter',
    role: 'boss',
  },
  {
    id: 'u-staff-1',
    email: 'staff@demo.com',
    password: 'staff123',
    name: 'Maya Johnson',
    role: 'staff',
  },
];

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);
  const managed = useAppSelector((s) => s.staffUsers.users);

  const login = async ({ email, password }: Credentials) => {
    const normalized = email.trim().toLowerCase();

    const demo = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === normalized && u.password === password,
    );
    if (demo) {
      const { password: _pw, ...safe } = demo;
      void _pw;
      dispatch(loginSuccess(safe));
      return safe;
    }

    const managedMatch = managed.find(
      (u) => u.email.toLowerCase() === normalized && u.password === password,
    );
    if (managedMatch) {
      const safe: User = {
        id: managedMatch.id,
        email: managedMatch.email,
        name: managedMatch.name,
        role: 'staff',
        assignedTransporters: managedMatch.assignedTransporters,
      };
      dispatch(loginSuccess(safe));
      return safe;
    }

    throw new Error('Invalid email or password');
  };

  return {
    user,
    isAuthenticated,
    login,
    logout: () => dispatch(logout()),
    updateProfile: (patch: Partial<Pick<User, 'name' | 'email' | 'avatar'>>) =>
      dispatch(updateProfile(patch)),
  };
};
