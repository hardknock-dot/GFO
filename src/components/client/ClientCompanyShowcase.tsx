import React from 'react';
import type { ClientCompanyShowcaseItem } from '../../types/client';
import {
  Calendar,
  ArrowRight,
  Wrench,
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
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className={`font-black tracking-tight text-[#283618] dark:text-[#FEFAE0] ${presentationMode ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
            Companies & Operations
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium">
            Dedicated semiconductor manufacturing equipment programs supported by Orbit & Skyline
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {companies.map((comp) => {
          const logoSrc = getCompanyLogo(comp);

          return (
            <div
              key={comp.company_id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E2C8] dark:border-slate-800 p-6 shadow-sm hover:shadow-xl hover:border-[#606C38] dark:hover:border-[#DDA15E] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden ${
                presentationMode ? 'border-[#606C38]/40 shadow-lg' : ''
              }`}
            >
              <div className="space-y-4">
                {/* Logo & Status Badge */}
                <div className="flex items-center justify-between gap-3">
                  <div className="h-12 w-32 bg-white rounded-xl p-1.5 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-2xs group-hover:scale-105 transition-transform duration-200">
                    <img
                      src={logoSrc}
                      alt={comp.company_name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#606C38]/10 text-[#606C38] dark:text-[#DDA15E] text-[10px] font-mono font-bold border border-[#606C38]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#606C38] animate-pulse" />
                    <span>Active OEM</span>
                  </div>
                </div>

                {/* Company Name & Tagline */}
                <div>
                  <h3 className="text-lg font-black tracking-tight text-[#283618] dark:text-white group-hover:text-[#606C38] dark:group-hover:text-[#DDA15E] transition-colors">
                    {comp.company_name}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-semibold mt-1 line-clamp-2">
                    {comp.tagline}
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#FEFAE0]/40 dark:bg-slate-800/60 border border-[#E6E2C8]/60 dark:border-slate-800">
                  <div className="text-center space-y-0.5">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                      Engineers
                    </span>
                    <span className="text-sm font-black text-[#283618] dark:text-white">
                      {comp.engineer_count}
                    </span>
                  </div>
                  <div className="text-center space-y-0.5 border-x border-[#E6E2C8] dark:border-slate-700">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                      Deployments
                    </span>
                    <span className="text-sm font-black text-[#606C38] dark:text-[#DDA15E]">
                      {comp.deployment_count}
                    </span>
                  </div>
                  <div className="text-center space-y-0.5">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                      Countries
                    </span>
                    <span className="text-sm font-black text-[#BC6C25] dark:text-white">
                      {comp.countries_count}
                    </span>
                  </div>
                </div>

                {/* Operational Horizon */}
                <div className="flex items-center space-x-2 text-xs text-stone-500 dark:text-stone-400 pt-1">
                  <Calendar className="w-3.5 h-3.5 text-[#606C38]" />
                  <span>Operational Track: <strong className="text-stone-700 dark:text-stone-200">{comp.operational_period}</strong></span>
                </div>

                {/* Tool Pills */}
                {comp.top_tools.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                      <Wrench className="w-3 h-3 text-[#606C38]" /> Key Platform Tools:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {comp.top_tools.slice(0, 4).map((tool, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white dark:bg-slate-800 text-[#283618] dark:text-stone-200 border border-[#E6E2C8] dark:border-slate-700 shadow-2xs"
                        >
                          {tool}
                        </span>
                      ))}
                      {comp.top_tools.length > 4 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-stone-400">
                          +{comp.top_tools.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-5 mt-4 border-t border-[#E6E2C8]/80 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-stone-400 group-hover:text-[#606C38] transition-colors">
                  View Program Capabilities
                </span>
                <button
                  type="button"
                  onClick={() => onSelectCompany(comp)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#606C38] hover:bg-[#4f592e] text-[#FEFAE0] text-xs font-bold transition-all shadow-xs cursor-pointer group-hover:translate-x-1"
                >
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
