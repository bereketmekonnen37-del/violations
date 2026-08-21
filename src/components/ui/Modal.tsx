import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned slot in the header (e.g. search input, download button). */
  toolbar?: ReactNode;
  /** Fixed dialog width — default `80vw`, capped at 1400px. */
  widthClassName?: string;
  children: ReactNode;
}

export const Modal = ({
  open,
  onClose,
  title,
  subtitle,
  toolbar,
  widthClassName = 'w-[80vw] max-w-[1400px]',
  children,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Freeze background scroll while the modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: 'rgba(15, 20, 40, 0.45)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className={
          'relative flex max-h-[90vh] flex-col overflow-hidden rounded-2xl shadow-elev ' +
          widthClassName
        }
        style={{
          background: '#ffffff',
          border: '1px solid var(--color-brand-blue-line)',
        }}
      >
        <header
          className="flex items-start justify-between gap-4 px-6 py-4"
          style={{
            borderBottom: '1px solid var(--color-brand-blue-line)',
            background: 'var(--color-brand-blue-soft)',
          }}
        >
          <div className="min-w-0">
            {title && (
              <h2
                className="truncate font-display text-base font-semibold"
                style={{ color: 'var(--color-brand-blue-dark)' }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className="mt-0.5 truncate text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {toolbar}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition"
              style={{ color: 'var(--color-brand-blue)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <X size={16} />
            </button>
          </div>
        </header>
        <div
          className="flex-1 overflow-auto px-6 py-5"
          style={{ background: '#ffffff' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
