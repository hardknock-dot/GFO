import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { switchCompanyTenant } from '../services/company';
import { Building2, ArrowRight, CheckCircle2, Shield, Sparkles } from 'lucide-react';
import { Button } from '../components/forms/Button';

export const CompanySelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { companies, setCompany, currentCompany } = useCompany();
  const { user, selectCompany } = useAuth();
  const [selectedId, setSelectedId] = useState<string>(currentCompany.id);

  const handleConfirmSelection = async (companyId: string) => {
    setSelectedId(companyId);
    await switchCompanyTenant(companyId);
    setCompany(companyId);
    selectCompany(companyId);
    if (companyId === 'all-data') {
      navigate('/all-data');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden font-sans">
      {/* Soft light blue ambient background accent */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-200/50 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-5xl space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-sky-100 border border-sky-300 text-blue-950 text-xs font-mono font-bold shadow-xs">
            <Building2 className="w-3.5 h-3.5 text-blue-900" />
            <span>Multi-Tenant Access Center</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-blue-950">
            Select Enterprise Tenant Workspace
          </h1>
          <p className="text-sm text-blue-900/80 max-w-xl mx-auto font-semibold">
            Choose an authorized semiconductor equipment manufacturer workspace to load specific theme tokens, field engineers, and fab customer schedules.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
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
            .map((comp) => {
              const isSelected = selectedId === comp.id || selectedId === comp.company_id;
              return (
                <div
                  key={comp.id}
                  onClick={() => handleConfirmSelection(comp.company_id || comp.id)}
                  className={`relative p-6 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between group shadow-sm ${
                    isSelected
                      ? 'bg-sky-200/90 border-blue-600 ring-2 ring-blue-500/40 shadow-md'
                      : 'bg-sky-100/90 border-sky-300 hover:bg-sky-200/70 hover:border-sky-400 hover:shadow-md'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-4 right-4 text-blue-700">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}

                  <div>
                    <div className="w-12 h-12 rounded-xl bg-white border border-sky-300 p-1 flex items-center justify-center mb-4 text-blue-950 font-black font-mono shadow-xs">
                      <span className="text-sm tracking-wider">
                        {comp.code}
                      </span>
                    </div>

                    <h3 className="text-xl font-extrabold text-blue-950 group-hover:text-blue-700 transition-colors">
                      {comp.name}
                    </h3>
                    <p className="text-xs text-blue-900/80 mt-2 leading-relaxed font-semibold">
                      {comp.tagline}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-sky-300/70 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 text-blue-950 font-bold">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>Tenant Active</span>
                    </div>
                    <span className="font-extrabold text-blue-900 group-hover:text-blue-700 group-hover:translate-x-1 transition-all inline-flex items-center">
                      Enter <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </span>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Future Partner Card Indicator */}
        <div className="p-4 rounded-xl border border-sky-300 bg-sky-100/70 text-center flex items-center justify-center space-x-3 text-xs text-blue-950 font-bold">
          <Sparkles className="w-4 h-4 text-blue-700" />
          <span>Need to integrate a new semiconductor equipment partner? Contact Global Admin for onboarding.</span>
        </div>

        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="border-sky-400 bg-white text-blue-950 hover:bg-sky-100 text-xs font-bold shadow-xs"
            icon={<Shield className="w-3.5 h-3.5 text-blue-800" />}
          >
            Continue with Current Workspace ({currentCompany.code})
          </Button>
        </div>
      </div>
    </div>
  );
};
