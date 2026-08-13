import { LogOut, User as UserIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/store';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';

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
    <header
      className="sticky top-0 z-30 flex h-16 items-center justify-between px-4 backdrop-blur sm:px-6"
      style={{
        background: 'var(--color-bg-card)',
        borderBottom: '1px solid var(--color-brand-navy-line)',
      }}
    >
      <div className="flex items-center gap-4">
        <div className="hidden lg:block">
          <p
            className="text-[11px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Workspace
          </p>
          <p
            className="text-sm font-semibold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {user?.role === 'boss'
              ? 'Fleet Operations'
              : (user?.assignedTransporters?.length ?? 0) > 0
                ? `Transporter · ${user!.assignedTransporters!.join(', ')}`
                : 'Operations Staff'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-3 rounded-xl p-1.5 pr-3 transition hover:bg-black/5"
            style={{
              background: '#ffffff',
              border: '1px solid var(--color-brand-navy-line)',
              color: 'var(--color-text-primary)',
            }}
          >
            <Avatar name={user?.name ?? ''} src={photo} size={28} />
            <span
              className="hidden text-sm font-medium sm:inline"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {user?.name}
            </span>
          </button>
          {open && (
            <div
              className="absolute right-0 mt-2 w-60 origin-top-right overflow-hidden rounded-2xl shadow-elev"
              style={{
                background: '#ffffff',
                border: '1px solid var(--color-brand-navy-line)',
                color: 'var(--color-text-primary)',
              }}
            >
              <div
                className="px-4 py-3"
                style={{
                  borderBottom: '1px solid var(--color-brand-navy-line)',
                }}
              >
                <p
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {user?.name}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {user?.email}
                </p>
              </div>
              <ul className="p-1.5 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate('/settings');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-black/5"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    <UserIcon size={15} /> Profile & settings
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left"
                    style={{ color: 'var(--color-brand-red)' }}
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
