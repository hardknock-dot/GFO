import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';
import { useCompanyOperationalAlerts } from '../../hooks/useOperationalAlerts';
import { GlobalSearch } from '../common/GlobalSearch';
import {
  Building2,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Shield,
  Layers,
  Menu,
  Bell,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import type { OperationalAlert } from '../../services/operational';

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const { currentCompany, companies, setCompany } = useCompany();
  const { user, logout, selectCompany } = useAuth();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const companyMenuRef = useRef<HTMLDivElement>(null);

  // Fetch company-aware operational alerts derived from backend rule engine
  const activeCompanyId = currentCompany.id === 'all-data' ? undefined : (currentCompany.company_id || currentCompany.id);
  const { data: alertsRes, isLoading, isError } = useCompanyOperationalAlerts(activeCompanyId);
  const alerts: OperationalAlert[] = alertsRes || [];

  // Sort alerts by severity: critical -> warning -> info
  const sortedAlerts = [...alerts].sort((a, b) => {
    const sevOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    return (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2);
  });

  const displayAlerts = sortedAlerts.slice(0, 10);
  const alertCount = alerts.length;

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (companyMenuRef.current && !companyMenuRef.current.contains(e.target as Node)) {
        setCompanyMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAlertClick = (alert: OperationalAlert) => {
    setNotifMenuOpen(false);
    if (alert.engineer_id) {
      navigate(`/engineers/${alert.engineer_id}`);
    } else if (alert.schedule_id) {
      navigate('/schedule');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200/80 z-50 px-3 sm:px-6 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Menu Toggle & Company Branding */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Toggle mobile menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer" onClick={() => navigate(user?.role === 'Field Engineer' || user?.role === 'Engineer' ? '/engineer/dashboard' : '/dashboard')}>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-secondary)] p-0.5 shadow-sm flex items-center justify-center flex-shrink-0">
            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center overflow-hidden">
              <span className="font-black text-xs sm:text-sm text-[var(--color-secondary)] tracking-wider">
                {currentCompany.code}
              </span>
            </div>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
              {currentCompany.name}
            </span>
            <span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-[var(--color-secondary)]">
              Orbit Portal
            </span>
          </div>
        </div>

        {/* Quick Tenant Switcher Dropdown */}
        <div className="relative" ref={companyMenuRef}>
          <button
            onClick={() => setCompanyMenuOpen(!companyMenuOpen)}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
            <span className="hidden sm:inline">Switch Tenant</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {companyMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <Layers className="w-3 h-3" />
                <span>Select Company Workspace</span>
              </div>
              {companies
                .filter((comp) => {
                  if (user?.role === 'Main Admin' || user?.role === 'Global Admin') return true;
                  if (user?.accessibleCompanies && user.accessibleCompanies.length > 0) {
                    return (
                      comp.id !== 'all-data' &&
                      comp.company_id !== 'all-data' &&
                      (user.accessibleCompanies.includes(comp.id) || user.accessibleCompanies.includes(comp.company_id))
                    );
                  }
                  return (
                    comp.id !== 'all-data' &&
                    comp.company_id !== 'all-data' &&
                    (comp.id === user?.currentCompanyId || comp.company_id === user?.currentCompanyId)
                  );
                })
                .map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => {
                      const targetId = comp.company_id || comp.id;
                      setCompany(targetId);
                      selectCompany(targetId);
                      setCompanyMenuOpen(false);
                      if (comp.id === 'all-data' || comp.company_id === 'all-data') {
                        navigate('/all-data');
                      } else if (user?.role === 'Field Engineer' || user?.role === 'Engineer') {
                        navigate('/engineer/dashboard');
                      } else {
                        navigate('/dashboard');
                      }
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/80 ${
                      comp.id === currentCompany.id
                        ? 'font-bold text-[var(--color-secondary)] bg-slate-50 dark:bg-slate-800/50'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{comp.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                      {comp.code}
                    </span>
                  </button>
                ))}
              {(user?.role === 'Main Admin' || user?.role === 'Global Admin') && (
                <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setCompanyMenuOpen(false);
                      navigate('/company-selection');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-[var(--color-secondary)] font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    View All Enterprise Accounts →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Middle: Global Search */}
      <div className="hidden lg:flex flex-1 max-w-md mx-8">
        <GlobalSearch />
      </div>

      {/* Right: Notification Bell & User Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Company-Aware Operational Notification Bell */}
        {user?.role !== 'Viewer' && (
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifMenuOpen(!notifMenuOpen)}
              className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              {alertCount > 0 && (
                <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {notifMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-slate-900 dark:text-white">Operational Notifications</span>
                  </div>
                  {alertCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold font-mono rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      {alertCount} Active
                    </span>
                  )}
                </div>

                {/* Alert List Container */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoading ? (
                    <div className="p-6 text-center text-slate-400">Loading alerts...</div>
                  ) : isError ? (
                    <div className="p-4 text-center text-rose-500">Unable to load notifications</div>
                  ) : displayAlerts.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="font-semibold text-slate-800 dark:text-slate-200">No operational alerts</p>
                      <p className="text-[11px] text-slate-400">Operational data is clean and consistent.</p>
                    </div>
                  ) : (
                    displayAlerts.map((alt) => (
                      <button
                        key={alt.id}
                        onClick={() => handleAlertClick(alt)}
                        className={`w-full text-left p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-start space-x-3 ${
                          alt.severity === 'warning' || alt.severity === 'critical'
                            ? 'bg-amber-50/30 dark:bg-amber-950/10'
                            : ''
                        }`}
                      >
                        {alt.severity === 'warning' || alt.severity === 'critical' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-semibold text-slate-900 dark:text-white truncate">{alt.title}</p>
                            {currentCompany.id === 'all-data' && alt.company_name && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-medium flex-shrink-0">
                                {alt.company_name}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-tight">
                            {alt.message}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Footer Link */}
                <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-center">
                  <button
                    onClick={() => {
                      setNotifMenuOpen(false);
                      navigate('/alerts');
                    }}
                    className="text-xs font-semibold text-[var(--color-secondary)] hover:underline inline-flex items-center"
                  >
                    <span>View all operational alerts ({alertCount})</span>
                    <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <img
              src={user?.avatar}
              alt={user?.name}
              className="w-8 h-8 rounded-lg object-cover ring-2 ring-[var(--color-accent)] ring-offset-1"
            />
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800">{user?.name}</span>
              <span className="text-[10px] text-slate-400 font-medium">{user?.role === 'Global Admin' ? 'Main Admin' : user?.role}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate(user?.role === 'Field Engineer' || user?.role === 'Engineer' ? '/engineer/profile' : '/settings');
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2"
              >
                <UserIcon className="w-4 h-4 text-slate-400" />
                <span>{user?.role === 'Field Engineer' || user?.role === 'Engineer' ? 'My Profile' : 'Account Settings'}</span>
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/company-selection');
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2"
              >
                <Shield className="w-4 h-4 text-slate-400" />
                <span>Company Selection</span>
              </button>
              <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                  navigate('/');
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
