/**
 * Admin sidebar navigation.
 *
 * Uses plain anchors instead of react-router so the admin surface remains
 * fully self-contained.
 */

import { ADMIN_PRODUCT_NAME, ADMIN_ROUTES } from '../utils/constants';
import type { AdminNavItem } from '../types/admin.types';

const NAV_ITEMS: AdminNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: ADMIN_ROUTES.dashboard, icon: 'dashboard' },
  { key: 'users', label: 'All users', href: ADMIN_ROUTES.users, icon: 'users' },
  { key: 'staff', label: 'Staff', href: ADMIN_ROUTES.staff, icon: 'staff' },
  { key: 'bosses', label: 'Bosses', href: ADMIN_ROUTES.bosses, icon: 'bosses' },
  { key: 'admins', label: 'Administrators', href: ADMIN_ROUTES.admins, icon: 'admins' },
  { key: 'audit', label: 'Audit log', href: ADMIN_ROUTES.audit, icon: 'audit' },
  { key: 'analytics', label: 'Analytics', href: ADMIN_ROUTES.analytics, icon: 'analytics' },
  { key: 'system-health', label: 'System health', href: ADMIN_ROUTES.systemHealth, icon: 'health' },
  { key: 'settings', label: 'Settings', href: ADMIN_ROUTES.settings, icon: 'settings' },
];

interface SidebarProps {
  activeKey?: string;
}

export function Sidebar({ activeKey }: SidebarProps) {
  return (
    <aside
      style={{
        width: 240,
        background: '#0F1116',
        borderRight: '1px solid #262A34',
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#EFF1F5',
          padding: '4px 8px 12px',
          borderBottom: '1px solid #262A34',
        }}
      >
        {ADMIN_PRODUCT_NAME}
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV_ITEMS.map((item) => {
          const active = item.key === activeKey;
          return (
            <a
              key={item.key}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 10px',
                borderRadius: 8,
                fontSize: 13,
                color: active ? '#EFF1F5' : '#9AA0AA',
                background: active ? '#181B22' : 'transparent',
                textDecoration: 'none',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: active ? '#4B4EFF' : '#262A34',
                }}
              />
              {item.label}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
