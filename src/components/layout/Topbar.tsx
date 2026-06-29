import { LogOut, User as UserIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/store';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Logo } from '../ui/Logo';

export const Topbar = () => {
  const { user, logout } = useAuth();
  const photo = useAppSelector((s) => s.profile.photo);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-100 bg-white/85 px-4 backdrop-blur dark:border-ink-800 dark:bg-ink-950/85 sm:px-6">
      <div className="lg:hidden">
        <Logo />
      </div>
      <div className="hidden lg:block">
        <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
          Workspace
        </p>
        <p className="text-sm font-semibold tracking-tight text-ink-900 dark:text-white">
          {user?.role === 'boss' ? 'Fleet Operations' : 'Operations Staff'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-1.5 pr-3 transition hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:hover:bg-ink-800"
          >
            <Avatar name={user?.name ?? ''} src={photo} size={28} />
            <span className="hidden text-sm font-medium text-ink-900 dark:text-ink-100 sm:inline">
              {user?.name}
            </span>
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-60 origin-top-right overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-elev dark:border-ink-800 dark:bg-ink-900">
              <div className="border-b border-ink-100 px-4 py-3 dark:border-ink-800">
                <p className="text-sm font-semibold text-ink-900 dark:text-white">
                  {user?.name}
                </p>
                <p className="text-xs text-ink-500 dark:text-ink-400">{user?.email}</p>
              </div>
              <ul className="p-1.5 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate('/settings');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-ink-100 dark:hover:bg-ink-800"
                  >
                    <UserIcon size={15} /> Profile & settings
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
