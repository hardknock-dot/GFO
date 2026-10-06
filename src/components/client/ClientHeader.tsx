import React from 'react';
import { useAuth } from '../../context/AuthContext';
import type { ClientAuthorizedCompany } from '../../types/client';
import {
  Tv2,
  LogOut,
  ChevronDown,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import skylineLogoImg from '../../assets/logo.jpg';

interface ClientHeaderProps {
  presentationMode: boolean;
  onTogglePresentationMode: () => void;
  authorizedCompanies: ClientAuthorizedCompany[];
  selectedCompanyId?: string;
  onSelectCompany: (companyId: string) => void;
}

export const ClientHeader: React.FC<ClientHeaderProps> = ({
  presentationMode,
  onTogglePresentationMode,
  authorizedCompanies = [],
  selectedCompanyId,
  onSelectCompany,
}) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [companyMenuOpen, setCompanyMenuOpen] = React.useState(false);

  const selectedCompany = authorizedCompanies.find(
    (c) => c.company_id === selectedCompanyId
  );

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-[#E2E8F0] shadow-xs transition-all duration-200">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-10 h-18 flex items-center justify-between gap-4">
        {/* Left: Orbit & Skyline Brand */}
        <div className="flex items-center space-x-3.5 sm:space-x-4">
          <div className="h-10 w-32 px-2 py-1 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-center shadow-xs overflow-hidden shrink-0">
            <img
              src={skylineLogoImg}
              alt="Orbit & Skyline"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-[#172B4D] flex items-center gap-2">
                <span>ORBIT & SKYLINE</span>
                <span className="hidden sm:inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#EBF3FB] text-[#3B82C4] border border-[#3B82C4]/30 uppercase tracking-wider">
                  Executive Portal
                </span>
              </h1>
            </div>
            <p className="text-xs text-[#64748B] font-medium hidden md:block">
              Semiconductor Engineering Capability & Operations Showcase
            </p>
          </div>
        </div>

        {/* Center/Right: Multi-Company Selector & Presentation Mode */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {authorizedCompanies.length > 1 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setCompanyMenuOpen(!companyMenuOpen)}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F6F8FB] border border-[#E2E8F0] hover:border-[#3B82C4] text-[#172033] transition-all shadow-2xs cursor-pointer"
              >
                <Layers className="w-4 h-4 text-[#3B82C4]" />
                <span className="max-w-[130px] sm:max-w-[200px] truncate font-medium">
                  {selectedCompany ? selectedCompany.company_name : 'All Authorized Companies'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
              </button>

              {companyMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-68 bg-white border border-[#E2E8F0] rounded-2xl shadow-xl z-50 py-1.5 text-xs text-[#172033]">
                  <div className="px-4 py-2.5 border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center justify-between">
                    <span>Authorized Workspaces</span>
                    <span className="px-1.5 py-0.2 rounded bg-[#EBF3FB] text-[#3B82C4]">{authorizedCompanies.length}</span>
                  </div>
                  <button
                    onClick={() => {
                      onSelectCompany('');
                      setCompanyMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-[#F6F8FB] transition-colors cursor-pointer ${
                      !selectedCompanyId ? 'text-[#3B82C4] font-bold bg-[#EBF3FB]' : 'text-[#172033]'
                    }`}
                  >
                    <span>All Authorized Companies</span>
                    {!selectedCompanyId && <CheckCircle2 className="w-4 h-4 text-[#3B82C4]" />}
                  </button>
                  {authorizedCompanies.map((c) => {
                    const isSelected = selectedCompanyId === c.company_id;
                    return (
                      <button
                        key={c.company_id}
                        onClick={() => {
                          onSelectCompany(c.company_id);
                          setCompanyMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-[#F6F8FB] transition-colors cursor-pointer ${
                          isSelected ? 'text-[#3B82C4] font-bold bg-[#EBF3FB]' : 'text-[#172033]'
                        }`}
                      >
                        <span className="truncate">{c.company_name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#3B82C4]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Presentation Mode Toggle Button */}
          <button
            type="button"
            onClick={onTogglePresentationMode}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              presentationMode
                ? 'bg-[#172B4D] hover:bg-[#0F1C30] text-white ring-2 ring-[#3B82C4]/50'
                : 'bg-[#EBF3FB] hover:bg-[#D9EAF8] text-[#3B82C4] border border-[#3B82C4]/30'
            }`}
            title={presentationMode ? 'Exit Presentation Mode' : 'Enter Presentation Mode'}
          >
            <Tv2 className="w-4 h-4" />
            <span className="hidden sm:inline">
              {presentationMode ? 'Exit Presentation' : 'Presentation Mode'}
            </span>
          </button>

          {/* User Profile / Logout */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-[#F6F8FB] border border-transparent hover:border-[#E2E8F0] transition-colors cursor-pointer"
            >
              <div className="w-8.5 h-8.5 rounded-xl bg-[#172B4D] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold text-[#172033] leading-tight">{user?.name || 'Client Executive'}</span>
                <span className="text-[11px] text-[#64748B] font-medium">Executive Access</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B] hidden sm:block" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#E2E8F0] rounded-2xl shadow-xl z-50 py-1.5 text-xs text-[#172033]">
                <div className="px-4 py-3 border-b border-[#E2E8F0]">
                  <p className="font-bold text-[#172033]">{user?.name}</p>
                  <p className="text-[11px] text-[#64748B] truncate">{user?.email}</p>
                  <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-md bg-[#EBF3FB] text-[#3B82C4] font-semibold">
                    Role: {user?.role}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-rose-50 text-rose-600 flex items-center space-x-2 font-semibold transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
