import React from 'react';
import type { ClientCompanyShowcaseItem } from '../../types/client';
import {
  Calendar,
  ArrowRight,
  Wrench,
  Globe2,
  Info,
  CheckCircle2,
} from 'lucide-react';
import lamLogoImg from '../../assets/OIP.webp';
import axcelisLogoImg from '../../assets/Axcelis_Technologies-Logo.wine.png';
import vishayLogoImg from '../../assets/vishay-logo-approved.avif';

interface ClientCompanyShowcaseProps {
  companies: ClientCompanyShowcaseItem[];
  onSelectCompany: (company: ClientCompanyShowcaseItem) => void;
  presentationMode?: boolean;
}

export const ClientCompanyShowcase: React.FC<ClientCompanyShowcaseProps> = ({
  companies = [],
  onSelectCompany,
  presentationMode = false,
}) => {
  const getCompanyLogo = (comp: ClientCompanyShowcaseItem) => {
    const name = (comp.company_name || comp.short_name || '').toLowerCase();
    if (name.includes('lam')) return lamLogoImg;
    if (name.includes('axcelis') || name.includes('axc')) return axcelisLogoImg;
    if (name.includes('vishay')) return vishayLogoImg;
    return comp.logo || lamLogoImg;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {companies.map((comp) => {
          const logoSrc = getCompanyLogo(comp);
          const hasOperationalData = comp.engineer_count > 0 || comp.deployment_count > 0;

          return (
            <div
              key={comp.company_id}
              className={`bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs hover:shadow-lg hover:border-[#3B82C4] transition-all duration-300 flex flex-col justify-between group relative ${
                presentationMode ? 'shadow-md border-[#CBD5E1]' : ''
              }`}
            >
              <div className="space-y-4">
                {/* Header: Logo & Status Badge */}
                <div className="flex items-center justify-between gap-3">
                  <div className="h-12 w-32 bg-white rounded-xl p-1.5 flex items-center justify-center border border-[#E2E8F0] shadow-2xs group-hover:scale-102 transition-transform">
                    <img
                      src={logoSrc}
                      alt={comp.company_name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#EAF5F0] text-[#2E7D62] text-[11px] font-bold border border-[#2E7D62]/20">
                    <CheckCircle2 className="w-3 h-3 text-[#2E7D62]" />
                    <span>Active OEM</span>
                  </div>
                </div>

                {/* Company Name & Tagline */}
                <div>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#172B4D] group-hover:text-[#3B82C4] transition-colors">
                    {comp.company_name}
                  </h3>
                  <p className="text-xs text-[#64748B] font-medium mt-1 line-clamp-2">
                    {comp.tagline}
                  </p>
                </div>

                {/* Operational Data Stats or Pending Notice */}
                {hasOperationalData ? (
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#F6F8FB] border border-[#E2E8F0]">
                    <div className="text-center space-y-0.5">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                        Engineers
                      </span>
                      <span className="text-sm sm:text-base font-black text-[#172B4D]">
                        {comp.engineer_count}
                      </span>
                    </div>
                    <div className="text-center space-y-0.5 border-x border-[#E2E8F0]">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                        Deployments
                      </span>
                      <span className="text-sm sm:text-base font-black text-[#3B82C4]">
                        {comp.deployment_count}
                      </span>
                    </div>
                    <div className="text-center space-y-0.5">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                        Countries
                      </span>
                      <span className="text-sm sm:text-base font-black text-[#6B9080]">
                        {comp.countries_count}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[#F6F8FB] border border-[#E2E8F0] flex items-center space-x-2.5 text-xs text-[#64748B]">
                    <Info className="w-4 h-4 text-[#3B82C4] shrink-0" />
                    <div>
                      <span className="font-semibold text-[#172B4D] block">Operational data not yet available</span>
                      <span className="text-[11px] text-[#64748B]">New partner program onboarding</span>
                    </div>
                  </div>
                )}

                {/* Operational Horizon */}
                <div className="flex items-center space-x-2 text-xs text-[#64748B] pt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-[#3B82C4]" />
                  <span>
                    Operational Track:{' '}
                    <strong className="text-[#172B4D] font-semibold">
                      {comp.operational_period || 'Active Partnership'}
                    </strong>
                  </span>
                </div>

                {/* Tool Pills */}
                {comp.top_tools.length > 0 && (
                  <div className="space-y-1.5 pt-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1">
                      <Wrench className="w-3 h-3 text-[#3B82C4]" /> Key Platform Tools:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {comp.top_tools.slice(0, 4).map((tool, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#EBF3FB] text-[#172B4D] border border-[#3B82C4]/20"
                        >
                          {tool}
                        </span>
                      ))}
                      {comp.top_tools.length > 4 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-[#64748B]">
                          +{comp.top_tools.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {comp.countries && comp.countries.length > 0 && (
                  <div className="flex items-center space-x-1.5 text-[11px] text-[#64748B]">
                    <Globe2 className="w-3 h-3 text-[#6B9080]" />
                    <span className="truncate">Territories: {comp.countries.slice(0, 3).join(', ')}{comp.countries.length > 3 ? ` +${comp.countries.length - 3}` : ''}</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-4 mt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#64748B] group-hover:text-[#172B4D] transition-colors">
                  Program Capabilities
                </span>
                <button
                  type="button"
                  onClick={() => onSelectCompany(comp)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#172B4D] hover:bg-[#3B82C4] text-white text-xs font-bold transition-all shadow-xs cursor-pointer group-hover:translate-x-0.5"
                >
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
