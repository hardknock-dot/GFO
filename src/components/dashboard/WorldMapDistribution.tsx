import React, { useState, useRef } from 'react';
import { useCompany } from '../../context/CompanyContext';
import { normalizeCountryName } from '../../utils/countryNormalization';
import { WORLD_MAP_PATHS, WORLD_MAP_VIEWBOX, type CountrySvgPath } from './worldMapSvgData';
import type { CountryDistributionItem } from '../../types';
import { Globe, MapPin, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { getCompanyTheme } from '../../config/companyThemes';

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
  const theme = getCompanyTheme(currentCompany.company_id || currentCompany.id || currentCompany.code);
  
  // Interactive Zoom & Pan State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialPan, setInitialPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [hoveredCountry, setHoveredCountry] = useState<{
    name: string;
    code: string;
    count: number;
    pct: number;
    x: number;
    y: number;
  } | null>(null);

  // Block page scroll when wheeling or interacting with map
  React.useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    const preventScroll = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.3 : -0.3;
      setZoom((prevZoom) => {
        const nextZoom = Math.min(Math.max(prevZoom + delta, 1), 6);
        if (nextZoom === 1) setPan({ x: 0, y: 0 });
        return Number(nextZoom.toFixed(2));
      });
    };
    el.addEventListener('wheel', preventScroll, { passive: false });
    return () => {
      el.removeEventListener('wheel', preventScroll);
    };
  }, []);

  // Wheel Zoom Handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
  };

  // Drag & Pan Handlers (Fast & responsive movement)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPan({ ...pan });
    document.body.style.overflow = 'hidden';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const DRAG_SPEED = 2.2; // Fast grab & move sensitivity
    const dx = (e.clientX - dragStart.x) * DRAG_SPEED;
    const dy = (e.clientY - dragStart.y) * DRAG_SPEED;
    setPan({
      x: initialPan.x + dx,
      y: initialPan.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.overflow = '';
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.5, 6));
  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

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

  const activeColor = currentCompany.primaryColor || theme.primaryColor;
  const activeHoverColor = currentCompany.primaryHover || theme.primaryHover;
  const inactiveColor = currentCompany.secondaryColor || theme.accentSoft || theme.secondaryColor || '#CCB7AE';
  const inactiveHoverColor = currentCompany.accentColor || theme.darkAccent || activeColor;

  return (
    <div className={`p-5 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-md shadow-black/20 space-y-3 flex flex-col justify-between relative overflow-hidden ${className}`}>
      {/* Header & Legend */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] flex items-center space-x-2">
            <span>Engineer Location</span>
          </h3>
          <p className="text-xs text-[var(--color-text-secondary)] opacity-80">
            Current workforce location based on ongoing schedules
          </p>
        </div>

        {/* Intensity Legend */}
        <div className="flex items-center space-x-3 text-[11px] font-semibold text-[var(--color-text-primary)]">
          <span className="flex items-center space-x-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block shadow-2xs"
              style={{ backgroundColor: activeColor }}
            />
            <span>Active</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block shadow-2xs border border-[var(--color-border)]"
              style={{ backgroundColor: inactiveColor }}
            />
            <span className="text-[var(--color-text-secondary)] opacity-90">Inactive</span>
          </span>
        </div>
      </div>

      {/* World Map SVG Container (Transparent Background with Interactive Zoom & Pan) */}
      <div
        ref={mapContainerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setHoveredCountry(null);
        }}
        className={`relative w-full h-56 sm:h-64 flex items-center justify-center bg-transparent rounded-xl overflow-hidden p-1 border border-[var(--color-border)] select-none ${
          zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        }`}
      >
        {/* Floating Zoom Control Buttons */}
        <div className="absolute top-2 right-2 z-20 flex items-center space-x-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs p-1 rounded-lg border border-[var(--color-border)] shadow-md">
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          {zoom > 1 && (
            <button
              onClick={handleResetZoom}
              title="Reset View"
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 flex items-center text-[10px] font-semibold"
            >
              <RotateCcw className="w-3 h-3 mr-0.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

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
              <g
                transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
                style={{
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                }}
              >
                {WORLD_MAP_PATHS.map((pathItem, idx) => {
                  const dataMatch = getPathData(pathItem);
                  const count = dataMatch ? dataMatch.count : 0;
                  const pct = effectiveTotal > 0 ? Number(((count / effectiveTotal) * 100).toFixed(1)) : 0;
                  const displayName = getCountryDisplayName(pathItem);
                  const isActive = count > 0;
                  const isHovered = hoveredCountry?.name === displayName;

                  const fillColor = isActive
                    ? activeColor
                    : isHovered
                      ? inactiveHoverColor
                      : inactiveColor;

                  const strokeColor = isActive
                    ? activeHoverColor
                    : (currentCompany.borderColor || 'rgba(255,255,255,0.6)');

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
                        opacity: isActive ? 1 : isHovered ? 0.95 : 0.85,
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
                    />
                  );
                })}
              </g>
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
