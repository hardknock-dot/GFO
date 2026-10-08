import React from 'react';
import type { ClientCompanyDetailResponse } from '../../types/client';
import {
  X,
  Globe2,
  Calendar,
  Wrench,
  CheckCircle2,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172B4D]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white border border-[#E2E8F0] rounded-3xl shadow-2xl overflow-y-auto p-6 sm:p-8 space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-[#64748B] hover:text-[#172B4D] hover:bg-[#F6F8FB] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#3B82C4] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#64748B] font-semibold">Loading company capability details...</p>
          </div>
        ) : !company ? (
          <div className="py-20 text-center text-[#64748B] text-xs">
            Company information not available.
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-[#E2E8F0]">
              <div className="h-16 w-36 bg-white rounded-2xl p-2 flex items-center justify-center border border-[#E2E8F0] shadow-xs">
                <img
                  src={getCompanyLogo()}
                  alt={company.company_name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-[#172B4D]">
                    {company.company_name}
                  </h2>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                    (company.program_status || '').includes('OEM')
                      ? 'bg-[#EAF5F0] text-[#2E7D62] border-[#2E7D62]/20'
                      : (company.program_status || '').includes('Active')
                      ? 'bg-[#EBF3FB] text-[#3B82C4] border-[#3B82C4]/20'
                      : 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]'
                  }`}>
                    <CheckCircle2 className="w-3 h-3" />
                    {company.program_status || 'Active Partner'}
                  </span>
                </div>
                <p className="text-xs font-medium text-[#64748B]">
                  {company.tagline}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-[#64748B] pt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-[#3B82C4]" />
                  <span>Operational Track: <strong className="text-[#172B4D]">{company.operational_period}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick KPI Overview Grid */}
            {kpi && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#F6F8FB] border border-[#E2E8F0] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#64748B]">Engineers</span>
                  <div className="text-xl font-black text-[#172B4D]">{kpi.total_engineers}</div>
                  <span className="text-[10px] text-[#64748B]">{kpi.active_engineers} actively deployed</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F6F8FB] border border-[#E2E8F0] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#64748B]">Deployments</span>
                  <div className="text-xl font-black text-[#3B82C4]">{kpi.total_deployments}</div>
                  <span className="text-[10px] text-[#64748B]">Field startup & support</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F6F8FB] border border-[#E2E8F0] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#64748B]">Territories</span>
                  <div className="text-xl font-black text-[#6B9080]">{kpi.countries_covered}</div>
                  <span className="text-[10px] text-[#64748B]">Global fab locations</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F6F8FB] border border-[#E2E8F0] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#64748B]">Field Days</span>
                  <div className="text-xl font-black text-[#172B4D]">
                    {kpi.total_deployment_days > 0 ? kpi.total_deployment_days.toLocaleString() : '—'}
                  </div>
                  <span className="text-[10px] text-[#64748B]">Total days on site</span>
                </div>
              </div>
            )}

            {/* Countries & Tool Capabilities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F6F8FB] space-y-3">
                <span className="text-xs font-bold uppercase text-[#172B4D] flex items-center gap-1.5">
                  <Globe2 className="w-4 h-4 text-[#3B82C4]" />
                  <span>Deployment Territories ({company.countries.length})</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {company.countries.length > 0 ? (
                    company.countries.map((c, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-white text-[#172033] border border-[#E2E8F0] text-xs font-semibold shadow-2xs"
                      >
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#64748B]">Global deployment program pending</span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F6F8FB] space-y-3">
                <span className="text-xs font-bold uppercase text-[#172B4D] flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-[#3B82C4]" />
                  <span>Specialized Tool Models</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {company.top_tools.length > 0 ? (
                    company.top_tools.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-white text-[#3B82C4] border border-[#E2E8F0] text-xs font-mono font-bold shadow-2xs"
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#64748B]">Tool model qualifications pending</span>
                  )}
                </div>
              </div>
            </div>

            {/* Competency Level Breakdown */}
            {workforce && workforce.by_competency_level.length > 0 && (
              <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F6F8FB] space-y-3">
                <span className="text-xs font-bold uppercase text-[#172B4D]">
                  Workforce Competency Breakdown
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {workforce.by_competency_level.map((lvl) => (
                    <div key={lvl.level} className="p-2.5 rounded-lg bg-white text-center border border-[#E2E8F0] shadow-2xs">
                      <span className="text-[10px] text-[#64748B] block truncate">{lvl.level}</span>
                      <span className="text-sm font-black text-[#172B4D]">{lvl.count} eng</span>
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
