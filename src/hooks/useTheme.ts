import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../app/store';
import { setTheme, toggleTheme } from '../features/theme/themeSlice';
import type { Theme } from '../types';

export const useTheme = () => {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((s) => s.theme.mode);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    window.localStorage.setItem('fw_theme', mode);
  }, [mode]);

  return {
    mode,
    toggle: () => dispatch(toggleTheme()),
    set: (t: Theme) => dispatch(setTheme(t)),
  };
};
