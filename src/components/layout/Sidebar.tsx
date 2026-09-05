import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Bell,
  User,
  CheckSquare,
  LogOut,
} from 'lucide-react';

import lamLogoImg from '../../assets/OIP.webp';
import axcelisLogoImg from '../../assets/Axcelis_Technologies-Logo.wine.png';
import vishayLogoImg from '../../assets/vishay-logo-approved.avif';

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
  const { user, logout } = useAuth();
  const { currentCompany } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();

  const companyKey = (currentCompany.name || currentCompany.code || currentCompany.short_name || currentCompany.id || '').toLowerCase();
  const isAxcelis = companyKey.includes('axcelis');
  const isVishay = companyKey.includes('vishay');
  const isLam = companyKey.includes('lam');

  let activeLogo = lamLogoImg;
  if (isAxcelis) {
    activeLogo = axcelisLogoImg;
  } else if (isVishay) {
    activeLogo = vishayLogoImg;
  } else if (isLam) {
    activeLogo = lamLogoImg;
  }

  // Always use dedicated full-coverage logo layout without redundant side text
  const hasDedicatedFullLogo = true;

  const isScheduleRoute = ['/schedule', '/visa', '/travel', '/leaves', '/missed-schedules'].includes(location.pathname);
  const [scheduleExpanded, setScheduleExpanded] = useState<boolean>(isScheduleRoute);

  useEffect(() => {
    if (isScheduleRoute) {
      setScheduleExpanded(true);
    }
  }, [location.pathname, isScheduleRoute]);

  const isMainAdmin = user?.role === 'Main Admin' || user?.role === 'Global Admin';
  const isManager = user?.role === 'Manager' || user?.role === 'Company Admin';
  const isEngineerUser = user?.role === 'Field Engineer' || user?.role === 'Engineer';

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
      {
        label: 'Schedule',
        path: '/schedule',
        icon: Calendar,
        children: [
          { label: 'Visa Tracking', path: '/visa', icon: FileCheck },
          { label: 'Travel Operations', path: '/travel', icon: Plane },
          { label: 'Leave Operations', path: '/leaves', icon: Clock },
          { label: 'Missed Schedules', path: '/missed-schedules', icon: CalendarX },
        ],
      },
      { label: 'Performance', path: '/performance', icon: TrendingUp },
      ...(user?.role !== 'Viewer' ? [{ label: 'Operational Alerts', path: '/alerts', icon: Bell }] : []),
      { label: 'Reports', path: '/reports', icon: BarChart3 },
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
        className={`fixed top-0 left-0 bottom-0 z-50 bg-[var(--color-sidebar)] text-[var(--color-sidebar-text)] border-r border-[var(--color-sidebar-border)] transition-transform md:transition-all duration-300 flex flex-col justify-between ${mobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full md:translate-x-0'
          } ${collapsed ? 'md:w-16' : 'md:w-60'}`}
      >
        {/* Company Header Branding at Top */}
        <div
          onClick={() => {
            if (mobileOpen && onCloseMobile) onCloseMobile();
            navigate(isEngineerUser ? '/engineer/dashboard' : '/dashboard');
          }}
          className={`h-16 flex items-center border-b border-[var(--color-sidebar-border)] cursor-pointer transition-colors hover:bg-[var(--color-sidebar-hover)] ${
            collapsed ? 'justify-center px-2' : hasDedicatedFullLogo ? 'px-3 justify-center' : 'px-4 space-x-3'
          }`}
          title={currentCompany.name}
        >
          {hasDedicatedFullLogo ? (
            <div className="w-full h-full flex items-center justify-center p-1.5 overflow-hidden">
              <div className="w-full h-11 bg-white/95 rounded-xl px-2.5 py-1 flex items-center justify-center shadow-xs border border-white/20 transition-transform duration-200 hover:scale-[1.02]">
                <img
                  src={activeLogo}
                  alt={currentCompany.name || 'Company Logo'}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
          ) : (
            <>
              <img
                src={activeLogo}
                alt={currentCompany.name || 'Company Logo'}
                className="w-[70px] h-9 rounded-xl object-contain shadow-xs flex-shrink-0 bg-white/90 p-0.5 border border-black/5"
              />
              {(!collapsed || mobileOpen) && (
                <div className="min-w-0 flex-1">
                  <h1 className="text-sm sm:text-base font-black text-[var(--color-sidebar-text)] truncate tracking-tight leading-tight">
                    {currentCompany.name}
                  </h1>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-sidebar-text-muted)] truncate">
                    Orbit Portal
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        {/* Navigation Items */}
        <div className="py-4 space-y-1 px-2.5 overflow-y-auto flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            if ('children' in item && item.children) {
              const isChildActive = item.children.some((c) => location.pathname === c.path);
              const isParentActive = location.pathname === item.path;
              const isAnyActive = isParentActive || isChildActive;

              return (
                <div key={item.path} className="space-y-1">
                  <div
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group cursor-pointer ${isParentActive
                      ? 'bg-[var(--color-sidebar-active)] text-[var(--color-sidebar-text)] font-bold shadow-2xs border border-[var(--color-sidebar-border)]'
                      : isChildActive
                        ? 'text-[var(--color-sidebar-text)] font-bold bg-[var(--color-sidebar-hover)]'
                        : 'text-[var(--color-sidebar-text-muted)] hover:text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]'
                      }`}
                    title={collapsed ? item.label : undefined}
                    onClick={() => {
                      if (collapsed && !mobileOpen) {
                        navigate(item.path);
                      } else {
                        setScheduleExpanded(!scheduleExpanded);
                      }
                    }}
                  >
                    <div
                      className="flex items-center space-x-3 min-w-0 flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(item.path);
                        if (mobileOpen && onCloseMobile) onCloseMobile();
                        setScheduleExpanded(true);
                      }}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform ${isAnyActive ? 'text-[var(--color-sidebar-text)]' : 'text-[var(--color-sidebar-text-muted)] group-hover:text-[var(--color-sidebar-text)]'
                          }`}
                      />
                      {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
                    </div>

                    {(!collapsed || mobileOpen) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setScheduleExpanded(!scheduleExpanded);
                        }}
                        className="p-0.5 rounded hover:bg-[var(--color-sidebar-hover)] transition-colors text-[var(--color-sidebar-text-muted)] hover:text-[var(--color-sidebar-text)] ml-1"
                        aria-label="Toggle Submenu"
                      >
                        {scheduleExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {scheduleExpanded && (!collapsed || mobileOpen) && (
                    <div className="pl-3.5 pr-1 py-0.5 space-y-1 border-l-2 border-[var(--color-sidebar-border)] ml-4 my-1">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        return (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            onClick={onCloseMobile}
                            className={({ isActive }) =>
                              `flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group ${isActive
                                ? 'bg-[var(--color-sidebar-active)] text-[var(--color-sidebar-text)] font-bold shadow-2xs border border-[var(--color-sidebar-border)]'
                                : 'text-[var(--color-sidebar-text-muted)] hover:text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]'
                              }`
                            }
                            title={child.label}
                          >
                            {({ isActive }) => (
                              <>
                                <ChildIcon
                                  className={`w-3.5 h-3.5 flex-shrink-0 group-hover:scale-110 transition-transform ${isActive ? 'text-[var(--color-sidebar-text)]' : 'text-[var(--color-sidebar-text-muted)] group-hover:text-[var(--color-sidebar-text)]'
                                    }`}
                                />
                                <span className="truncate">{child.label}</span>
                              </>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${isActive
                    ? 'bg-[var(--color-sidebar-active)] text-[var(--color-sidebar-text)] font-bold shadow-2xs border border-[var(--color-sidebar-border)]'
                    : 'text-[var(--color-sidebar-text-muted)] hover:text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]'
                  }`
                }
                title={collapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform ${isActive ? 'text-[var(--color-sidebar-text)]' : 'text-[var(--color-sidebar-text-muted)] group-hover:text-[var(--color-sidebar-text)]'
                      }`} />
                    {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer with Logout & Collapse Toggle */}
        <div className="p-3 border-t border-[var(--color-sidebar-border)] flex items-center justify-between gap-1.5">
          <button
            onClick={() => {
              if (mobileOpen && onCloseMobile) onCloseMobile();
              logout();
            }}
            className={`flex items-center space-x-2 text-xs font-semibold text-[var(--color-sidebar-text-muted)] hover:text-red-400 hover:bg-red-500/10 px-2.5 py-1.5 rounded-xl transition-all group cursor-pointer ${
              collapsed && !mobileOpen ? 'justify-center w-full' : ''
            }`}
            title="Log Out"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
            {(!collapsed || mobileOpen) && <span>Log Out</span>}
          </button>
          {(!collapsed || mobileOpen) && (
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 rounded-lg text-[var(--color-sidebar-text-muted)] hover:text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)] transition-colors cursor-pointer"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
