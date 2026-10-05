import React from 'react';
import type { ClientDeploymentsResponse } from '../../types/client';
import {
  Clock,
  CheckCircle2,
  TrendingUp,
  Activity,
  Timer,
} from 'lucide-react';

interface ClientDeploymentSectionProps {
  deployments: ClientDeploymentsResponse;
  presentationMode?: boolean;
}

export const ClientDeploymentSection: React.FC<ClientDeploymentSectionProps> = ({
  deployments,
  presentationMode = false,
}) => {
  const {
    completed_deployments = 0,
    ongoing_deployments = 0,
    average_duration_days = 0,
    longest_deployment_days = 0,
    engineers_with_multiple_deployments = 0,
    deployments_by_year = [],
    duration_buckets = [],
  } = deployments;

  const maxYearDeployments = Math.max(...deployments_by_year.map((y) => y.deployments), 1);

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className={`font-black tracking-tight text-[#283618] dark:text-[#FEFAE0] ${presentationMode ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
            Deployment Experience & Field Execution
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium">
            Historical semiconductor tool installation, startup, maintenance, and duration telemetry
          </p>
        </div>
      </div>

      {/* Top Deployment Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completed Deployments */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E2C8] dark:border-slate-800 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase tracking-wider">
            <span>Completed Missions</span>
            <CheckCircle2 className="w-4 h-4 text-[#606C38]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#283618] dark:text-white">
            {completed_deployments}
          </div>
          <p className="text-[11px] text-stone-400 font-medium">Fully executed project assignments</p>
        </div>

        {/* Ongoing Deployments */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E2C8] dark:border-slate-800 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase tracking-wider">
            <span>Active Deployments</span>
            <Activity className="w-4 h-4 text-[#DDA15E]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#283618] dark:text-white">
            {ongoing_deployments}
          </div>
          <p className="text-[11px] text-stone-400 font-medium">Currently operating on customer fab site</p>
        </div>

        {/* Avg Duration */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E2C8] dark:border-slate-800 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase tracking-wider">
            <span>Average Duration</span>
            <Timer className="w-4 h-4 text-[#BC6C25]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#283618] dark:text-white">
            {average_duration_days} <span className="text-xs font-semibold text-stone-400">days</span>
          </div>
          <p className="text-[11px] text-stone-400 font-medium">Average assignment length per tool</p>
        </div>

        {/* Longest Deployment */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E2C8] dark:border-slate-800 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase tracking-wider">
            <span>Longest Project</span>
            <Clock className="w-4 h-4 text-[#741B21]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#283618] dark:text-white">
            {longest_deployment_days} <span className="text-xs font-semibold text-stone-400">days</span>
          </div>
          <p className="text-[11px] text-stone-400 font-medium">{engineers_with_multiple_deployments} engineers with multi-deployments</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deployments by Year Timeline */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E2C8] dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#283618] dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#606C38]" />
              <span>Historical Deployments by Year</span>
            </h3>
            <span className="text-xs text-stone-400 font-medium">Annual Field Volume</span>
          </div>

          <div className="space-y-4 pt-2">
            {deployments_by_year.map((item) => {
              const barWidth = Math.round((item.deployments / maxYearDeployments) * 100);

              return (
                <div key={item.year} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#283618] dark:text-white font-mono text-sm">
                      {item.year}
                    </span>
                    <div className="space-x-3 text-right font-mono">
                      <span className="font-bold text-[#606C38] dark:text-[#DDA15E]">
                        {item.deployments} {item.deployments === 1 ? 'deployment' : 'deployments'}
                      </span>
                      {item.total_days > 0 && (
                        <span className="text-stone-400 text-[11px]">
                          ({item.total_days.toLocaleString()} days)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-full bg-[#FEFAE0] dark:bg-slate-800 rounded-full h-3 overflow-hidden border border-[#E6E2C8]/50">
                    <div
                      className="bg-gradient-to-r from-[#606C38] to-[#DDA15E] h-full rounded-full transition-all duration-500 shadow-xs"
                      style={{ width: `${Math.max(barWidth, 6)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Duration Buckets Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E2C8] dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#283618] dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#606C38]" />
              <span>Duration Distribution</span>
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            {duration_buckets.map((b, idx) => {
              const bucketColors = [
                'bg-[#8DA7BE]',
                'bg-[#606C38]',
                'bg-[#DDA15E]',
                'bg-[#BC6C25]',
              ];
              const bColor = bucketColors[idx % bucketColors.length];

              return (
                <div key={b.bucket} className="p-3 rounded-xl bg-[#FEFAE0]/40 dark:bg-slate-800/60 border border-[#E6E2C8] dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#283618] dark:text-stone-200">{b.bucket}</span>
                    <span className="font-mono font-bold text-[#283618] dark:text-white">
                      {b.count} ({b.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#E6E2C8]/60 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div className={`${bColor} h-full rounded-full transition-all duration-500`} style={{ width: `${b.percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
