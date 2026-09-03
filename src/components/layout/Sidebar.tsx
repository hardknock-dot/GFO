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
  Upload,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Bell,
  User,
  CheckSquare,
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
  const location = useLocation();

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

        >
          <img
            src={logoImg}
            alt={currentCompany.name || 'Company Logo'}
            className="w-[70px] h-9 rounded-xl object-contain shadow-xs flex-shrink-0 bg-white/90 p-0.5 border border-black/5"
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

            if ('children' in item && item.children) {
              const isChildActive = item.children.some((c) => location.pathname === c.path);
              const isParentActive = location.pathname === item.path;
              const isAnyActive = isParentActive || isChildActive;

              return (
                <div key={item.path} className="space-y-1">
                  <div
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group cursor-pointer ${isParentActive
                        ? 'bg-black/10 text-stone-950 font-bold shadow-2xs border border-black/5'
                        : isChildActive
                          ? 'text-stone-950 font-bold bg-black/5'
                          : 'text-stone-900/80 hover:text-stone-950 hover:bg-black/5'
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
                        className={`w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform ${isAnyActive ? 'text-stone-950' : 'text-stone-900/75 group-hover:text-stone-950'
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
                        className="p-0.5 rounded hover:bg-black/10 transition-colors text-stone-900/70 hover:text-stone-950 ml-1"
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
                    <div className="pl-3.5 pr-1 py-0.5 space-y-1 border-l-2 border-stone-950/15 ml-4 my-1">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        return (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            onClick={onCloseMobile}
                            className={({ isActive }) =>
                              `flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group ${isActive
                                ? 'bg-black/10 text-stone-950 font-bold shadow-2xs border border-black/5'
                                : 'text-stone-900/80 hover:text-stone-950 hover:bg-black/5'
                              }`
                            }
                            title={child.label}
                          >
                            {({ isActive }) => (
                              <>
                                <ChildIcon
                                  className={`w-3.5 h-3.5 flex-shrink-0 group-hover:scale-110 transition-transform ${isActive ? 'text-stone-950' : 'text-stone-900/75 group-hover:text-stone-950'
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
