import React from 'react';
import type { ClientWorkforceResponse } from '../../types/client';
import {
  Award,
  Wrench,
} from 'lucide-react';

interface ClientWorkforceSectionProps {
  workforce: ClientWorkforceResponse;
  presentationMode?: boolean;
}

export const ClientWorkforceSection: React.FC<ClientWorkforceSectionProps> = ({
  workforce,
  presentationMode: _presentationMode = false,
}) => {
  const {
    total_engineers = 0,
    active_deployed = 0,
    available_standby = 0,
    on_leave = 0,
    by_competency_level = [],
    top_tools = [],
  } = workforce;

  const deployedPct = total_engineers > 0 ? Math.round((active_deployed / total_engineers) * 100) : 0;
  const availablePct = total_engineers > 0 ? Math.round((available_standby / total_engineers) * 100) : 0;
  const leavePct = total_engineers > 0 ? Math.round((on_leave / total_engineers) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top 3 Capacity Status Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Currently Deployed */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#3B82C4] p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3B82C4]" />
              <span className="text-[#172B4D]">Currently Deployed</span>
            </span>
            <span className="font-mono text-[#3B82C4] font-bold">{deployedPct}%</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#172B4D]">
            {active_deployed} <span className="text-xs font-semibold text-[#64748B]">engineers</span>
          </div>
          <p className="text-[11px] text-[#64748B]">Active on customer fab site assignments</p>
          <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden border border-[#E2E8F0]">
            <div className="bg-[#3B82C4] h-full rounded-full transition-all duration-500" style={{ width: `${deployedPct}%` }} />
          </div>
        </div>

        {/* Available / On Standby */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#2E7D62] p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D62]" />
              <span className="text-[#172B4D]">Available / On Standby</span>
            </span>
            <span className="font-mono text-[#2E7D62] font-bold">{availablePct}%</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#172B4D]">
            {available_standby} <span className="text-xs font-semibold text-[#64748B]">engineers</span>
          </div>
          <p className="text-[11px] text-[#64748B]">Ready for immediate mission deployment</p>
          <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden border border-[#E2E8F0]">
            <div className="bg-[#2E7D62] h-full rounded-full transition-all duration-500" style={{ width: `${availablePct}%` }} />
          </div>
        </div>

        {/* Scheduled Leave / PTO */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#64748B] p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#64748B]" />
              <span className="text-[#172B4D]">Scheduled Leave / PTO</span>
            </span>
            <span className="font-mono text-[#64748B] font-bold">{leavePct}%</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#172B4D]">
            {on_leave} <span className="text-xs font-semibold text-[#64748B]">engineers</span>
          </div>
          <p className="text-[11px] text-[#64748B]">Planned rotation and training leave</p>
          <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden border border-[#E2E8F0]">
            <div className="bg-[#64748B] h-full rounded-full transition-all duration-500" style={{ width: `${leavePct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competency Level Distribution */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#3B82C4]" />
              <span>Engineer Competency Tiers</span>
            </h3>
            <span className="text-xs font-mono font-bold text-[#172B4D] bg-[#F1F5F9] px-2.5 py-1 rounded-md border border-[#E2E8F0]">
              Total: {total_engineers} Engineers
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {by_competency_level.map((lvl, idx) => {
              const pct = total_engineers > 0 ? Math.round((lvl.count / total_engineers) * 100) : 0;
              const barColors = [
                'bg-[#3B82C4]',
                'bg-[#2E7D62]',
                'bg-[#6B9080]',
                'bg-[#172B4D]',
              ];
              const barColor = barColors[idx % barColors.length];

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#172033]">{lvl.level}</span>
                    <span className="font-mono font-bold text-[#172B4D]">
                      {lvl.count} eng <span className="text-[#64748B] font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden border border-[#E2E8F0]">
                    <div className={`${barColor} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Tool Capabilities */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#3B82C4]" />
              <span>Primary Tool Specializations</span>
            </h3>
            <span className="text-xs text-[#64748B] font-medium">Ranked by Talent Pool</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {top_tools.map((t, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#F6F8FB] border border-[#E2E8F0] flex items-center justify-between hover:border-[#3B82C4] hover:bg-white transition-all shadow-2xs"
              >
                <div className="space-y-0.5 truncate mr-2">
                  <span className="text-xs font-bold text-[#172B4D] block truncate">
                    {t.tool_name}
                  </span>
                  <span className="text-[10px] text-[#64748B] font-medium">
                    Semiconductor Tool
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-[#3B82C4] bg-white px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                    {t.engineer_count} eng
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
