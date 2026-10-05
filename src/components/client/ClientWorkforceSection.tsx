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
  presentationMode = false,
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
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className={`font-black tracking-tight text-[#283618] dark:text-[#FEFAE0] ${presentationMode ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
            Engineering Workforce & Talent Depth
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium">
            Specialized field semiconductor engineer capacity, readiness, and technical tier distribution
          </p>
        </div>
      </div>

      {/* Top 3 Capacity Status Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Deployed Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E2C8] dark:border-slate-800 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500 dark:text-stone-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#606C38]" />
              <span className="text-[#283618] dark:text-stone-200">Actively Deployed</span>
            </span>
            <span className="font-mono text-[#606C38] dark:text-[#DDA15E] font-bold">{deployedPct}%</span>
          </div>
          <div className="text-3xl font-black text-[#283618] dark:text-white">
            {active_deployed} <span className="text-xs font-semibold text-stone-400 font-sans">engineers</span>
          </div>
          <div className="w-full bg-[#FEFAE0] dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-[#E6E2C8]/50">
            <div className="bg-[#606C38] h-full rounded-full transition-all duration-500" style={{ width: `${deployedPct}%` }} />
          </div>
        </div>

        {/* Available Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E2C8] dark:border-slate-800 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500 dark:text-stone-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DDA15E]" />
              <span className="text-[#283618] dark:text-stone-200">Available / On Standby</span>
            </span>
            <span className="font-mono text-[#BC6C25] dark:text-[#DDA15E] font-bold">{availablePct}%</span>
          </div>
          <div className="text-3xl font-black text-[#283618] dark:text-white">
            {available_standby} <span className="text-xs font-semibold text-stone-400 font-sans">engineers</span>
          </div>
          <div className="w-full bg-[#FEFAE0] dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-[#E6E2C8]/50">
            <div className="bg-[#DDA15E] h-full rounded-full transition-all duration-500" style={{ width: `${availablePct}%` }} />
          </div>
        </div>

        {/* PTO / Leave Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E2C8] dark:border-slate-800 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500 dark:text-stone-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#BC6C25]" />
              <span className="text-[#283618] dark:text-stone-200">Scheduled Leave / PTO</span>
            </span>
            <span className="font-mono text-[#BC6C25] font-bold">{leavePct}%</span>
          </div>
          <div className="text-3xl font-black text-[#283618] dark:text-white">
            {on_leave} <span className="text-xs font-semibold text-stone-400 font-sans">engineers</span>
          </div>
          <div className="w-full bg-[#FEFAE0] dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-[#E6E2C8]/50">
            <div className="bg-[#BC6C25] h-full rounded-full transition-all duration-500" style={{ width: `${leavePct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competency Level Distribution */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E2C8] dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#283618] dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-[#606C38]" />
              <span>Engineer Competency Tiers</span>
            </h3>
            <span className="text-xs font-mono font-bold text-[#606C38] dark:text-[#DDA15E] bg-[#FEFAE0] dark:bg-slate-800 px-2.5 py-1 rounded-md border border-[#E6E2C8] dark:border-slate-700">
              Total: {total_engineers}
            </span>
          </div>

          <div className="space-y-3">
            {by_competency_level.map((lvl, idx) => {
              const pct = total_engineers > 0 ? Math.round((lvl.count / total_engineers) * 100) : 0;
              const barColors = [
                'bg-[#8DA7BE]',
                'bg-[#606C38]',
                'bg-[#DDA15E]',
                'bg-[#BC6C25]',
                'bg-[#283618]',
              ];
              const barColor = barColors[idx % barColors.length];

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-700 dark:text-stone-300">{lvl.level}</span>
                    <span className="font-mono font-bold text-[#283618] dark:text-white">
                      {lvl.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#FEFAE0] dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-[#E6E2C8]/50">
                    <div className={`${barColor} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Tool Capabilities */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E2C8] dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#283618] dark:text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#606C38]" />
              <span>Primary Tool Specializations</span>
            </h3>
            <span className="text-xs text-stone-400 font-semibold">Ranked by Talent Pool</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {top_tools.map((t, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#FEFAE0]/50 dark:bg-slate-800/60 border border-[#E6E2C8] dark:border-slate-800 flex items-center justify-between hover:bg-[#FEFAE0] dark:hover:bg-slate-800 transition-colors"
              >
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#283618] dark:text-stone-200 block truncate">
                    {t.tool_name}
                  </span>
                  <span className="text-[10px] text-stone-400 font-medium">
                    Semiconductor Tool
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black font-mono text-[#606C38] dark:text-[#DDA15E] bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-[#E6E2C8] dark:border-slate-700">
                    {t.engineer_count} eng
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
