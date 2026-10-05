import React from 'react';
import type { ClientKpiStats } from '../../types/client';
import {
  Building2,
  Users,
  Plane,
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
      subtitle: 'Semiconductor OEMs supported',
      icon: Building2,
      color: 'from-[#8DA7BE] to-[#606C38]',
      textColor: 'text-[#606C38]',
      bgColor: 'bg-[#606C38]/10',
      badgeBg: 'bg-[#FEFAE0]',
    },
    {
      title: 'Engineering Workforce',
      value: kpi.total_engineers,
      subtitle: `${kpi.active_engineers} actively deployed / available`,
      icon: Users,
      color: 'from-[#606C38] to-[#283618]',
      textColor: 'text-[#283618]',
      bgColor: 'bg-[#606C38]/15',
      badgeBg: 'bg-[#FEFAE0]',
    },
    {
      title: 'Total Deployments',
      value: kpi.total_deployments,
      subtitle: 'Field operations & startups',
      icon: Plane,
      color: 'from-[#DDA15E] to-[#BC6C25]',
      textColor: 'text-[#BC6C25]',
      bgColor: 'bg-[#DDA15E]/20',
      badgeBg: 'bg-[#FEFAE0]',
    },
    {
      title: 'Global Countries',
      value: kpi.countries_covered,
      subtitle: 'Active fab territories covered',
      icon: Globe2,
      color: 'from-[#BC6C25] to-[#DDA15E]',
      textColor: 'text-[#BC6C25]',
      bgColor: 'bg-[#BC6C25]/15',
      badgeBg: 'bg-[#FEFAE0]',
    },
    {
      title: 'Total Deployment Days',
      value: kpi.total_deployment_days > 0 ? kpi.total_deployment_days.toLocaleString() : '—',
      subtitle: 'Accumulated field support days',
      icon: Clock,
      color: 'from-[#283618] to-[#606C38]',
      textColor: 'text-[#283618]',
      bgColor: 'bg-[#283618]/10',
      badgeBg: 'bg-[#FEFAE0]',
    },
    {
      title: 'Operational History',
      value: kpi.years_of_history,
      subtitle: kpi.earliest_deployment_year ? `Earliest record: ${kpi.earliest_deployment_year}` : 'Proven track record',
      icon: Award,
      color: 'from-[#741B21] to-[#BC6C25]',
      textColor: 'text-[#741B21]',
      bgColor: 'bg-[#741B21]/10',
      badgeBg: 'bg-[#FEFAE0]',
      isTextValue: true,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`font-black tracking-tight text-[#283618] dark:text-[#FEFAE0] ${presentationMode ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
            Executive Operations Highlights
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium">
            Real-time aggregate engineering strength and deployment capacity backed by Master ORMP records
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E2C8] dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col justify-between ${
                presentationMode ? 'p-6 border-[#606C38]/40 shadow-lg' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  {card.title}
                </span>
                <div className={`p-2 rounded-xl ${card.bgColor} ${card.textColor} shadow-2xs`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className={`font-black tracking-tight text-[#283618] dark:text-white ${
                  card.isTextValue ? 'text-lg sm:text-xl' : presentationMode ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'
                }`}>
                  {card.value}
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium mt-1 leading-snug">
                  {card.subtitle}
                </p>
              </div>

              <div className={`absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r ${card.color}`} />
            </div>
          );
        })}
      </div>
    </section>
  );
};
