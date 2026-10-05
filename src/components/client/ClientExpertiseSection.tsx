import React, { useState } from 'react';
import type { ClientExpertiseResponse } from '../../types/client';
import {
  Layers,
  Cpu,
  Sparkles,
  Award,
} from 'lucide-react';

interface ClientExpertiseSectionProps {
  expertise: ClientExpertiseResponse;
  presentationMode?: boolean;
}

export const ClientExpertiseSection: React.FC<ClientExpertiseSectionProps> = ({
  expertise,
  presentationMode = false,
}) => {
  const { processes = [], ion_tools = [] } = expertise;
  const [selectedProcess, setSelectedProcess] = useState<string>(processes[0]?.process_name || 'Etch');

  const activeProcessData = processes.find((p) => p.process_name === selectedProcess) || processes[0];

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className={`font-black tracking-tight text-[#283618] dark:text-[#FEFAE0] ${presentationMode ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
            Technology & Tool Expertise
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium">
            Standardized semiconductor equipment taxonomy and tool certification matrix
          </p>
        </div>
      </div>

      {/* LAM Process & Product Taxonomy Showcase */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E2C8] dark:border-slate-800 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E2C8] dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#606C38]" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#283618] dark:text-white">
                Process Taxonomy (Lam Research & Advanced Etch/Dep)
              </h3>
              <p className="text-[11px] text-stone-400">
                Process Domain &rarr; Product Family &rarr; Specific Tool Models
              </p>
            </div>
          </div>

          {/* Process Category Tabs */}
          <div className="flex items-center space-x-1.5 p-1 bg-[#FEFAE0] dark:bg-slate-800 rounded-xl border border-[#E6E2C8] dark:border-slate-700 overflow-x-auto">
            {processes.map((proc) => {
              const isSelected = selectedProcess === proc.process_name;
              return (
                <button
                  key={proc.process_name}
                  onClick={() => setSelectedProcess(proc.process_name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-[#606C38] text-[#FEFAE0] shadow-sm'
                      : 'text-stone-600 dark:text-stone-300 hover:text-[#283618] hover:bg-white/80 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{proc.process_name}</span>
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-[#283618] text-[#FEFAE0]' : 'bg-[#E6E2C8] text-[#283618]'
                  }`}>
                    {proc.total_engineers}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Families within Selected Process */}
        {activeProcessData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProcessData.families.map((family) => (
              <div
                key={family.family_name}
                className="p-4 rounded-xl bg-[#FEFAE0]/40 dark:bg-slate-800/40 border border-[#E6E2C8] dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-[#283618] dark:text-[#FEFAE0] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#DDA15E]" />
                    <span>{family.family_name}</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#606C38] dark:text-[#DDA15E] bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-[#E6E2C8] dark:border-slate-700">
                    {family.total_engineers} certified
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {family.products.map((prod, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-[#E6E2C8]/70 dark:border-slate-800 text-xs"
                    >
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        {prod.product_name}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-[#606C38] dark:text-[#DDA15E]">
                        {prod.engineer_count} eng
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Axcelis Ion Skill & Experience Platform Matrix */}
      {ion_tools.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E2C8] dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6E2C8] dark:border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-[#BC6C25]" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#283618] dark:text-white">
                  Axcelis Technologies & Purion Ion Implantation Matrix
                </h3>
                <p className="text-[11px] text-stone-400">
                  Certified Ion Implant tool series (Purion XE, H2/H3/H5, M-Series, Optima)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#BC6C25] bg-[#FEFAE0] dark:bg-slate-800 px-3 py-1 rounded-xl border border-[#E6E2C8] dark:border-slate-700">
              <Award className="w-3.5 h-3.5" />
              <span>ION Certified Tool Matrix</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {ion_tools.map((tool, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#FEFAE0]/30 dark:bg-slate-800/40 border border-[#E6E2C8] dark:border-slate-800 hover:border-[#606C38] dark:hover:border-[#DDA15E] transition-all flex flex-col justify-between space-y-2 group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#283618] dark:text-white group-hover:text-[#606C38] dark:group-hover:text-[#DDA15E] transition-colors">
                      {tool.tool_name}
                    </span>
                    <span className="text-xs font-black font-mono text-[#606C38] dark:text-[#DDA15E] bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-[#E6E2C8] dark:border-slate-700">
                      {tool.engineer_count} eng
                    </span>
                  </div>
                  {tool.series && (
                    <span className="text-[10px] text-stone-400 font-medium block mt-0.5">
                      Series: {tool.series}
                    </span>
                  )}
                </div>

                {/* Level Breakdown Pills */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {Object.entries(tool.level_counts).map(([lvl, cnt]) => (
                    <span
                      key={lvl}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white dark:bg-slate-900 text-stone-600 dark:text-stone-300 border border-[#E6E2C8] dark:border-slate-700"
                    >
                      {lvl}: {cnt}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
