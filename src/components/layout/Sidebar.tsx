import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  Plane,
  FileCheck,
  TrendingUp,
  Clock,
  CalendarX,
  BarChart3,
  Upload,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Bell,
  User,
  CheckSquare,
  ShieldAlert
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { user } = useAuth();
  const isMainAdmin = user?.role === 'Main Admin' || user?.role === 'Global Admin';
  const isManager = user?.role === 'Manager' || user?.role === 'Company Admin';
  const isEngineerUser = user?.role === 'Field Engineer' || user?.role === 'Engineer';

  const isOpsExec = user?.role === 'Ops Executive';

  const navItems = isEngineerUser
    ? [
        { label: 'Dashboard', path: '/engineer/dashboard', icon: LayoutDashboard },
        { label: 'My Profile', path: '/engineer/profile', icon: User },
      ]
    : [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        ...((isMainAdmin || isManager || isOpsExec) ? [{ label: 'Delete Requests', path: '/delete-requests', icon: CheckSquare }] : []),
        { label: 'Engineer Search', path: '/engineer-search', icon: UserCheck },
        { label: 'Engineers', path: '/engineers', icon: Users },
        { label: 'Schedule', path: '/schedule', icon: Calendar },
        { label: 'Travel Operations', path: '/travel', icon: Plane },
        { label: 'Visa Tracking', path: '/visa', icon: FileCheck },
        { label: 'Performance', path: '/performance', icon: TrendingUp },
        { label: 'Leave Operations', path: '/leaves', icon: Clock },
        { label: 'Missed Schedules', path: '/missed-schedules', icon: CalendarX },
        ...(user?.role !== 'Viewer' ? [{ label: 'Operational Alerts', path: '/alerts', icon: Bell }] : []),
        { label: 'Reports', path: '/reports', icon: BarChart3 },
        ...(isMainAdmin ? [{ label: 'User Management & Audit', path: '/users', icon: ShieldAlert }] : []),
        ...(user?.role !== 'Viewer' ? [{ label: 'Data Upload', path: '/upload', icon: Upload }] : []),
        ...(user?.role !== 'Viewer' ? [{ label: 'Settings', path: '/settings', icon: SettingsIcon }] : []),
      ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed top-16 left-0 bottom-0 z-40 bg-[var(--color-sidebar)] text-slate-700 border-r border-slate-200 transition-transform md:transition-all duration-300 flex flex-col justify-between ${
          mobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'md:w-16' : 'md:w-60'}`}
      >
        {/* Navigation Items */}
        <div className="py-4 space-y-1 px-2.5 overflow-y-auto flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                    isActive
                      ? 'bg-[var(--color-sidebar-active)] text-slate-900 shadow-sm border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`
                }
                title={collapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform ${
                      isActive ? 'text-slate-800' : 'text-slate-400 group-hover:text-slate-700'
                    }`} />
                    {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer Collapse Toggle */}
        <div className="p-3 border-t border-slate-200 flex items-center justify-between">
          {(!collapsed || mobileOpen) && (
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
              v2.0 Enterprise
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors mx-auto"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
};
