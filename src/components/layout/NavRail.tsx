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
  Sparkles,
  Trophy,
  Upload,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { useAppSelector } from '../../app/store';
import { useAuth } from '../../hooks/useAuth';
import { Logo } from '../ui/Logo';

interface Item {
  to: string;
  label: string;
  icon: LucideIcon;
}

const STAFF_ITEMS: Item[] = [
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
  { to: '/unfiltered', label: 'Unfiltered Speed', icon: Sparkles },
  { to: '/unfiltered-nights', label: 'Unfiltered Nights', icon: Moon },
  { to: '/unfiltered-continuous', label: 'Unfiltered Continuous', icon: Route },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const NavRail = () => {
  const role = useAppSelector((s) => s.auth.user?.role);
  const [collapsed, setCollapsed] = useState(false);
  const items = role === 'boss' ? BOSS_ITEMS : STAFF_ITEMS;
  const navigate = useNavigate();
  const { logout } = useAuth();
  const onSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      style={{ background: '#0a0a0a' }}
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col lg:flex transition-all duration-300',
        collapsed ? 'w-[80px]' : 'w-[280px]',
      )}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        className="flex h-16 shrink-0 items-center justify-between px-4"
      >
        {collapsed ? <Logo withText={false} /> : <Logo />}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label="Toggle navigation"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition hover:bg-white/10 hover:!text-white"
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      {/* ── Nav links ───────────────────────────────────────── */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-white text-[#0a0a0a] shadow-lg'
                  : 'text-white/55 hover:bg-white/10 hover:text-white',
                collapsed && 'justify-center px-2',
              )
            }
          >
            <item.icon size={18} className="shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ── Abstract bottom panel with Sign-out ──────────────── */}
      {!collapsed && (
        <div
          className="relative shrink-0 overflow-hidden"
          style={{ minHeight: '300px' }}
        >
          {/* Masked gradient layer — fades smoothly to transparent at the top
              so there is no visible rectangle edge against the rail */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              WebkitMaskImage:
                'radial-gradient(140% 100% at 50% 115%, #000 35%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.45) 78%, transparent 100%)',
              maskImage:
                'radial-gradient(140% 100% at 50% 115%, #000 35%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.45) 78%, transparent 100%)',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
            }}
          >
            {/* Layered radial gradients — no straight direction, abstract feel */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `
                  radial-gradient(120% 80% at 18% 32%, rgba(37,99,235,0.85) 0%, transparent 50%),
                  radial-gradient(95% 70% at 88% 48%, rgba(168,85,247,0.75) 0%, transparent 55%),
                  radial-gradient(85% 65% at 28% 82%, rgba(22,163,74,0.65) 0%, transparent 55%),
                  radial-gradient(75% 60% at 82% 92%, rgba(220,38,38,0.70) 0%, transparent 58%),
                  radial-gradient(55% 45% at 55% 65%, rgba(245,158,11,0.40) 0%, transparent 62%)
                `,
              }}
            />

            {/* Scattered blur blobs for an organic, painterly look */}
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: '-18px',
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                background: 'rgba(37,99,235,0.75)',
                filter: 'blur(40px)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '70px',
                right: '-22px',
                width: '130px',
                height: '130px',
                borderRadius: '50%',
                background: 'rgba(168,85,247,0.70)',
                filter: 'blur(34px)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '70px',
                left: '38%',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'rgba(22,163,74,0.65)',
                filter: 'blur(28px)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '18%',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'rgba(220,38,38,0.65)',
                filter: 'blur(32px)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '150px',
                left: '30%',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(245,158,11,0.50)',
                filter: 'blur(22px)',
              }}
            />
          </div>

          {/* Content layer — push sign-out to the bottom */}
          <div
            className="relative z-10 flex h-full min-h-[300px] flex-col justify-end p-4"
          >
            <button
              type="button"
              onClick={onSignOut}
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                boxShadow:
                  '0 6px 18px rgba(220,38,38,0.45), 0 0 0 1px rgba(255,255,255,0.08) inset',
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold tracking-tight transition hover:brightness-110 active:brightness-95"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
