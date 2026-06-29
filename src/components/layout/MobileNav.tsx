import { NavLink } from 'react-router-dom';
import {
  FileStack,
  LayoutDashboard,
  Moon,
  Route,
  Settings,
  Sparkles,
  Trophy,
  Upload,
  Users,
} from 'lucide-react';
import { useAppSelector } from '../../app/store';
import { cn } from '../../lib/utils';

const STAFF = [
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
  { to: '/unfiltered', label: 'Speed', icon: Sparkles },
  { to: '/unfiltered-nights', label: 'Nights', icon: Moon },
  { to: '/unfiltered-continuous', label: 'Continuous', icon: Route },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const MobileNav = () => {
  const role = useAppSelector((s) => s.auth.user?.role);
  const items = role === 'boss' ? BOSS : STAFF;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur dark:border-ink-800 dark:bg-ink-950/95 lg:hidden">
      <ul className="no-scrollbar flex gap-1 overflow-x-auto px-2 py-2">
        {items.map((i) => (
          <li key={i.to} className="shrink-0">
            <NavLink
              to={i.to}
              end={i.to === '/dashboard'}
              className={({ isActive }) =>
                cn(
                  'flex min-w-[70px] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition',
                  isActive
                    ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                    : 'text-ink-500 dark:text-ink-400',
                )
              }
            >
              <i.icon size={17} />
              {i.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};
