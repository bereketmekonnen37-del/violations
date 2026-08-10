import { NavLink, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronsLeft,
  ChevronsRight,
  FileStack,
  LayoutDashboard,
  LogOut,
  Moon,
  Route,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  Upload,
  UserCog,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useUserScope } from '../../hooks/useUserScope';
import { Logo } from '../ui/Logo';

interface Item {
  to: string;
  label: string;
  icon: LucideIcon;
}

const LEGACY_STAFF_ITEMS: Item[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload', label: 'Upload Data', icon: Upload },
  { to: '/unfiltered', label: 'Unfiltered Speed', icon: Sparkles },
  { to: '/unfiltered-nights', label: 'Unfiltered Nights', icon: Moon },
  { to: '/unfiltered-continuous', label: 'Unfiltered Continuous', icon: Route },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const BOSS_ITEMS: Item[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/violations', label: 'Filtered Violations', icon: FileStack },
  { to: '/drivers-data', label: 'Drivers Data', icon: Users },
  { to: '/master-fleet', label: 'Master Fleet', icon: Trophy },
  { to: '/rules', label: 'Rules', icon: ShieldCheck },
  { to: '/user-management', label: 'User Management', icon: UserCog },
  { to: '/unfiltered', label: 'Unfiltered Speed', icon: Sparkles },
  { to: '/unfiltered-nights', label: 'Unfiltered Nights', icon: Moon },
  { to: '/unfiltered-continuous', label: 'Unfiltered Continuous', icon: Route },
  { to: '/settings', label: 'Settings', icon: Settings },
];

// Boss-created staff: same as boss, minus Rules and User Management.
const TRANSPORTER_STAFF_ITEMS: Item[] = BOSS_ITEMS.filter(
  (i) => i.to !== '/rules' && i.to !== '/user-management',
);

export const NavRail = () => {
  const { isBoss, isTransporterStaff } = useUserScope();
  const [collapsed, setCollapsed] = useState(false);
  const items = isBoss
    ? BOSS_ITEMS
    : isTransporterStaff
      ? TRANSPORTER_STAFF_ITEMS
      : LEGACY_STAFF_ITEMS;
  const navigate = useNavigate();
  const { logout } = useAuth();
  const onSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      style={{
        background: 'var(--color-bg-card)',
        borderRight: '1px solid var(--color-brand-navy-line)',
      }}
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col lg:flex transition-all duration-300',
        collapsed ? 'w-[80px]' : 'w-[280px]',
      )}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        style={{ borderBottom: '1px solid var(--color-brand-navy-line)' }}
        className="flex h-16 shrink-0 items-center justify-between px-4"
      >
        {collapsed ? <Logo withText={false} /> : <Logo />}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label="Toggle navigation"
          style={{ color: 'var(--color-text-muted)' }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition hover:bg-black/5"
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      {/* ── Nav links ───────────────────────────────────────── */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                collapsed && 'justify-center px-2',
                isActive ? 'nav-link-active' : 'nav-link-idle',
              )
            }
          >
            <item.icon size={18} className="shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ── Sign-out footer ─────────────────────────────────── */}
      <div
        className="shrink-0 p-3"
        style={{ borderTop: '1px solid var(--color-brand-navy-line)' }}
      >
        <button
          type="button"
          onClick={onSignOut}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
            collapsed && 'justify-center px-2',
          )}
          style={{
            background: 'var(--color-brand-red)',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(220, 53, 69, 0.25)',
          }}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      {/* Scoped active/idle nav-link styles */}
      <style>{`
        .nav-link-idle {
          color: var(--color-text-primary);
          background: transparent;
        }
        .nav-link-idle:hover {
          background: rgba(11, 18, 32, 0.05);
        }
        .nav-link-active {
          color: #ffffff;
          background: var(--color-brand-red);
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.25);
        }
      `}</style>
    </aside>
  );
};
