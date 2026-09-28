/**
 * Admin topbar.
 *
 * Search box, the current session's avatar and a logout button.
 */

import type { ReactNode } from 'react';
import { useAdminSession } from '../hooks/useAdminSession';
import { Avatar } from './Avatar';
import { AdminButton } from './Button';
import { AdminInput } from './Input';

interface TopbarProps {
  title: string;
  subtitle?: ReactNode;
  onSearch?: (value: string) => void;
  searchValue?: string;
  actions?: ReactNode;
}

export function Topbar({ title, subtitle, onSearch, searchValue, actions }: TopbarProps) {
  const { session, logout } = useAdminSession();
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 24px',
        borderBottom: '1px solid #262A34',
        background: '#0F1116',
        gap: 20,
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: 18, color: '#EFF1F5' }}>{title}</h1>
        {subtitle ? (
          <p style={{ margin: '2px 0 0', color: '#9AA0AA', fontSize: 12 }}>{subtitle}</p>
        ) : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onSearch ? (
          <div style={{ width: 280 }}>
            <AdminInput
              placeholder="Search users, tags, or transporters…"
              value={searchValue ?? ''}
              onChange={(event) => onSearch(event.target.value)}
            />
          </div>
        ) : null}
        {actions}
        {session ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={session.displayName} size={30} />
            <div style={{ fontSize: 12, color: '#EFF1F5' }}>
              <div style={{ fontWeight: 600 }}>{session.displayName}</div>
              <div style={{ color: '#7B7F8A', fontSize: 11 }}>{session.role}</div>
            </div>
            <AdminButton variant="ghost" size="sm" onClick={() => void logout()}>
              Sign out
            </AdminButton>
          </div>
        ) : null}
      </div>
    </header>
  );
}
