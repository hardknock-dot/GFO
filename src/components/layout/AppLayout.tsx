import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] transition-colors duration-200 overflow-x-hidden relative">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <Header
        collapsed={collapsed}
        onToggleMobileSidebar={() => setMobileOpen(!mobileOpen)}
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
