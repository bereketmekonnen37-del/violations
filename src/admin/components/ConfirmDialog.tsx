/**
 * ConfirmDialog
 *
 * Used to gate destructive actions (removals, suspensions).
 */

import type { ReactNode } from 'react';
import { AdminButton } from './Button';
import { AdminModal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AdminModal
      open={open}
      onClose={onCancel}
      title={title}
      actions={
        <>
          <AdminButton variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </AdminButton>
          <AdminButton
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={busy}
          >
            {confirmLabel}
          </AdminButton>
        </>
      }
    >
      <div style={{ color: '#EFF1F5', lineHeight: 1.5 }}>{message}</div>
    </AdminModal>
  );
}
