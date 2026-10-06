import React from 'react';
import type { ClientKpiStats } from '../../types/client';
import {
  Building2,
  Users,
  Briefcase,
  Globe2,
  Clock,
  Award,
} from 'lucide-react';

interface ClientKpiSectionProps {
  kpi: ClientKpiStats;
  presentationMode?: boolean;
}

export const ClientKpiSection: React.FC<ClientKpiSectionProps> = ({ kpi, presentationMode = false }) => {
  const cards = [
    {
      title: 'Partner Companies',
      value: kpi.companies_served,
      explanation: 'Semiconductor OEMs supported',
      icon: Building2,
      iconColor: 'text-[#3B82C4]',
      iconBg: 'bg-[#EBF3FB]',
      accentColor: 'border-b-[#3B82C4]',
    },
    {
      title: 'Engineering Workforce',
      value: kpi.total_engineers,
      explanation: `${kpi.active_engineers} deployed, ${kpi.total_engineers - kpi.active_engineers} standby`,
      icon: Users,
      iconColor: 'text-[#2E7D62]',
      iconBg: 'bg-[#EAF5F0]',
      accentColor: 'border-b-[#2E7D62]',
    },
    {
      title: 'Total Deployments',
      value: kpi.total_deployments,
      explanation: 'Field operations & startups',
      icon: Briefcase,
      iconColor: 'text-[#3B82C4]',
      iconBg: 'bg-[#EBF3FB]',
      accentColor: 'border-b-[#3B82C4]',
    },
    {
      title: 'Global Countries',
      value: kpi.countries_covered,
      explanation: 'Active fab territories covered',
      icon: Globe2,
      iconColor: 'text-[#6B9080]',
      iconBg: 'bg-[#EFF5F3]',
      accentColor: 'border-b-[#6B9080]',
    },
    {
      title: 'Deployment Days',
      value: kpi.total_deployment_days > 0 ? kpi.total_deployment_days.toLocaleString() : '—',
      explanation: 'Accumulated field support days',
      icon: Clock,
      iconColor: 'text-[#172B4D]',
      iconBg: 'bg-[#F1F5F9]',
      accentColor: 'border-b-[#172B4D]',
    },
    {
      title: 'Operational History',
      value: kpi.years_of_history,
      explanation: kpi.earliest_deployment_year ? `Earliest record: ${kpi.earliest_deployment_year}` : 'Proven field track record',
      icon: Award,
      iconColor: 'text-[#D97706]',
      iconBg: 'bg-[#FEF3C7]',
      accentColor: 'border-b-[#D97706]',
      isTextValue: true,
    },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`bg-white rounded-2xl border border-[#E2E8F0] ${card.accentColor} border-b-2 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[140px] ${
                presentationMode ? 'p-6 shadow-sm' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  {card.title}
                </span>
                <div className={`p-2 rounded-xl ${card.iconBg} ${card.iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div
                  className={`font-black tracking-tight text-[#172B4D] ${
                    card.isTextValue
                      ? 'text-base sm:text-lg leading-tight'
                      : presentationMode
                      ? 'text-3xl sm:text-4xl'
                      : 'text-2xl sm:text-3xl'
                  }`}
                >
                  {card.value}
                </div>
                <p className="text-[11px] text-[#64748B] font-medium mt-1 leading-snug line-clamp-2">
                  {card.explanation}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
