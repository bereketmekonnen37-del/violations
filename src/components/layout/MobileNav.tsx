import { NavLink } from 'react-router-dom';
import {
  FileStack,
  LayoutDashboard,
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
import { cn } from '../../lib/utils';
import { useUserScope } from '../../hooks/useUserScope';

const LEGACY_STAFF = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/upload', label: 'Upload', icon: Upload },
  { to: '/unfiltered', label: 'Speed', icon: Sparkles },
  { to: '/unfiltered-nights', label: 'Nights', icon: Moon },
  { to: '/unfiltered-continuous', label: 'Continuous', icon: Route },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const BOSS = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/violations', label: 'Files', icon: FileStack },
  { to: '/drivers-data', label: 'Drivers', icon: Users },
  { to: '/master-fleet', label: 'Master', icon: Trophy },
  { to: '/rules', label: 'Rules', icon: ShieldCheck },
  { to: '/user-management', label: 'Users', icon: UserCog },
  { to: '/unfiltered', label: 'Speed', icon: Sparkles },
  { to: '/unfiltered-nights', label: 'Nights', icon: Moon },
  { to: '/unfiltered-continuous', label: 'Continuous', icon: Route },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const TRANSPORTER_STAFF = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/upload', label: 'Upload', icon: Upload },
  { to: '/violations', label: 'Files', icon: FileStack },
  { to: '/master-fleet', label: 'Master', icon: Trophy },
  { to: '/unfiltered', label: 'Speed', icon: Sparkles },
  { to: '/unfiltered-nights', label: 'Nights', icon: Moon },
  { to: '/unfiltered-continuous', label: 'Continuous', icon: Route },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const MobileNav = () => {
  const { isBoss, isTransporterStaff } = useUserScope();
  const items = isBoss ? BOSS : isTransporterStaff ? TRANSPORTER_STAFF : LEGACY_STAFF;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 backdrop-blur lg:hidden"
      style={{
        // Same secondary wash as the sidebar body — orange hint at the
        // bottom edge, dissolving to white toward the top of the strip.
        background:
          'linear-gradient(to top, rgba(244, 130, 33, 0.14) 0%, rgba(244, 130, 33, 0.06) 40%, rgba(255, 255, 255, 0) 100%), #ffffff',
        borderTop: '1px solid var(--color-brand-blue-line)',
      }}
    >
      <ul className="no-scrollbar flex gap-1 overflow-x-auto px-2 py-2">
        {items.map((i) => (
          <li key={i.to} className="shrink-0">
            <NavLink
              to={i.to}
              end={i.to === '/dashboard'}
              className={({ isActive }) =>
                cn(
                  'flex min-w-[70px] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition',
                  isActive ? 'mobile-nav-active' : 'mobile-nav-idle',
                )
              }
            >
              <i.icon size={17} />
              {i.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <style>{`
        .mobile-nav-idle {
          color: var(--color-text-secondary);
          background: transparent;
        }
        .mobile-nav-idle:hover {
          color: var(--color-brand-blue);
          background: var(--color-brand-blue-soft);
        }
        .mobile-nav-active {
          color: #ffffff;
          background: var(--color-brand-blue);
          box-shadow: 0 4px 12px rgba(62, 85, 165, 0.28);
        }
      `}</style>
    </nav>
  );
};
