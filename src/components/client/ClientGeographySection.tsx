import React from 'react';
import type { ClientGeographyResponse } from '../../types/client';
import { ClientWorldMap } from './ClientWorldMap';
import { Globe2, MapPin } from 'lucide-react';

interface ClientGeographySectionProps {
  geography: ClientGeographyResponse;
  totalEngineers?: number;
  presentationMode?: boolean;
}

export const ClientGeographySection: React.FC<ClientGeographySectionProps> = ({
  geography,
  totalEngineers: _totalEngineers = 0,
  presentationMode: _presentationMode = false,
}) => {
  const { countries = [], countries_count = 0, total_deployments = 0 } = geography;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#172B4D]">
              Global Deployment Map
            </h3>
            <p className="text-xs text-[#64748B]">
              Standardized country-level distribution across international semiconductor fabs
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#172B4D] bg-[#EBF3FB] px-3.5 py-1.5 rounded-xl border border-[#3B82C4]/20 self-start sm:self-auto">
            {countries_count} Active Countries Covered
          </span>
        </div>

        {/* Dedicated Executive World Map */}
        <div className="w-full">
          <ClientWorldMap
            countries={countries}
            totalDeployments={total_deployments}
          />
        </div>

        {/* Country Breakdown Badges */}
        <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#64748B] uppercase tracking-wider">
            <Globe2 className="w-4 h-4 text-[#3B82C4]" />
            <span>Country Deployment Distribution</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {countries.map((c) => (
              <div
                key={c.code}
                className="p-3 rounded-xl bg-[#F6F8FB] border border-[#E2E8F0] flex items-center justify-between hover:border-[#3B82C4] hover:bg-white transition-all shadow-2xs"
              >
                <div className="flex items-center space-x-2 truncate mr-2">
                  <MapPin className="w-3.5 h-3.5 text-[#3B82C4] shrink-0" />
                  <span className="text-xs font-bold text-[#172B4D] truncate">
                    {c.name}
                  </span>
                </div>
                <div className="text-right shrink-0 font-mono">
                  <span className="text-xs font-bold text-[#3B82C4] bg-white px-2 py-0.5 rounded-md border border-[#E2E8F0] block">
                    {c.value} dep
                  </span>
                  <span className="text-[10px] text-[#64748B]">
                    {c.percentage}%
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
