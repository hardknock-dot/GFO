import React from 'react';
import type { ClientGeographyResponse } from '../../types/client';
import { WorldMapDistribution } from '../dashboard/WorldMapDistribution';
import { Globe2, MapPin } from 'lucide-react';

interface ClientGeographySectionProps {
  geography: ClientGeographyResponse;
  totalEngineers: number;
  presentationMode?: boolean;
}

export const ClientGeographySection: React.FC<ClientGeographySectionProps> = ({
  geography,
  totalEngineers,
  presentationMode = false,
}) => {
  const { countries = [], countries_count = 0 } = geography;

  // Map to format required by WorldMapDistribution: Array<{ name: string; value: number }>
  const mapData = countries.map((c) => ({
    name: c.name,
    value: c.value,
  }));

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className={`font-black tracking-tight text-[#283618] dark:text-[#FEFAE0] ${presentationMode ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>
            Global Engineering Presence
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium">
            International deployment footprint across semiconductor fab territories
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono font-bold text-[#606C38] dark:text-[#DDA15E] bg-[#FEFAE0] dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-[#E6E2C8] dark:border-slate-700">
            {countries_count} Active Countries Covered
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E2C8] dark:border-slate-800 p-6 shadow-sm space-y-6">
        {/* World Map Component */}
        <div className="w-full">
          <WorldMapDistribution
            data={mapData}
            totalEngineers={totalEngineers}
          />
        </div>

        {/* Country Breakdown Badges */}
        <div className="pt-4 border-t border-[#E6E2C8] dark:border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-stone-500 uppercase tracking-wider">
            <Globe2 className="w-4 h-4 text-[#606C38]" />
            <span>Country Deployment Distribution</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {countries.map((c) => (
              <div
                key={c.code}
                className="p-3 rounded-xl bg-[#FEFAE0]/40 dark:bg-slate-800/50 border border-[#E6E2C8] dark:border-slate-800 flex items-center justify-between hover:bg-[#FEFAE0] dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center space-x-2 truncate">
                  <MapPin className="w-3.5 h-3.5 text-[#606C38] flex-shrink-0" />
                  <span className="text-xs font-bold text-[#283618] dark:text-white truncate">
                    {c.name}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-[#606C38] dark:text-[#DDA15E] bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-[#E6E2C8] dark:border-slate-700 ml-1">
                  {c.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
