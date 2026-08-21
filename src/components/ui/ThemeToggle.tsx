import { Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  className?: string;
}

export const ThemeToggle = ({ className = '' }: Props) => {
  const { toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${className}`}
      style={{
        background: '#ffffff',
        color: 'var(--color-brand-blue)',
        border: '1px solid var(--color-brand-blue-line)',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = 'var(--color-brand-blue-soft)')
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
    >
      <Moon size={16} />
    </button>
  );
};
