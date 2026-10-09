import { NavLink } from 'react-router-dom';
import {
  Database,
  FileStack,
  Save,
  LayoutDashboard,
  MessageSquareText,
  Moon,
  Route,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  Truck,
  UserCog,
  Users,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useUserScope } from '../../hooks/useUserScope';

const STAFF_UPLOADS = [
  { to: '/unfiltered', label: 'Speed', icon: Sparkles },
  { to: '/unfiltered-nights', label: 'Nights', icon: Moon },
  { to: '/unfiltered-continuous', label: 'Continuous', icon: Route },
];

const LEGACY_STAFF = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  ...STAFF_UPLOADS,
  { to: '/settings', label: 'Settings', icon: Settings },
];

const BOSS = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/violations', label: 'Files', icon: FileStack },
  { to: '/drivers-data', label: 'Drivers', icon: Users },
  { to: '/master-fleet', label: 'Master', icon: Trophy },
  { to: '/snapshots', label: 'Saved Violations', icon: Save },
  { to: '/transporters', label: 'Transporters', icon: Truck },
  { to: '/rules', label: 'Rules', icon: ShieldCheck },
  { to: '/user-management', label: 'Users', icon: UserCog },
  { to: '/uploaded-data', label: 'Uploaded', icon: Database },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const TRANSPORTER_STAFF = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  ...STAFF_UPLOADS,
  { to: '/violations', label: 'Files', icon: FileStack },
  { to: '/master-fleet', label: 'Master', icon: Trophy },
  { to: '/transporters', label: 'Transporters', icon: Truck },
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
        <li className="shrink-0">
          <NavLink
            to="/sms-messaging"
            title="SMS Messaging &amp; Drivers"
            className={({ isActive }) =>
              cn(
                'relative flex min-w-[70px] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition',
                isActive ? 'mobile-nav-active' : 'mobile-nav-idle',
              )
            }
          >
            <MessageSquareText size={17} />
            SMS
            <span className="absolute -top-1 right-1 rounded-full bg-brand-orange px-1 py-px text-[7px] font-bold uppercase tracking-wider text-white">
              Soon
            </span>
          </NavLink>
        </li>
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
