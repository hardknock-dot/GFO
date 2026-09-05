import React, { useState } from 'react';
import { useCompany } from '../../context/CompanyContext';
import { normalizeCountryName } from '../../utils/countryNormalization';
import { WORLD_MAP_PATHS, WORLD_MAP_VIEWBOX, type CountrySvgPath } from './worldMapSvgData';
import type { CountryDistributionItem } from '../../types';
import { Globe, MapPin } from 'lucide-react';

interface WorldMapDistributionProps {
  data: CountryDistributionItem[];
  totalEngineers: number;
  className?: string;
}

export const WorldMapDistribution: React.FC<WorldMapDistributionProps> = ({
  data = [],
  totalEngineers = 0,
  className = '',
}) => {
  const { currentCompany } = useCompany();
  const [hoveredCountry, setHoveredCountry] = useState<{
    name: string;
    code: string;
    count: number;
    pct: number;
    x: number;
    y: number;
  } | null>(null);

  // 1. Build lookup dictionary of normalized country counts
  const countryCounts: Record<string, { name: string; count: number; code: string }> = {};
  const codeToCount: Record<string, { name: string; count: number; code: string }> = {};
  let computedTotal = 0;

  data.forEach((item) => {
    if (!item.name || item.value <= 0) return;
    const norm = normalizeCountryName(item.name);
    const existing = countryCounts[norm.code] || { name: norm.name, count: 0, code: norm.code };
    existing.count += item.value;
    countryCounts[norm.code] = existing;

    // Index by various representations
    codeToCount[norm.code.toLowerCase()] = existing;
    codeToCount[norm.name.toLowerCase()] = existing;
    codeToCount[item.name.toLowerCase()] = existing;

    // Index 2-letter codes for ISO 3-letter codes
    if (norm.code === 'USA') codeToCount['us'] = existing;
    if (norm.code === 'IND') codeToCount['in'] = existing;
    if (norm.code === 'TWN') codeToCount['tw'] = existing;
    if (norm.code === 'KOR') codeToCount['kr'] = existing;
    if (norm.code === 'SGP') codeToCount['sg'] = existing;
    if (norm.code === 'MYS') codeToCount['my'] = existing;
    if (norm.code === 'JPN') codeToCount['jp'] = existing;
    if (norm.code === 'DEU') codeToCount['de'] = existing;
    if (norm.code === 'GBR') {
      codeToCount['gb'] = existing;
      codeToCount['uk'] = existing;
    }
    if (norm.code === 'IRL') codeToCount['ie'] = existing;
    if (norm.code === 'ISR') codeToCount['il'] = existing;
    if (norm.code === 'FRA') codeToCount['fr'] = existing;
    if (norm.code === 'ITA') codeToCount['it'] = existing;
    if (norm.code === 'AUT') codeToCount['at'] = existing;
    if (norm.code === 'NLD') codeToCount['nl'] = existing;
    if (norm.code === 'CHN') codeToCount['cn'] = existing;
    if (norm.code === 'CAN') codeToCount['ca'] = existing;
    if (norm.code === 'MEX') codeToCount['mx'] = existing;
    if (norm.code === 'BRA') codeToCount['br'] = existing;
    if (norm.code === 'AUS') codeToCount['au'] = existing;

    computedTotal += item.value;
  });

  const effectiveTotal = totalEngineers > 0 ? totalEngineers : computedTotal;

  // Active countries list for footer pills
  const activeCountriesList = Object.entries(countryCounts)
    .filter(([_, item]) => item.count > 0)
    .sort((a, b) => b[1].count - a[1].count);

  const getPathData = (p: CountrySvgPath) => {
    if (p.id) {
      const match = codeToCount[p.id.toLowerCase()];
      if (match) return match;
    }
    if (p.name) {
      const match = codeToCount[p.name.toLowerCase()];
      if (match) return match;
    }
    if (p.cls) {
      const match = codeToCount[p.cls.toLowerCase()];
      if (match) return match;
    }
    return null;
  };

  const getCountryDisplayName = (p: CountrySvgPath) => {
    const d = getPathData(p);
    if (d) return d.name;
    if (p.name) return p.name;
    if (p.cls) return p.cls;
    if (p.id) return p.id;
    return 'Unknown Country';
  };

  return (
    <div className={`p-5 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-md shadow-black/20 space-y-3 flex flex-col justify-between relative overflow-hidden ${className}`}>
      {/* Header & Legend */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-stone-900 flex items-center space-x-2">
            <span>Engineer Location</span>
          </h3>
          <p className="text-xs text-stone-500">
            Current workforce location based on ongoing schedules
          </p>
        </div>

        {/* Intensity Legend */}
        <div className="flex items-center space-x-3 text-[11px] font-semibold text-stone-600">
          <span className="flex items-center space-x-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block shadow-2xs"
              style={{ backgroundColor: currentCompany.primaryColor || '#606C38' }}
            />
            <span>Active</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block bg-slate-300 border border-slate-400/30" />
            <span className="text-stone-400">Inactive</span>
          </span>
        </div>
      </div>

      {/* World Map SVG Container */}
      <div className="relative w-full h-56 sm:h-64 flex items-center justify-center bg-slate-50/50 rounded-xl overflow-hidden p-1 border border-slate-100">
        {effectiveTotal === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-2 text-stone-400 text-xs">
            <Globe className="w-8 h-8 opacity-40 animate-pulse" />
            <span>No engineer location data available</span>
          </div>
        ) : (
          <>
            <svg
              viewBox={WORLD_MAP_VIEWBOX}
              className="w-full h-full object-contain filter drop-shadow-xs select-none"
            >
              {WORLD_MAP_PATHS.map((pathItem, idx) => {
                const dataMatch = getPathData(pathItem);
                const count = dataMatch ? dataMatch.count : 0;
                const pct = effectiveTotal > 0 ? Number(((count / effectiveTotal) * 100).toFixed(1)) : 0;
                const displayName = getCountryDisplayName(pathItem);
                const isActive = count > 0;
                const isHovered = hoveredCountry?.name === displayName;

                const fillColor = isActive
                  ? (currentCompany.primaryColor || '#606C38')
                  : isHovered
                    ? '#94A3B8'
                    : '#CBD5E1';

                const strokeColor = isActive
                  ? (currentCompany.primaryHover || '#283618')
                  : '#FFFFFF';

                return (
                  <path
                    key={pathItem.id || `${pathItem.cls || pathItem.name || 'p'}-${idx}`}
                    d={pathItem.d}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isActive ? 1.4 : 0.6}
                    strokeLinejoin="round"
                    className="transition-colors duration-150 cursor-pointer"
                    style={{
                      opacity: isActive ? 1 : isHovered ? 0.9 : 0.8,
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredCountry({
                        name: displayName,
                        code: pathItem.id || pathItem.cls || displayName,
                        count,
                        pct,
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredCountry((prev) =>
                        prev
                          ? {
                              ...prev,
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                            }
                          : null
                      );
                    }}
                    onMouseLeave={() => setHoveredCountry(null)}
                  />
                );
              })}
            </svg>

            {/* Interactive Tooltip Card */}
            {hoveredCountry && (
              <div
                className="absolute z-30 pointer-events-none bg-stone-950/95 backdrop-blur-md text-white text-xs px-3.5 py-2 rounded-xl shadow-xl border border-white/15 space-y-1 transition-all transform -translate-x-1/2 -translate-y-full mb-2"
                style={{
                  left: '50%',
                  top: '35%',
                }}
              >
                <div className="flex items-center space-x-1.5 font-bold border-b border-white/15 pb-1">
                  <MapPin
                    className="w-3 h-3"
                    style={{ color: currentCompany.primaryColor || '#606C38' }}
                  />
                  <span>{hoveredCountry.name}</span>
                </div>
                <div className="flex items-center justify-between space-x-4 pt-0.5 text-[11px]">
                  <span className="text-stone-300">
                    {hoveredCountry.count} {hoveredCountry.count === 1 ? 'engineer' : 'engineers'}
                  </span>
                  <span className="font-mono font-bold text-amber-300">
                    {hoveredCountry.pct}%
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Summary Footer Pills */}
      <div className="pt-2.5 border-t border-[var(--color-border)] flex flex-wrap items-center gap-2">
        {activeCountriesList.length === 0 ? (
          <span className="text-xs text-stone-500">No ongoing deployments</span>
        ) : (
          activeCountriesList.map(([code, item]) => {
            const pct = effectiveTotal > 0 ? ((item.count / effectiveTotal) * 100).toFixed(1) : '0';
            return (
              <div
                key={code}
                className="flex items-center space-x-1.5 px-2.5 py-1 bg-white/80 border border-[var(--color-border)] rounded-xl text-xs font-semibold text-stone-800 shadow-2xs transition-transform hover:scale-105"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: currentCompany.primaryColor || '#606C38' }}
                />
                <span>{item.name}:</span>
                <span className="font-bold text-stone-950">{item.count}</span>
                <span className="text-[10px] text-stone-500 font-mono">({pct}%)</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
