/**
 * Modal shell.
 *
 * A minimal focus-trapping modal used by confirm dialogs and forms.
 */

import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  width?: number | string;
}

export function AdminModal({
  open,
  onClose,
  title,
  children,
  actions,
  width = 480,
}: AdminModalProps) {
  useEffect(() => {
    if (!open) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width,
          maxWidth: '92vw',
          background: '#181B22',
          border: '1px solid #262A34',
          borderRadius: 12,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {title ? (
          <header
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #262A34',
              color: '#EFF1F5',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {title}
          </header>
        ) : null}
        <div style={{ padding: 18, color: '#EFF1F5', fontSize: 13 }}>{children}</div>
        {actions ? (
          <footer
            style={{
              padding: '12px 18px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              borderTop: '1px solid #262A34',
              background: '#0F1116',
            }}
          >
            {actions}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
