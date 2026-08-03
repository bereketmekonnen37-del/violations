import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../app/store';
import { setTheme, toggleTheme } from '../features/theme/themeSlice';
import type { Theme } from '../types';

export const useTheme = () => {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((s) => s.theme.mode);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    window.localStorage.setItem('fw_theme', 'light');
  }, [mode]);

  return {
    mode: 'light' as const,
    toggle: () => dispatch(toggleTheme()),
    set: (t: Theme) => dispatch(setTheme(t)),
  };
};
