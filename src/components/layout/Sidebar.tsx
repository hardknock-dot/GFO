import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
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

import logoImg from '../../assets/OIP.webp';

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
  const { currentCompany } = useCompany();
  const navigate = useNavigate();

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
      ...((isMainAdmin || isManager) ? [{ label: 'Delete Requests', path: '/delete-requests', icon: CheckSquare }] : []),
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
      ...((user?.role !== 'Viewer' && !isOpsExec) ? [{ label: 'Settings', path: '/settings', icon: SettingsIcon }] : []),
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
        className={`fixed top-0 left-0 bottom-0 z-50 bg-[var(--color-sidebar)] text-stone-900 border-r border-[#E5956D]/50 transition-transform md:transition-all duration-300 flex flex-col justify-between ${mobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full md:translate-x-0'
          } ${collapsed ? 'md:w-16' : 'md:w-60'}`}
      >
        {/* Company Header Branding at Top */}
        <div
          onClick={() => {
            if (mobileOpen && onCloseMobile) onCloseMobile();
            navigate(isEngineerUser ? '/engineer/dashboard' : '/dashboard');
          }}
          className={`h-16 flex items-center border-b border-[#E5956D]/40 cursor-pointer transition-colors hover:bg-black/5 ${collapsed ? 'justify-center px-2' : 'px-4 space-x-3'
            }`}
          title={currentCompany.name}
        >
          <img
            src={logoImg}
            alt={currentCompany.name || 'Company Logo'}
            className="w-[4px] h-9 rounded-xl object-contain shadow-xs flex-shrink-0 bg-white/90 p-0.5 border border-black/5"
          />
          {(!collapsed || mobileOpen) && (
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-base font-black text-stone-950 truncate tracking-tight leading-tight">
                {currentCompany.name}
              </h1>
              <p className="text-[9px] font-bold uppercase tracking-wider text-stone-900/65 truncate">
                Orbit Portal
              </p>
            </div>
          )}
        </div>
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
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${isActive
                    ? 'bg-black/10 text-stone-950 font-bold shadow-2xs border border-black/5'
                    : 'text-stone-900/80 hover:text-stone-950 hover:bg-black/5'
                  }`
                }
                title={collapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform ${isActive ? 'text-stone-950' : 'text-stone-900/75 group-hover:text-stone-950'
                      }`} />
                    {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer Collapse Toggle */}
        <div className="p-3 border-t border-[#E5956D]/50 flex items-center justify-between">
          {(!collapsed || mobileOpen) && (
            <span className="text-[10px] uppercase font-mono tracking-widest text-stone-900/60 font-semibold">
              v2.0 Enterprise
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-stone-900/70 hover:text-stone-950 hover:bg-black/5 transition-colors mx-auto"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
};
