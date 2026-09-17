import React, { useState, useRef } from 'react';
import { useCompany } from '../../context/CompanyContext';
import { normalizeCountryName } from '../../utils/countryNormalization';
import { WORLD_MAP_PATHS, WORLD_MAP_VIEWBOX, type CountrySvgPath } from './worldMapSvgData';
import type { CountryDistributionItem } from '../../types';
import { Globe, MapPin, ZoomIn, ZoomOut, RotateCcw, ChevronDown, Navigation } from 'lucide-react';
import { getCompanyTheme } from '../../config/companyThemes';

interface WorldMapDistributionProps {
  data: CountryDistributionItem[];
  totalEngineers: number;
  className?: string;
}

/**
 * Calculates exact SVG path bounding box (minX, maxX, minY, maxY)
 * supporting both absolute and relative commands with cumulative coordinates.
 */
function getPathBounds(d: string): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  const regex = /([a-zA-Z])([^a-zA-Z]*)/g;
  let match;
  let currentX = 0;
  let currentY = 0;

  while ((match = regex.exec(d)) !== null) {
    const cmd = match[1];
    const argsStr = match[2].trim();
    if (!argsStr) continue;

    const nums = argsStr.split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
    if (nums.length === 0) continue;

    const isRelative = cmd === cmd.toLowerCase() && cmd !== 'z' && cmd !== 'Z';
    const isAbsolute = cmd === cmd.toUpperCase();

    if (cmd === 'M' || cmd === 'L') {
      for (let i = 0; i < nums.length - 1; i += 2) {
        currentX = nums[i];
        currentY = nums[i + 1];
        if (currentX < minX) minX = currentX;
        if (currentX > maxX) maxX = currentX;
        if (currentY < minY) minY = currentY;
        if (currentY > maxY) maxY = currentY;
      }
    } else if (cmd === 'm' || cmd === 'l') {
      for (let i = 0; i < nums.length - 1; i += 2) {
        currentX += nums[i];
        currentY += nums[i + 1];
        if (currentX < minX) minX = currentX;
        if (currentX > maxX) maxX = currentX;
        if (currentY < minY) minY = currentY;
        if (currentY > maxY) maxY = currentY;
      }
    } else if (isAbsolute) {
      for (let i = 0; i < nums.length - 1; i += 2) {
        currentX = nums[i];
        currentY = nums[i + 1];
        if (currentX < minX) minX = currentX;
        if (currentX > maxX) maxX = currentX;
        if (currentY < minY) minY = currentY;
        if (currentY > maxY) maxY = currentY;
      }
    } else if (isRelative) {
      for (let i = 0; i < nums.length - 1; i += 2) {
        currentX += nums[i];
        currentY += nums[i + 1];
        if (currentX < minX) minX = currentX;
        if (currentX > maxX) maxX = currentX;
        if (currentY < minY) minY = currentY;
        if (currentY > maxY) maxY = currentY;
      }
    }
  }

  if (minX === Infinity) {
    return { minX: 1000, maxX: 1000, minY: 428.5, maxY: 428.5 };
  }

  return { minX, maxX, minY, maxY };
}

export const WorldMapDistribution: React.FC<WorldMapDistributionProps> = ({
  data = [],
  totalEngineers = 0,
  className = '',
}) => {
  const { currentCompany } = useCompany();
  const theme = getCompanyTheme(currentCompany.theme_key || currentCompany.company_id || currentCompany.id || currentCompany.code);

  // Interactive Zoom & Pan State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialPan, setInitialPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Dropdown Location Selection State
  const [selectedLocationCode, setSelectedLocationCode] = useState<string>('');

  const [hoveredCountry, setHoveredCountry] = useState<{
    name: string;
    code: string;
    count: number;
    pct: number;
    x: number;
    y: number;
  } | null>(null);

  // Block page scroll when wheeling over map
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

  // Drag & Pan Handlers
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
    const DRAG_SPEED = 2.2;
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
    setSelectedLocationCode('');
    setHoveredCountry(null);
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
    if (norm.code === 'SGP') {
      codeToCount['sg'] = existing;
      codeToCount['sgp'] = existing;
      codeToCount['singapore'] = existing;
    }
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

  // Active countries list for dropdown & footer pills
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

  // Center & zoom map to focused location code
  const focusOnCountry = (targetCode: string) => {
    if (!targetCode) {
      handleResetZoom();
      return;
    }

    setSelectedLocationCode(targetCode);

    // Find all matching SVG paths for this country
    const matchingPaths = WORLD_MAP_PATHS.filter((p) => {
      const dataMatch = getPathData(p);
      return dataMatch && dataMatch.code === targetCode;
    });

    if (matchingPaths.length === 0) return;

    // Compute global bounding box across all matching paths
    let globalMinX = Infinity, globalMaxX = -Infinity;
    let globalMinY = Infinity, globalMaxY = -Infinity;

    matchingPaths.forEach((p) => {
      const { minX, maxX, minY, maxY } = getPathBounds(p.d);
      if (minX < globalMinX) globalMinX = minX;
      if (maxX > globalMaxX) globalMaxX = maxX;
      if (minY < globalMinY) globalMinY = minY;
      if (maxY > globalMaxY) globalMaxY = maxY;
    });

    if (globalMinX === Infinity) return;

    const cx = (globalMinX + globalMaxX) / 2;
    const cy = (globalMinY + globalMaxY) / 2;

    // Determine target zoom based on country bounding box dimensions
    const bboxWidth = globalMaxX - globalMinX;
    const bboxHeight = globalMaxY - globalMinY;
    const maxDim = Math.max(bboxWidth, bboxHeight);

    let targetZoom = 3.0;
    if (maxDim < 30) targetZoom = 4.5;
    else if (maxDim < 80) targetZoom = 3.8;
    else if (maxDim < 200) targetZoom = 3.0;
    else targetZoom = 2.2;

    // Center point (1000, 428.5) of 2000x857 SVG viewBox
    const targetPanX = (1000 - cx) * targetZoom;
    const targetPanY = (428.5 - cy) * targetZoom;

    setZoom(targetZoom);
    setPan({ x: targetPanX, y: targetPanY });

    // Scroll map container into view smoothly if needed
    if (mapContainerRef.current) {
      mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    focusOnCountry(val);
  };

  const handleViewOnMapClick = () => {
    if (selectedLocationCode) {
      focusOnCountry(selectedLocationCode);
    }
  };

  const activeColor = theme.primary;
  const activeHoverColor = theme.primaryHover;
  const activeSecondaryColor = theme.secondary;
  const inactiveColor = '#E2E8F0';
  const inactiveBorder = '#CBD5E1';

  const maxCount = Math.max(...Object.values(countryCounts).map((c) => c.count), 1);

  return (
    <div
      style={{
        backgroundColor: currentCompany.cardColor || 'var(--color-card)',
        borderColor: currentCompany.borderColor || 'var(--color-border)',
      }}
      className={`p-5 border rounded-2xl shadow-md shadow-black/20 space-y-3.5 flex flex-col justify-between relative overflow-hidden transition-colors duration-200 ${className}`}
    >
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3
            style={{ color: currentCompany.textColor || 'var(--color-text-primary)' }}
            className="text-base font-semibold flex items-center space-x-2"
          >
            <span>Engineer Location</span>
          </h3>
          <p
            style={{ color: currentCompany.textMutedColor || 'var(--color-text-secondary)' }}
            className="text-xs opacity-80"
          >
            Current workforce location based on ongoing schedules
          </p>
        </div>

        {/* Intensity Legend */}
        <div
          style={{ color: currentCompany.textColor || 'var(--color-text-primary)' }}
          className="flex items-center space-x-3 text-[11px] font-semibold"
        >
          <span className="flex items-center space-x-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block shadow-2xs"
              style={{ backgroundColor: activeColor }}
            />
            <span>High</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block shadow-2xs"
              style={{ backgroundColor: activeSecondaryColor }}
            />
            <span>Moderate</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block shadow-2xs border"
              style={{ backgroundColor: inactiveColor, borderColor: inactiveBorder }}
            />
            <span style={{ color: currentCompany.textColor || 'var(--color-text-primary)' }}>Inactive</span>
          </span>
        </div>
      </div>

      {/* Interactive Dropdown & View on Map Action Button (Styled with Selected Company Theme) */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <select
            value={selectedLocationCode}
            onChange={handleDropdownChange}
            style={{
              backgroundColor: currentCompany.cardColor || 'var(--color-card)',
              borderColor: currentCompany.borderColor || 'var(--color-border)',
              color: currentCompany.textColor || 'var(--color-text-primary)',
            }}
            className="w-full pl-3 pr-8 py-2 text-xs font-semibold border rounded-xl focus:outline-none focus:ring-2 transition-all cursor-pointer shadow-2xs appearance-none truncate"
          >
            <option value="">-- Select Engineer Location ({activeCountriesList.length}) --</option>
            {activeCountriesList.map(([code, item]) => {
              const pct = effectiveTotal > 0 ? ((item.count / effectiveTotal) * 100).toFixed(1) : '0';
              return (
                <option key={code} value={code}>
                  {item.name}: {item.count} {item.count === 1 ? 'engineer' : 'engineers'} ({pct}%)
                </option>
              );
            })}
          </select>
          <div
            style={{ color: currentCompany.primaryColor || theme.primaryColor }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-80"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>

        <button
          type="button"
          onClick={handleViewOnMapClick}
          disabled={!selectedLocationCode}
          style={{
            backgroundColor: selectedLocationCode
              ? (currentCompany.primaryColor || theme.primaryColor)
              : undefined,
            color: selectedLocationCode
              ? (currentCompany.textOnPrimary || '#FFFFFF')
              : undefined,
          }}
          className="flex items-center justify-center space-x-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm active:scale-95 flex-shrink-0"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>View on Map</span>
        </button>
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
        style={{
          borderColor: currentCompany.borderColor || 'var(--color-border)',
        }}
        className={`relative w-full h-56 sm:h-64 flex items-center justify-center bg-transparent rounded-xl overflow-hidden p-1 border select-none ${
          zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        }`}
      >
        {/* Floating Zoom Control Buttons */}
        <div
          style={{
            backgroundColor: currentCompany.cardColor || 'var(--color-card)',
            borderColor: currentCompany.borderColor || 'var(--color-border)',
          }}
          className="absolute top-2 right-2 z-20 flex items-center space-x-1 backdrop-blur-xs p-1 rounded-lg border shadow-md"
        >
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            style={{ color: currentCompany.textColor || 'var(--color-text-primary)' }}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            style={{ color: currentCompany.textColor || 'var(--color-text-primary)' }}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          {(zoom > 1 || selectedLocationCode) && (
            <button
              onClick={handleResetZoom}
              title="Reset View"
              style={{ color: currentCompany.primaryColor || theme.primaryColor }}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded flex items-center text-[10px] font-semibold"
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
                  transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {WORLD_MAP_PATHS.map((pathItem, idx) => {
                  const dataMatch = getPathData(pathItem);
                  const count = dataMatch ? dataMatch.count : 0;
                  const pct = effectiveTotal > 0 ? Number(((count / effectiveTotal) * 100).toFixed(1)) : 0;
                  const displayName = getCountryDisplayName(pathItem);
                  const isActive = count > 0;
                  const isHovered = hoveredCountry?.name === displayName;
                  const isFocused = dataMatch && selectedLocationCode && dataMatch.code === selectedLocationCode;

                  let fillColor = inactiveColor;
                  let strokeColor = inactiveBorder;
                  let strokeWidth = 0.7;
                  let opacity = 0.95;

                  if (isFocused) {
                    fillColor = activeHoverColor;
                    strokeColor = theme.accent || '#F59E0B';
                    strokeWidth = 3.0;
                    opacity = 1.0;
                  } else if (isActive) {
                    if (count >= maxCount * 0.4) {
                      fillColor = activeColor;
                    } else {
                      fillColor = activeSecondaryColor;
                    }
                    if (isHovered) {
                      fillColor = activeHoverColor;
                    }
                    strokeColor = activeHoverColor;
                    strokeWidth = 1.4;
                    opacity = 1.0;
                  } else if (isHovered) {
                    fillColor = '#CBD5E1';
                    strokeColor = activeColor;
                    strokeWidth = 1.0;
                    opacity = 1.0;
                  }

                  return (
                    <path
                      key={pathItem.id || `${pathItem.cls || pathItem.name || 'p'}-${idx}`}
                      d={pathItem.d}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeLinejoin="round"
                      className="transition-colors duration-150 cursor-pointer"
                      style={{ opacity }}
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
                      onMouseLeave={() => {
                        setHoveredCountry(null);
                      }}
                    />
                  );
                })}
              </g>
            </svg>

            {/* Interactive Tooltip Card (Appears ONLY while actively hovering mouse over a country) */}
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
                    className="w-3 h-3 text-amber-400"
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

    </div>
  );
};
