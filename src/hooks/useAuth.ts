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

  const login = async ({ email, password }: Credentials) => {
    const found = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    );
    if (!found) {
      throw new Error('Invalid email or password');
    }
    const { password: _pw, ...safe } = found;
    void _pw;
    dispatch(loginSuccess(safe));
    return safe;
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
