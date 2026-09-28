/**
 * Toaster
 *
 * Renders queued toasts from the admin store.
 */

import { useAdminToasts } from '../hooks/useAdminToasts';
import type { AdminToast } from '../types/admin.types';

function accentFor(toast: AdminToast): { bg: string; fg: string } {
  switch (toast.kind) {
    case 'success':
      return { bg: '#0E3B22', fg: '#8FE1A3' };
    case 'error':
      return { bg: '#3B0E23', fg: '#FF9AB4' };
    case 'warning':
      return { bg: '#3B2C0E', fg: '#FFD79A' };
    default:
      return { bg: '#1E2A55', fg: '#8FB1FF' };
  }
}

export function Toaster() {
  const { toasts, dismiss } = useAdminToasts();
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 900,
      }}
    >
      {toasts.map((toast) => {
        const palette = accentFor(toast);
        return (
          <div
            key={toast.id}
            role="status"
            style={{
              minWidth: 260,
              maxWidth: 360,
              padding: '10px 14px',
              borderRadius: 10,
              background: palette.bg,
              color: palette.fg,
              border: `1px solid ${palette.fg}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              cursor: 'pointer',
            }}
            onClick={() => dismiss(toast.id)}
          >
            <strong style={{ fontSize: 12 }}>{toast.title}</strong>
            {toast.message ? (
              <span style={{ fontSize: 11, opacity: 0.85 }}>{toast.message}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
