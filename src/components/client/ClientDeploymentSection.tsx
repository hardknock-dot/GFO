import React from 'react';
import type { ClientDeploymentsResponse } from '../../types/client';
import {
  Clock,
  CheckCircle2,
  TrendingUp,
  Activity,
  Timer,
  Calendar,
} from 'lucide-react';

interface ClientDeploymentSectionProps {
  deployments: ClientDeploymentsResponse;
  presentationMode?: boolean;
}

export const ClientDeploymentSection: React.FC<ClientDeploymentSectionProps> = ({
  deployments,
  presentationMode: _presentationMode = false,
}) => {
  const {
    total_deployments = 0,
    completed_deployments = 0,
    ongoing_deployments = 0,
    future_deployments = 0,
    average_duration_days = 0,
    longest_deployment_days = 0,
    engineers_with_multiple_deployments = 0,
    deployments_by_year = [],
    duration_buckets = [],
  } = deployments;

  const maxYearDeployments = Math.max(...deployments_by_year.map((y) => y.deployments), 1);

  return (
    <div className="space-y-6">
      {/* Top Deployment Metrics: Reconciled Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deployments Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] border-t-3 border-t-[#172B4D] p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold uppercase tracking-wider">
            <span>Total Deployments</span>
            <TrendingUp className="w-4 h-4 text-[#172B4D]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#172B4D]">
            {total_deployments}
          </div>
          <p className="text-[11px] text-[#64748B] font-medium">
            Completed ({completed_deployments}) + Active ({ongoing_deployments}) + Future ({future_deployments})
          </p>
        </div>

        {/* Completed Deployments */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] border-t-3 border-t-[#2E7D62] p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold uppercase tracking-wider">
            <span>Completed Missions</span>
            <CheckCircle2 className="w-4 h-4 text-[#2E7D62]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#2E7D62]">
            {completed_deployments}
          </div>
          <p className="text-[11px] text-[#64748B] font-medium">Fully executed project assignments</p>
        </div>

        {/* Ongoing Deployments */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] border-t-3 border-t-[#3B82C4] p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold uppercase tracking-wider">
            <span>Active Deployments</span>
            <Activity className="w-4 h-4 text-[#3B82C4]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#3B82C4]">
            {ongoing_deployments}
          </div>
          <p className="text-[11px] text-[#64748B] font-medium">Currently on site in fab cleanrooms</p>
        </div>

        {/* Future Deployments */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] border-t-3 border-t-[#6B9080] p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold uppercase tracking-wider">
            <span>Future Scheduled</span>
            <Calendar className="w-4 h-4 text-[#6B9080]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#172B4D]">
            {future_deployments}
          </div>
          <p className="text-[11px] text-[#64748B] font-medium">Confirmed upcoming assignments</p>
        </div>
      </div>

      {/* Duration Metrics & Statistics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Average Mission Duration */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] block">
              Average Deployment Duration
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#172B4D]">
              {average_duration_days} <span className="text-xs font-semibold text-[#64748B]">days</span>
            </div>
            <p className="text-[11px] text-[#64748B]">Calculated from validated deployment telemetry</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#EBF3FB] text-[#3B82C4]">
            <Timer className="w-6 h-6" />
          </div>
        </div>

        {/* Longest Project Assignment */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] block">
              Longest Field Project
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#172B4D]">
              {longest_deployment_days > 0 ? (
                <>
                  {longest_deployment_days} <span className="text-xs font-semibold text-[#64748B]">days</span>
                </>
              ) : (
                'Not available'
              )}
            </div>
            <p className="text-[11px] text-[#64748B]">
              {engineers_with_multiple_deployments} engineers with multiple field missions
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-[#EFF5F3] text-[#2E7D62]">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts / Historical volume & Duration Buckets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deployments by Year Timeline */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#3B82C4]" />
              <span>Historical Deployments by Year</span>
            </h3>
            <span className="text-xs text-[#64748B] font-medium">Reconciled Field Volume</span>
          </div>

          <div className="space-y-4 pt-2">
            {deployments_by_year.map((item) => {
              const barWidth = Math.round((item.deployments / maxYearDeployments) * 100);

              return (
                <div key={item.year} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#172B4D] font-mono text-sm">
                      {item.year}
                    </span>
                    <div className="space-x-3 text-right font-mono">
                      <span className="font-bold text-[#3B82C4]">
                        {item.deployments} {item.deployments === 1 ? 'deployment' : 'deployments'}
                      </span>
                      {item.total_days > 0 && (
                        <span className="text-[#64748B] text-[11px]">
                          ({item.total_days.toLocaleString()} days)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-full bg-[#F1F5F9] rounded-full h-3 overflow-hidden border border-[#E2E8F0]">
                    <div
                      className="bg-[#3B82C4] h-full rounded-full transition-all duration-500 shadow-2xs"
                      style={{ width: `${Math.max(barWidth, 6)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Duration Buckets Breakdown */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#3B82C4]" />
              <span>Duration Distribution</span>
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            {duration_buckets.map((b, idx) => {
              const bucketColors = [
                'bg-[#3B82C4]',
                'bg-[#2E7D62]',
                'bg-[#6B9080]',
                'bg-[#172B4D]',
              ];
              const bColor = bucketColors[idx % bucketColors.length];

              return (
                <div key={b.bucket} className="p-3 rounded-xl bg-[#F6F8FB] border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#172B4D]">{b.bucket}</span>
                    <span className="font-mono font-bold text-[#3B82C4]">
                      {b.count} ({b.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#F1F5F9] rounded-full h-1.5 overflow-hidden border border-[#E2E8F0]">
                    <div className={`${bColor} h-full rounded-full transition-all duration-500`} style={{ width: `${b.percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
