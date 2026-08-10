import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';
import { GlobalSearch } from '../common/GlobalSearch';
import { Building2, ChevronDown, LogOut, User as UserIcon, Shield, Layers, Menu } from 'lucide-react';

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const { currentCompany, companies, setCompany } = useCompany();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);

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

        <div className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
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
        <div className="relative">
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
              {companies.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => {
                    setCompany(comp.id);
                    setCompanyMenuOpen(false);
                    if (comp.id === 'all-data') {
                      navigate('/all-data');
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
            </div>
          )}
        </div>
      </div>

      {/* Middle: Global Search */}
      <div className="hidden lg:flex flex-1 max-w-md mx-8">
        <GlobalSearch />
      </div>

      {/* Right: User Profile & Controls */}
      <div className="flex items-center space-x-3">
        <div className="relative">
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
              <span className="text-[10px] text-slate-400 font-medium">{user?.role}</span>
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
                  navigate('/settings');
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2"
              >
                <UserIcon className="w-4 h-4 text-slate-400" />
                <span>Account Settings</span>
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
