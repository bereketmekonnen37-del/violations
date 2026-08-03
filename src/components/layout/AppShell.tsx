import { Outlet } from 'react-router-dom';
import { MobileNav } from './MobileNav';
import { NavRail } from './NavRail';
import { Topbar } from './Topbar';

export const AppShell = () => {
  return (
    <div
      className="flex min-h-screen"
      style={{ background: 'var(--color-bg-main)' }}
    >
      <NavRail />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar />
        <main
          className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-10 lg:pt-8"
          style={{ background: 'var(--color-bg-main)' }}
        >
          <Outlet />
        </main>
        <MobileNav />
      </div>
    </div>
  );
};
