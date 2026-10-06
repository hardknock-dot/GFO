import React, { useState, useRef, useEffect } from 'react';
import { normalizeCountryName } from '../../utils/countryNormalization';
import { WORLD_MAP_PATHS, WORLD_MAP_VIEWBOX, type CountrySvgPath } from '../dashboard/worldMapSvgData';
import type { GeographyCountryItem } from '../../types/client';
import { Globe, MapPin, ZoomIn, ZoomOut, RotateCcw, ChevronDown, Navigation } from 'lucide-react';

interface ClientWorldMapProps {
  countries: GeographyCountryItem[];
  totalDeployments: number;
  className?: string;
}

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

    if (cmd === 'M' || cmd === 'L' || isAbsolute) {
      for (let i = 0; i < nums.length - 1; i += 2) {
        currentX = nums[i];
        currentY = nums[i + 1];
        if (currentX < minX) minX = currentX;
        if (currentX > maxX) maxX = currentX;
        if (currentY < minY) minY = currentY;
        if (currentY > maxY) maxY = currentY;
      }
    } else if (cmd === 'm' || cmd === 'l' || isRelative) {
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

export const ClientWorldMap: React.FC<ClientWorldMapProps> = ({
  countries = [],
  totalDeployments = 0,
  className = '',
}) => {
  // Interactive Zoom & Pan State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialPan, setInitialPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [selectedLocationCode, setSelectedLocationCode] = useState<string>('');

  const [hoveredCountry, setHoveredCountry] = useState<{
    name: string;
    code: string;
    count: number;
    pct: number;
    x: number;
    y: number;
  } | null>(null);

  // Wheel zoom handler
  useEffect(() => {
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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPan({ ...pan });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const DRAG_SPEED = 2.0;
    const dx = (e.clientX - dragStart.x) * DRAG_SPEED;
    const dy = (e.clientY - dragStart.y) * DRAG_SPEED;
    setPan({
      x: initialPan.x + dx,
      y: initialPan.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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

  // Build lookup dictionary of normalized country counts
  const codeToCount: Record<string, { name: string; count: number; code: string; percentage: number }> = {};
  let computedTotal = 0;

  countries.forEach((item) => {
    if (!item.name || item.value <= 0) return;
    const norm = normalizeCountryName(item.name);
    const count = item.value;
    const pct = item.percentage;
    const entry = { name: item.name, count, code: norm.code, percentage: pct };

    codeToCount[norm.code.toLowerCase()] = entry;
    codeToCount[norm.name.toLowerCase()] = entry;
    codeToCount[item.name.toLowerCase()] = entry;

    if (norm.code === 'USA') codeToCount['us'] = entry;
    if (norm.code === 'IND') codeToCount['in'] = entry;
    if (norm.code === 'TWN') codeToCount['tw'] = entry;
    if (norm.code === 'KOR') codeToCount['kr'] = entry;
    if (norm.code === 'SGP') {
      codeToCount['sg'] = entry;
      codeToCount['sgp'] = entry;
      codeToCount['singapore'] = entry;
    }
    if (norm.code === 'JPN') codeToCount['jp'] = entry;
    if (norm.code === 'IRL') codeToCount['ie'] = entry;
    if (norm.code === 'AUT') codeToCount['at'] = entry;
    if (norm.code === 'VNM') {
      codeToCount['vn'] = entry;
      codeToCount['vietnam'] = entry;
    }

    computedTotal += item.value;
  });

  const effectiveTotal = totalDeployments > 0 ? totalDeployments : computedTotal;

  const getPathData = (p: CountrySvgPath) => {
    if (p.id && codeToCount[p.id.toLowerCase()]) return codeToCount[p.id.toLowerCase()];
    if (p.name && codeToCount[p.name.toLowerCase()]) return codeToCount[p.name.toLowerCase()];
    if (p.cls && codeToCount[p.cls.toLowerCase()]) return codeToCount[p.cls.toLowerCase()];
    return null;
  };

  const getCountryDisplayName = (p: CountrySvgPath) => {
    const d = getPathData(p);
    if (d) return d.name;
    if (p.name) return p.name;
    if (p.cls) return p.cls;
    if (p.id) return p.id;
    return 'Unknown Region';
  };

  const focusOnCountry = (targetCode: string) => {
    if (!targetCode) {
      handleResetZoom();
      return;
    }

    setSelectedLocationCode(targetCode);

    const matchingPaths = WORLD_MAP_PATHS.filter((p) => {
      const dataMatch = getPathData(p);
      return dataMatch && dataMatch.code === targetCode;
    });

    if (matchingPaths.length === 0) return;

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
    const bboxWidth = globalMaxX - globalMinX;
    const bboxHeight = globalMaxY - globalMinY;
    const maxDim = Math.max(bboxWidth, bboxHeight);

    let targetZoom = 3.0;
    if (maxDim < 30) targetZoom = 4.5;
    else if (maxDim < 80) targetZoom = 3.8;
    else if (maxDim < 200) targetZoom = 3.0;
    else targetZoom = 2.2;

    const targetPanX = (1000 - cx) * targetZoom;
    const targetPanY = (428.5 - cy) * targetZoom;

    setZoom(targetZoom);
    setPan({ x: targetPanX, y: targetPanY });
  };

  // Light Executive Color Palette
  const activeColor = '#3B82C4'; // Executive Blue
  const activeHoverColor = '#172B4D'; // Dark Navy
  const activeFocusStroke = '#2E7D62'; // Forest Green
  const inactiveColor = '#F1F5F9'; // Clean light slate
  const inactiveBorder = '#CBD5E1'; // Slate border

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Interactive Controls & Legend Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F8FB] p-3 rounded-xl border border-[#E2E8F0]">
        {/* Dropdown Focus */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <select
              value={selectedLocationCode}
              onChange={(e) => focusOnCountry(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 text-xs font-semibold bg-white text-[#172033] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82C4] shadow-2xs appearance-none truncate cursor-pointer"
            >
              <option value="">-- Select Active Country ({countries.length}) --</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}: {c.value} deployments ({c.percentage}%)
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748B]">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => focusOnCountry(selectedLocationCode)}
            disabled={!selectedLocationCode}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold bg-[#172B4D] hover:bg-[#3B82C4] text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all shadow-2xs shrink-0 cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Focus</span>
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 text-xs font-semibold text-[#172033]">
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-[#3B82C4] shadow-2xs" />
            <span>Active Deployment Territory</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-[#F1F5F9] border border-[#CBD5E1]" />
            <span className="text-[#64748B]">Inactive Region</span>
          </span>
        </div>
      </div>

      {/* SVG Map Container */}
      <div
        ref={mapContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setHoveredCountry(null);
        }}
        className={`relative w-full h-64 sm:h-80 flex items-center justify-center bg-[#F6F8FB]/50 rounded-2xl overflow-hidden p-2 border border-[#E2E8F0] select-none ${
          zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        }`}
      >
        {/* Floating Zoom Control Buttons */}
        <div className="absolute top-3 right-3 z-20 flex items-center space-x-1 bg-white/90 backdrop-blur-xs p-1 rounded-xl border border-[#E2E8F0] shadow-xs">
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 text-[#172B4D] hover:bg-[#F6F8FB] rounded-lg cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 text-[#172B4D] hover:bg-[#F6F8FB] rounded-lg cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          {(zoom > 1 || selectedLocationCode) && (
            <button
              onClick={handleResetZoom}
              title="Reset View"
              className="p-1.5 text-[#3B82C4] hover:bg-[#EBF3FB] rounded-lg flex items-center text-xs font-bold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {effectiveTotal === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-2 text-[#64748B] text-xs">
            <Globe className="w-8 h-8 opacity-40 animate-pulse" />
            <span>No deployment location data available</span>
          </div>
        ) : (
          <>
            <svg
              viewBox={WORLD_MAP_VIEWBOX}
              className="w-full h-full object-contain filter drop-shadow-2xs select-none"
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
                  const pct = dataMatch ? dataMatch.percentage : (effectiveTotal > 0 ? Number(((count / effectiveTotal) * 100).toFixed(1)) : 0);
                  const displayName = getCountryDisplayName(pathItem);
                  const isActive = count > 0;
                  const isHovered = hoveredCountry?.name === displayName;
                  const isFocused = dataMatch && selectedLocationCode && dataMatch.code === selectedLocationCode;

                  let fillColor = inactiveColor;
                  let strokeColor = inactiveBorder;
                  let strokeWidth = 0.6;
                  let opacity = 0.95;

                  if (isFocused) {
                    fillColor = activeHoverColor;
                    strokeColor = activeFocusStroke;
                    strokeWidth = 2.5;
                    opacity = 1.0;
                  } else if (isActive) {
                    fillColor = activeColor;
                    strokeColor = activeHoverColor;
                    strokeWidth = 1.2;
                    opacity = 1.0;
                  } else if (isHovered) {
                    fillColor = '#CBD5E1';
                    strokeColor = activeHoverColor;
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

            {/* Executive Floating Tooltip */}
            {hoveredCountry && (
              <div
                className="absolute z-30 pointer-events-none bg-[#172B4D]/95 backdrop-blur-md text-white text-xs px-3.5 py-2 rounded-xl shadow-xl border border-white/20 space-y-1 transition-all transform -translate-x-1/2 -translate-y-full mb-2"
                style={{
                  left: '50%',
                  top: '35%',
                }}
              >
                <div className="flex items-center space-x-1.5 font-bold border-b border-white/15 pb-1">
                  <MapPin className="w-3.5 h-3.5 text-[#3B82C4]" />
                  <span>{hoveredCountry.name}</span>
                </div>
                <div className="flex items-center justify-between space-x-4 pt-0.5 text-[11px]">
                  <span className="text-slate-300">
                    {hoveredCountry.count > 0 ? `${hoveredCountry.count} deployments` : 'No active deployments'}
                  </span>
                  {hoveredCountry.count > 0 && (
                    <span className="font-mono font-bold text-[#EBF3FB]">
                      {hoveredCountry.pct}%
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
