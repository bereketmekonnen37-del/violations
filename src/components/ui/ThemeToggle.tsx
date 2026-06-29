import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  className?: string;
}

export const ThemeToggle = ({ className = '' }: Props) => {
  const { mode, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-700 transition hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:bg-ink-800 ${className}`}
    >
      {mode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
};
