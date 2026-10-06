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
  presentationMode: _presentationMode = false,
}) => {
  const { processes = [], ion_tools = [] } = expertise;
  const [selectedProcess, setSelectedProcess] = useState<string>(processes[0]?.process_name || 'Etch');

  const activeProcessData = processes.find((p) => p.process_name === selectedProcess) || processes[0];

  return (
    <div className="space-y-6">
      {/* Process & Product Taxonomy Showcase */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center space-x-2.5">
            <Layers className="w-5 h-5 text-[#3B82C4]" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#172B4D]">
                Process Taxonomy & Equipment Families
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Process Domain &rarr; Product Family &rarr; Specific Tool Models
              </p>
            </div>
          </div>

          {/* Process Category Tabs */}
          <div className="flex items-center space-x-1.5 p-1 bg-[#F6F8FB] rounded-xl border border-[#E2E8F0] overflow-x-auto">
            {processes.map((proc) => {
              const isSelected = selectedProcess === proc.process_name;
              return (
                <button
                  key={proc.process_name}
                  onClick={() => setSelectedProcess(proc.process_name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-[#172B4D] text-white shadow-xs'
                      : 'text-[#64748B] hover:text-[#172B4D] hover:bg-white'
                  }`}
                >
                  <span>{proc.process_name}</span>
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-[#3B82C4] text-white' : 'bg-[#E2E8F0] text-[#172B4D]'
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
                className="p-4 rounded-xl bg-[#F6F8FB] border border-[#E2E8F0] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-[#172B4D] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#3B82C4]" />
                    <span>{family.family_name}</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#3B82C4] bg-white px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                    {family.total_engineers} certified
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {family.products.map((prod, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#E2E8F0] text-xs shadow-2xs"
                    >
                      <span className="font-semibold text-[#172033]">
                        {prod.product_name}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-[#2E7D62]">
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
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-4">
            <div className="flex items-center space-x-2.5">
              <Cpu className="w-5 h-5 text-[#3B82C4]" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#172B4D]">
                  Axcelis Technologies & Purion Ion Implantation Matrix
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  Certified Ion Implant tool series (Purion XE, H2/H3/H5, M-Series, Optima)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#172B4D] bg-[#F1F5F9] px-3 py-1 rounded-xl border border-[#E2E8F0]">
              <Award className="w-3.5 h-3.5 text-[#3B82C4]" />
              <span>ION Certified Tool Matrix</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {ion_tools.map((tool, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#F6F8FB] border border-[#E2E8F0] hover:border-[#3B82C4] hover:bg-white transition-all flex flex-col justify-between space-y-2 group shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#172B4D] group-hover:text-[#3B82C4] transition-colors">
                      {tool.tool_name}
                    </span>
                    <span className="text-xs font-black font-mono text-[#3B82C4] bg-white px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                      {tool.engineer_count} eng
                    </span>
                  </div>
                  {tool.series && (
                    <span className="text-[10px] text-[#64748B] font-medium block mt-0.5">
                      Series: {tool.series}
                    </span>
                  )}
                </div>

                {/* Level Breakdown Pills */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {Object.entries(tool.level_counts).map(([lvl, cnt]) => (
                    <span
                      key={lvl}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-white text-[#64748B] border border-[#E2E8F0]"
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
    </div>
  );
};
