/**
 * RemoveUserModal
 *
 * Confirmation dialog for the user removal flow.
 */

import { AdminBadge } from './Badge';
import { ConfirmDialog } from './ConfirmDialog';
import type { AdminUser } from '../types/user.types';
import { humanReadableRole } from '../types/user.types';

interface RemoveUserModalProps {
  user: AdminUser | undefined;
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RemoveUserModal({
  user,
  open,
  busy,
  onCancel,
  onConfirm,
}: RemoveUserModalProps) {
  return (
    <ConfirmDialog
      open={open}
      title="Remove this account?"
      danger
      busy={busy}
      confirmLabel="Remove account"
      cancelLabel="Keep account"
      onCancel={onCancel}
      onConfirm={onConfirm}
      message={
        user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0 }}>
              You are about to permanently remove <strong>{user.displayName}</strong>{' '}
              (<code>{user.contact.primaryEmail}</code>).
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              <AdminBadge tone="warning">{humanReadableRole(user.role)}</AdminBadge>
              {user.transporters.length > 0 ? (
                <AdminBadge tone="info">
                  {user.transporters.length} transporter(s)
                </AdminBadge>
              ) : null}
            </div>
            <p style={{ margin: 0, color: '#9AA0AA', fontSize: 12 }}>
              This action cannot be undone. The user will lose access immediately
              and any assignments will be released.
            </p>
          </div>
        ) : (
          'Loading…'
        )
      }
    />
  );
}
