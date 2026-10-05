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
    <header className="sticky top-0 z-40 w-full bg-[#283618] border-b border-[#606C38]/40 text-white shadow-lg transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Orbit & Skyline Brand */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="h-10 px-2.5 py-1 bg-white rounded-xl flex items-center justify-center shadow-md">
            <img
              src={skylineLogoImg}
              alt="Orbit & Skyline"
              className="h-7 w-auto object-contain"
            />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-[#FEFAE0] flex items-center gap-2">
                <span>ORBIT & SKYLINE</span>
                <span className="hidden sm:inline-block text-[10px] px-2.5 py-0.5 rounded-full bg-[#DDA15E]/20 text-[#DDA15E] border border-[#DDA15E]/40 font-mono font-bold uppercase tracking-wider">
                  Master Showcase
                </span>
              </h1>
            </div>
            <p className="text-[10px] text-[#FEFAE0]/70 font-semibold hidden md:block">
              Semiconductor Engineering Capability & Operations Master Portal
            </p>
          </div>
        </div>

        {/* Center/Right: Multi-Company Filter & Presentation Toggle */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {authorizedCompanies.length > 1 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setCompanyMenuOpen(!companyMenuOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#384a24] border border-[#606C38] hover:border-[#DDA15E] text-[#FEFAE0] transition-all shadow-sm cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-[#DDA15E]" />
                <span className="max-w-[120px] sm:max-w-[180px] truncate">
                  {selectedCompany ? selectedCompany.company_name : 'All Authorized Companies'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#FEFAE0]/70" />
              </button>

              {companyMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[#283618] border border-[#606C38] rounded-2xl shadow-2xl z-50 py-1.5 text-xs text-[#FEFAE0]">
                  <div className="px-3.5 py-2 border-b border-[#606C38]/40 text-[10px] font-bold text-[#DDA15E] uppercase tracking-wider">
                    Authorized Workspaces ({authorizedCompanies.length})
                  </div>
                  <button
                    onClick={() => {
                      onSelectCompany('');
                      setCompanyMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-[#384a24] transition-colors ${
                      !selectedCompanyId ? 'text-[#DDA15E] font-bold bg-[#384a24]' : 'text-[#FEFAE0]'
                    }`}
                  >
                    <span>All Authorized Companies</span>
                    {!selectedCompanyId && <CheckCircle2 className="w-3.5 h-3.5 text-[#DDA15E]" />}
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
                        className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-[#384a24] transition-colors ${
                          isSelected ? 'text-[#DDA15E] font-bold bg-[#384a24]' : 'text-[#FEFAE0]'
                        }`}
                      >
                        <span className="truncate">{c.company_name}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#DDA15E]" />}
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
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
              presentationMode
                ? 'bg-[#DDA15E] hover:bg-[#c98e4d] text-[#283618] ring-2 ring-[#FEFAE0]/60'
                : 'bg-[#606C38] hover:bg-[#4f592e] text-[#FEFAE0] border border-[#859450]'
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
              className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-[#384a24] transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-[#606C38] border border-[#DDA15E]/40 text-[#FEFAE0] flex items-center justify-center font-bold text-xs shadow-md">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold text-[#FEFAE0] leading-tight">{user?.name || 'Client Executive'}</span>
                <span className="text-[10px] text-[#DDA15E] font-medium">Executive Portal</span>
              </div>
              <ChevronDown className="w-3 h-3 text-[#FEFAE0]/70 hidden sm:block" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-[#283618] border border-[#606C38] rounded-2xl shadow-2xl z-50 py-1.5 text-xs text-[#FEFAE0]">
                <div className="px-3.5 py-2 border-b border-[#606C38]/40">
                  <p className="font-bold text-[#FEFAE0]">{user?.name}</p>
                  <p className="text-[10px] text-[#FEFAE0]/70 truncate">{user?.email}</p>
                  <span className="inline-block mt-1 text-[9px] px-2 py-0.5 rounded bg-[#DDA15E]/20 text-[#DDA15E] font-mono">
                    Role: {user?.role}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-rose-500/20 text-rose-300 flex items-center space-x-2 font-medium transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
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
