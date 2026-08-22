import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const prevPathname = useRef(location.pathname);
  const userCollapsedPref = useRef(collapsed);

  useEffect(() => {
    const wasSearch = prevPathname.current === '/engineer-search';
    const isSearch = location.pathname === '/engineer-search';

    if (isSearch && !wasSearch) {
      // Entering search page: save current preference and minimize
      userCollapsedPref.current = collapsed;
      setCollapsed(true);
    } else if (!isSearch && wasSearch) {
      // Leaving search page: restore user's preference
      setCollapsed(userCollapsedPref.current);
    } else if (!isSearch) {
      // User is changing preference on non-search pages
      userCollapsedPref.current = collapsed;
    }

    prevPathname.current = location.pathname;
  }, [location.pathname, collapsed]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] transition-colors duration-200 overflow-x-hidden relative">
      <Header onToggleMobileSidebar={() => setMobileOpen(!mobileOpen)} />


      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <main
        className={`pt-20 pb-12 px-3 sm:px-6 md:px-8 transition-all duration-300 ${
          collapsed ? 'md:ml-16' : 'md:ml-60'
        } ml-0`}
      >
        <div className="w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
