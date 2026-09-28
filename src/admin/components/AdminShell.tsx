/**
 * AdminShell
 *
 * Combines the sidebar, topbar, and content area into a single layout
 * component. Pages compose the shell rather than mounting a global route.
 */

import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Toaster } from './Toaster';

interface AdminShellProps {
  title: string;
  subtitle?: ReactNode;
  activeKey?: string;
  children: ReactNode;
  onSearch?: (value: string) => void;
  searchValue?: string;
  actions?: ReactNode;
}

export function AdminShell({
  title,
  subtitle,
  activeKey,
  children,
  onSearch,
  searchValue,
  actions,
}: AdminShellProps) {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#0F1116',
        color: '#EFF1F5',
        fontFamily:
          "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
      }}
    >
      <Sidebar activeKey={activeKey} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Topbar
          title={title}
          subtitle={subtitle}
          onSearch={onSearch}
          searchValue={searchValue}
          actions={actions}
        />
        <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
