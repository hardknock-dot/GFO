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
  const { selectCompany } = useAuth();
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
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden font-sans">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-4xl space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-mono">
            <Building2 className="w-3.5 h-3.5" />
            <span>Multi-Tenant Access Center</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Select Enterprise Tenant Workspace
          </h1>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Choose an authorized semiconductor equipment manufacturer workspace to load specific theme tokens, field engineers, and fab customer schedules.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {companies.map((comp) => {
            const isSelected = selectedId === comp.id;
            return (
              <div
                key={comp.id}
                onClick={() => handleConfirmSelection(comp.id)}
                className={`relative p-6 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-slate-900 border-white shadow-xl shadow-white/5 ring-2 ring-white/20'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-4 right-4 text-white">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}

                <div>
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 p-1 flex items-center justify-center mb-4 overflow-hidden">
                    <span className="font-black text-base text-white font-mono tracking-wider">
                      {comp.code}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-white transition-colors">
                    {comp.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{comp.tagline}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-400">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: comp.accentColor }} />
                    <span>Tenant Active</span>
                  </div>
                  <span className="font-semibold text-white group-hover:translate-x-1 transition-transform inline-flex items-center">
                    Enter <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Future Expansion Card Indicator */}
        <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-center flex items-center justify-center space-x-3 text-xs text-slate-500">
          <Sparkles className="w-4 h-4 text-slate-400" />
          <span>Need to integrate a new semiconductor equipment partner? Contact Global Admin for onboarding.</span>
        </div>

        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 text-xs"
            icon={<Shield className="w-3.5 h-3.5" />}
          >
            Continue with Current Workspace ({currentCompany.code})
          </Button>
        </div>
      </div>
    </div>
  );
};
