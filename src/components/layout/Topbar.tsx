import { GitMerge, LogOut, User as UserIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/store';
import { useAuth } from '../../hooks/useAuth';
import { toggleNightMerge } from '../../features/settings/nightMergeSlice';
import { Avatar } from '../ui/Avatar';

export const Topbar = () => {
  const { user, logout } = useAuth();
  const photo = useAppSelector((s) => s.profile.photo);
  const nightMergeEnabled = useAppSelector((s) => s.nightMerge.enabled);
  const dispatch = useAppDispatch();
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
        background: '#ffffff',
        borderBottom: '1px solid var(--color-brand-blue-line)',
      }}
    >
      <div className="flex items-center gap-4">
        <div className="hidden lg:block">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-brand-blue)' }}
          >
            Workspace
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => dispatch(toggleNightMerge())}
          title={
            nightMergeEnabled
              ? 'Nights are merged: consecutive 18:00–06:00 events collapse into one row on Master Fleet, Dashboard and Transporter pages. Click to show every row separately.'
              : 'Nights are shown one by one, unmerged. Click to re-enable merging consecutive 18:00–06:00 events into one row.'
          }
          aria-pressed={nightMergeEnabled}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition"
          style={
            nightMergeEnabled
              ? {
                  background: 'var(--color-brand-blue-soft)',
                  color: 'var(--color-brand-blue-dark)',
                  border: '1px solid var(--color-brand-blue-line)',
                }
              : {
                  background: 'var(--color-brand-blue)',
                  color: '#ffffff',
                  border: '1px solid var(--color-brand-blue-dark)',
                }
          }
        >
          <GitMerge size={14} />
          <span className="hidden sm:inline">
            {nightMergeEnabled ? 'Nights merged' : 'Nights unmerged'}
          </span>
        </button>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-3 rounded-xl p-1.5 pr-3 transition"
            style={{
              background: 'var(--color-brand-blue)',
              border: '1px solid var(--color-brand-blue-dark)',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(62, 85, 165, 0.28)',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background =
                'var(--color-brand-blue-hover)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'var(--color-brand-blue)')
            }
          >
            <Avatar name={user?.name ?? ''} src={photo} size={28} />
            <span
              className="hidden text-sm font-semibold sm:inline"
              style={{ color: '#ffffff' }}
            >
              {user?.name}
            </span>
          </button>
          {open && (
            <div
              className="absolute right-0 mt-2 w-60 origin-top-right overflow-hidden rounded-2xl shadow-elev"
              style={{
                background: '#ffffff',
                border: '1px solid var(--color-brand-blue-line)',
                color: 'var(--color-text-primary)',
              }}
            >
              <div
                className="px-4 py-3"
                style={{
                  borderBottom: '1px solid var(--color-brand-blue-line)',
                  background: 'var(--color-brand-blue-soft)',
                }}
              >
                <p
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-brand-blue-dark)' }}
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
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition hover:bg-[color:var(--color-brand-blue-soft)]"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    <UserIcon
                      size={15}
                      style={{ color: 'var(--color-brand-blue)' }}
                    />{' '}
                    Profile & settings
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition hover:bg-[color:var(--color-red-light)]/40"
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
