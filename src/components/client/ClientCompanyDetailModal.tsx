import React from 'react';
import type { ClientCompanyDetailResponse } from '../../types/client';
import {
  X,
  Globe2,
  Calendar,
  Wrench,
} from 'lucide-react';
import lamLogoImg from '../../assets/OIP.webp';
import axcelisLogoImg from '../../assets/Axcelis_Technologies-Logo.wine.png';
import vishayLogoImg from '../../assets/vishay-logo-approved.avif';

interface ClientCompanyDetailModalProps {
  data: ClientCompanyDetailResponse | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

export const ClientCompanyDetailModal: React.FC<ClientCompanyDetailModalProps> = ({
  data,
  isOpen,
  onClose,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const company = data?.company;
  const kpi = data?.kpi;
  const workforce = data?.workforce;

  const getCompanyLogo = () => {
    if (!company) return lamLogoImg;
    const name = (company.company_name || company.short_name || '').toLowerCase();
    if (name.includes('lam')) return lamLogoImg;
    if (name.includes('axcelis') || name.includes('axc')) return axcelisLogoImg;
    if (name.includes('vishay')) return vishayLogoImg;
    return company.logo || lamLogoImg;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-[#E6E2C8] dark:border-slate-800 rounded-3xl shadow-2xl overflow-y-auto p-6 sm:p-8 space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-stone-400 hover:text-[#283618] dark:hover:text-white hover:bg-[#FEFAE0] dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#606C38] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-stone-400 font-semibold">Loading company capability details...</p>
          </div>
        ) : !company ? (
          <div className="py-20 text-center text-stone-400 text-xs">
            Company information not available.
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-[#E6E2C8] dark:border-slate-800">
              <div className="h-16 w-36 bg-white rounded-2xl p-2 flex items-center justify-center border border-[#E6E2C8] dark:border-slate-800 shadow-sm">
                <img
                  src={getCompanyLogo()}
                  alt={company.company_name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-[#283618] dark:text-white">
                    {company.company_name}
                  </h2>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#606C38]/10 text-[#606C38] dark:text-[#DDA15E] font-mono font-bold border border-[#606C38]/20">
                    Active Partner
                  </span>
                </div>
                <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                  {company.tagline}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-stone-400 pt-1">
                  <Calendar className="w-3.5 h-3.5 text-[#606C38]" />
                  <span>Operational Track: <strong>{company.operational_period}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick KPI Overview Grid */}
            {kpi && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#FEFAE0]/40 dark:bg-slate-800/60 border border-[#E6E2C8] dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-stone-400">Engineers</span>
                  <div className="text-xl font-black text-[#283618] dark:text-white">{kpi.total_engineers}</div>
                  <span className="text-[10px] text-stone-400">{kpi.active_engineers} actively deployed</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FEFAE0]/40 dark:bg-slate-800/60 border border-[#E6E2C8] dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-stone-400">Deployments</span>
                  <div className="text-xl font-black text-[#606C38] dark:text-[#DDA15E]">{kpi.total_deployments}</div>
                  <span className="text-[10px] text-stone-400">Field startup & support</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FEFAE0]/40 dark:bg-slate-800/60 border border-[#E6E2C8] dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-stone-400">Territories</span>
                  <div className="text-xl font-black text-[#BC6C25] dark:text-white">{kpi.countries_covered}</div>
                  <span className="text-[10px] text-stone-400">Global fab locations</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FEFAE0]/40 dark:bg-slate-800/60 border border-[#E6E2C8] dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-stone-400">Field Days</span>
                  <div className="text-xl font-black text-[#283618] dark:text-white">
                    {kpi.total_deployment_days > 0 ? kpi.total_deployment_days.toLocaleString() : '—'}
                  </div>
                  <span className="text-[10px] text-stone-400">Total days on site</span>
                </div>
              </div>
            )}

            {/* Countries & Tool Capabilities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-[#E6E2C8] dark:border-slate-800 bg-[#FEFAE0]/30 dark:bg-slate-800/40 space-y-3">
                <span className="text-xs font-bold uppercase text-[#283618] dark:text-white flex items-center gap-1.5">
                  <Globe2 className="w-4 h-4 text-[#606C38]" />
                  <span>Deployment Territories ({company.countries.length})</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {company.countries.map((c, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-[#283618] dark:text-stone-200 border border-[#E6E2C8] dark:border-slate-700 text-xs font-semibold"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#E6E2C8] dark:border-slate-800 bg-[#FEFAE0]/30 dark:bg-slate-800/40 space-y-3">
                <span className="text-xs font-bold uppercase text-[#283618] dark:text-white flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-[#606C38]" />
                  <span>Specialized Tool Models</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {company.top_tools.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-[#606C38] dark:text-[#DDA15E] border border-[#E6E2C8] dark:border-slate-700 text-xs font-mono font-bold"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Competency Level Breakdown */}
            {workforce && workforce.by_competency_level.length > 0 && (
              <div className="p-4 rounded-xl border border-[#E6E2C8] dark:border-slate-800 bg-[#FEFAE0]/30 dark:bg-slate-800/40 space-y-3">
                <span className="text-xs font-bold uppercase text-[#283618] dark:text-white">
                  Workforce Competency Breakdown
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {workforce.by_competency_level.map((lvl) => (
                    <div key={lvl.level} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 text-center border border-[#E6E2C8] dark:border-slate-800">
                      <span className="text-[10px] text-stone-400 block truncate">{lvl.level}</span>
                      <span className="text-sm font-black text-[#283618] dark:text-white">{lvl.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
