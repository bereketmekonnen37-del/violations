import { useCallback, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  ChevronLeft,
  Database,
  LayoutDashboard,
  LogOut,
  Menu,
  Scale,
  Shield,
  Upload,
  Users,
} from 'lucide-react';
import { useAppSelector } from '../../app/store';
import { useAuth } from '../../hooks/useAuth';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  desc: string;
}

const NAV: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: <LayoutDashboard size={18} />, desc: 'Platform snapshot' },
  { to: '/admin/users', label: 'Users', icon: <Users size={18} />, desc: 'Accounts & roles' },
  { to: '/admin/uploads', label: 'Uploads', icon: <Upload size={18} />, desc: 'Every file uploaded' },
  { to: '/admin/activity', label: 'Activity', icon: <Activity size={18} />, desc: 'Recent timeline' },
  { to: '/admin/rules', label: 'Boss Rules', icon: <Scale size={18} />, desc: 'Thresholds & allowlists' },
  { to: '/admin/data', label: 'Data Health', icon: <Database size={18} />, desc: 'Tables & volumes' },
];

export const AdminShell = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const sidebarWidth = collapsed ? 72 : 248;

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #f0f4ff 0%, #f7f8fc 60%, #eef1fa 100%)',
        fontFamily: '"Inter","SF Pro Display",-apple-system,BlinkMacSystemFont,sans-serif',
      }}
    >
      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside
        style={{
          width: sidebarWidth,
          background: 'linear-gradient(180deg, #1e2a56 0%, #2a3a72 100%)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          transition: 'width 0.2s ease',
          flexShrink: 0,
        }}
        className={mobileOpen ? 'admin-sidebar-open' : 'admin-sidebar'}
      >
        {/* Logo */}
        <div
          style={{
            padding: collapsed ? '20px 16px' : '20px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #566fbb, #3e55a5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Shield size={20} color="#fff" />
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}>Superadmin</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>Console</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ padding: '16px 10px', flex: 1, overflowY: 'auto' }}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '10px' : '10px 12px',
                borderRadius: 10,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                textDecoration: 'none',
                marginBottom: 4,
                transition: 'all 0.15s ease',
                justifyContent: collapsed ? 'center' : 'flex-start',
              })}
              title={collapsed ? item.label : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && (
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.1 }}>{item.label}</p>
                  <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                    {item.desc}
                  </p>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setCollapsed((c) => !c)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <ChevronLeft
              size={14}
              style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid #e8ecf8',
            padding: '0 24px',
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <button
            onClick={() => setMobileOpen((m) => !m)}
            style={{
              display: 'none',
              padding: 8,
              borderRadius: 8,
              border: '1px solid #dfe4f2',
              background: '#fff',
              cursor: 'pointer',
            }}
            className="admin-menu-btn"
            aria-label="Open menu"
          >
            <Menu size={16} />
          </button>

          <div style={{ flex: 1 }} />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 99,
              background: 'rgba(62,85,165,0.08)',
              border: '1px solid #dfe4f2',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#059669',
                boxShadow: '0 0 6px rgba(5,150,105,0.6)',
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#3e55a5' }}>
              {user?.name ?? 'Superadmin'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 10,
              border: '1px solid #fee2e2',
              background: '#fff5f5',
              color: '#dc2626',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </header>

        <main style={{ padding: '28px 24px', maxWidth: 1400, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .admin-sidebar { position: fixed !important; left: -260px; z-index: 100; transition: left 0.2s ease; }
          .admin-sidebar-open { position: fixed !important; left: 0; z-index: 100; transition: left 0.2s ease; box-shadow: 0 10px 40px rgba(0,0,0,0.4); }
          .admin-menu-btn { display: inline-flex !important; }
        }
      `}</style>
    </div>
  );
};
