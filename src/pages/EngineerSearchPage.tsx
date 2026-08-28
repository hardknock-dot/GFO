import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEngineers } from '../hooks/useEngineers';
import { getEngineerFilterOptions, type EngineerFilterOptions } from '../services/engineers';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/forms/Button';
import { SearchableMultiSelect } from '../components/forms/SearchableMultiSelect';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import {
  Users,
  User,
  Search,
  Filter,
  Wrench,
  MapPin,
  ArrowRight,
  RotateCcw,
  Building2,
  X,
  Camera,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';
import { EngineerPhotoUploadModal } from '../components/common/EngineerPhotoUploadModal';

export const EngineerSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Photo upload modal state
  const [uploadTargetEng, setUploadTargetEng] = useState<{ id: string; name: string; orbitId?: string } | null>(null);

  // Dynamic filter options metadata state
  const [filterOptions, setFilterOptions] = useState<EngineerFilterOptions>({
    tool_modules: [],
    tool_names: [],
    countries: [],
    fabs: [],
    consumer_experience: { min: 0, max: 20 },
    industry_experience: { min: 0, max: 20 },
  });

  // Read search & filter state from URL query parameters
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const qParam = searchParams.get('q') || searchParams.get('search') || '';
  const consumerMinParam = searchParams.get('consumer_min') ? Number(searchParams.get('consumer_min')) : null;
  const consumerMaxParam = searchParams.get('consumer_max') ? Number(searchParams.get('consumer_max')) : null;
  const industryMinParam = searchParams.get('industry_min') ? Number(searchParams.get('industry_min')) : null;
  const industryMaxParam = searchParams.get('industry_max') ? Number(searchParams.get('industry_max')) : null;

  const toolModulesParam = useMemo(() => {
    const raw = searchParams.getAll('tool_modules');
    if (raw.length > 0) return raw;
    const single = searchParams.get('tool_modules') || searchParams.get('primaryTool');
    return single ? single.split(',').filter(Boolean) : [];
  }, [searchParams]);

  const toolNamesParam = useMemo(() => {
    const raw = searchParams.getAll('tool_names');
    if (raw.length > 0) return raw;
    const single = searchParams.get('tool_names') || searchParams.get('toolName');
    return single ? single.split(',').filter(Boolean) : [];
  }, [searchParams]);

  const countryParam = searchParams.get('country') || '';
  const fabsParam = useMemo(() => {
    const raw = searchParams.getAll('fabs');
    if (raw.length > 0) return raw;
    const single = searchParams.get('fabs') || searchParams.get('fab');
    return single ? single.split(',').filter(Boolean) : [];
  }, [searchParams]);

  // Local debounced search query state
  const [searchInput, setSearchInput] = useState(qParam);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  // Sync search input if URL changes externally
  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  // Debounce search input updates (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== qParam) {
        updateSearchParams({ q: searchInput || undefined, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load filter options metadata on mount
  useEffect(() => {
    let isMounted = true;
    getEngineerFilterOptions()
      .then((res) => {
        if (isMounted) {
          setFilterOptions(res);
        }
      })
      .catch((err) => {
        console.error('Failed to load filter options:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Helper to update search params in URL
  const updateSearchParams = (updates: Record<string, any>) => {
    const newParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, val]) => {
      newParams.delete(key);
      if (val === undefined || val === null || val === '') return;

      if (Array.isArray(val)) {
        val.forEach((v) => {
          if (v && String(v).trim()) newParams.append(key, String(v).trim());
        });
      } else {
        newParams.set(key, String(val));
      }
    });

    setSearchParams(newParams, { replace: true });
  };

  // Range Slider values with fallbacks to metadata bounds
  const currentConsumerMin = consumerMinParam !== null ? consumerMinParam : filterOptions.consumer_experience.min;
  const currentConsumerMax = consumerMaxParam !== null ? consumerMaxParam : filterOptions.consumer_experience.max;

  const currentIndustryMin = industryMinParam !== null ? industryMinParam : filterOptions.industry_experience.min;
  const currentIndustryMax = industryMaxParam !== null ? industryMaxParam : filterOptions.industry_experience.max;

  // React Query fetch for server-side paginated engineers
  const { data: res, isLoading, isError, refetch } = useEngineers({
    q: qParam || undefined,
    consumer_min: consumerMinParam !== null ? consumerMinParam : undefined,
    consumer_max: consumerMaxParam !== null ? consumerMaxParam : undefined,
    industry_min: industryMinParam !== null ? industryMinParam : undefined,
    industry_max: industryMaxParam !== null ? industryMaxParam : undefined,
    tool_modules: toolModulesParam.length > 0 ? toolModulesParam : undefined,
    tool_names: toolNamesParam.length > 0 ? toolNamesParam : undefined,
    country: countryParam || undefined,
    fabs: fabsParam.length > 0 ? fabsParam : undefined,
    page: pageParam,
    pageSize: 20,
  });

  const engineers = useMemo(() => {
    let list = res?.data || [];
    if (qParam && qParam.trim()) {
      const term = qParam.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(term) ||
          e.orbitId.toLowerCase().includes(term) ||
          (e.goesBy && e.goesBy.toLowerCase().includes(term)) ||
          (e.primaryTool && e.primaryTool.toLowerCase().includes(term)) ||
          (e.id && e.id.toLowerCase().includes(term))
      );
    }
    if (consumerMinParam !== null) {
      list = list.filter((e) => e.customerExperience >= consumerMinParam);
    }
    if (consumerMaxParam !== null) {
      list = list.filter((e) => e.customerExperience <= consumerMaxParam);
    }
    if (industryMinParam !== null) {
      list = list.filter((e) => e.yearsExperience >= industryMinParam);
    }
    if (industryMaxParam !== null) {
      list = list.filter((e) => e.yearsExperience <= industryMaxParam);
    }
    if (toolModulesParam.length > 0) {
      list = list.filter((e) =>
        toolModulesParam.some((tm) => e.primaryTool.toLowerCase().includes(tm.toLowerCase()))
      );
    }
    if (toolNamesParam.length > 0) {
      list = list.filter((e) =>
        toolNamesParam.some((tn) => e.primaryTool.toLowerCase().includes(tn.toLowerCase()))
      );
    }
    if (countryParam && countryParam.toLowerCase() !== 'all') {
      list = list.filter((e) => e.country.toLowerCase().includes(countryParam.toLowerCase()));
    }
    if (fabsParam.length > 0) {
      list = list.filter((e) =>
        fabsParam.some((f) => e.assignedSite.toLowerCase().includes(f.toLowerCase()))
      );
    }
    return list;
  }, [
    res?.data,
    qParam,
    consumerMinParam,
    consumerMaxParam,
    industryMinParam,
    industryMaxParam,
    toolModulesParam,
    toolNamesParam,
    countryParam,
    fabsParam,
  ]);

  const totalEngineers = res?.total || engineers.length;
  const totalPages = res?.totalPages || 1;
  const currentPage = res?.page || pageParam;

  // Check if any filter is currently active
  const hasActiveFilters =
    Boolean(qParam) ||
    consumerMinParam !== null ||
    consumerMaxParam !== null ||
    industryMinParam !== null ||
    industryMaxParam !== null ||
    toolModulesParam.length > 0 ||
    toolNamesParam.length > 0 ||
    Boolean(countryParam) ||
    fabsParam.length > 0;

  // Reset all filters action
  const handleClearAllFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  // Pagination helper
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateSearchParams({ page: newPage });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Field Engineer Talent Gallery & Search"
        subtitle="Server-side query certified semiconductor equipment field engineers by tool modules, skill certifications, experience, and orbit profile."
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilterPanelOpen(!filterPanelOpen)}
              className="lg:hidden flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{filterPanelOpen ? 'Hide Filters' : 'Filter Panel'}</span>
            </button>
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearAllFilters}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Clear All Filters
              </Button>
            )}
          </div>
        }
      />

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Sidebar Filter Card */}
        <div
          className={`space-y-5 p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm lg:sticky lg:top-20 transition-all ${filterPanelOpen ? 'block' : 'hidden lg:block'
            }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-[var(--color-accent)]" />
              <span>Advanced Search</span>
            </h3>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-[11px] font-semibold text-rose-500 hover:underline"
              >
                Clear All
              </button>
            )}
          </div>

          {/* 1. Primary Keyword Search Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Engineer Search
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Name, Orbit ID, Company ID, Goes By..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Consumer Experience Range Slider */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Consumer Experience
              </label>
              <span className="font-bold text-[var(--color-accent)]">
                {currentConsumerMin} – {currentConsumerMax} Yrs
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400">Min Yrs</span>
                <input
                  type="range"
                  min={filterOptions.consumer_experience.min}
                  max={filterOptions.consumer_experience.max}
                  value={currentConsumerMin}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val <= currentConsumerMax) {
                      updateSearchParams({ consumer_min: val, page: 1 });
                    }
                  }}
                  className="w-full accent-[var(--color-accent)] cursor-pointer"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Max Yrs</span>
                <input
                  type="range"
                  min={filterOptions.consumer_experience.min}
                  max={filterOptions.consumer_experience.max}
                  value={currentConsumerMax}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= currentConsumerMin) {
                      updateSearchParams({ consumer_max: val, page: 1 });
                    }
                  }}
                  className="w-full accent-[var(--color-accent)] cursor-pointer"
                />
              </div>
            </div>
            {(consumerMinParam !== null || consumerMaxParam !== null) && (
              <button
                type="button"
                onClick={() => updateSearchParams({ consumer_min: undefined, consumer_max: undefined, page: 1 })}
                className="text-[11px] text-slate-400 hover:text-slate-600 underline"
              >
                Reset Consumer Range
              </button>
            )}
          </div>

          {/* 3. Industry Experience Range Slider */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Industry Experience
              </label>
              <span className="font-bold text-[var(--color-accent)]">
                {currentIndustryMin} – {currentIndustryMax} Yrs
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400">Min Yrs</span>
                <input
                  type="range"
                  min={filterOptions.industry_experience.min}
                  max={filterOptions.industry_experience.max}
                  value={currentIndustryMin}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val <= currentIndustryMax) {
                      updateSearchParams({ industry_min: val, page: 1 });
                    }
                  }}
                  className="w-full accent-[var(--color-accent)] cursor-pointer"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Max Yrs</span>
                <input
                  type="range"
                  min={filterOptions.industry_experience.min}
                  max={filterOptions.industry_experience.max}
                  value={currentIndustryMax}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= currentIndustryMin) {
                      updateSearchParams({ industry_max: val, page: 1 });
                    }
                  }}
                  className="w-full accent-[var(--color-accent)] cursor-pointer"
                />
              </div>
            </div>
            {(industryMinParam !== null || industryMaxParam !== null) && (
              <button
                type="button"
                onClick={() => updateSearchParams({ industry_min: undefined, industry_max: undefined, page: 1 })}
                className="text-[11px] text-slate-400 hover:text-slate-600 underline"
              >
                Reset Industry Range
              </button>
            )}
          </div>

          {/* 4. Tool Module Searchable Multi-Select Dropdown (engineers.primary_tool) */}
          <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
            <SearchableMultiSelect
              label="Tool Module"
              placeholder="Search tool modules..."
              options={filterOptions.tool_modules}
              selectedValues={toolModulesParam}
              onChange={(selected) => updateSearchParams({ tool_modules: selected, page: 1 })}
            />
          </div>

          {/* 5. Tool Name Searchable Multi-Select Dropdown (skills.tool_type) */}
          <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
            <SearchableMultiSelect
              label="Tool Name"
              placeholder="Search skill tool types..."
              options={filterOptions.tool_names}
              selectedValues={toolNamesParam}
              onChange={(selected) => updateSearchParams({ tool_names: selected, page: 1 })}
            />
          </div>

          {/* 6. Current Country Select */}
          <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Current Country {countryParam && <span className="text-[var(--color-accent)] font-bold">(1)</span>}
            </label>
            <select
              value={countryParam}
              onChange={(e) => updateSearchParams({ country: e.target.value || undefined, page: 1 })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="">All Countries</option>
              {filterOptions.countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 7. Current Fab Searchable Multi-Select Dropdown (schedules.fab_site) */}
          <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
            <SearchableMultiSelect
              label="Current Fab"
              placeholder="Search customer fab sites..."
              options={filterOptions.fabs}
              selectedValues={fabsParam}
              onChange={(selected) => updateSearchParams({ fabs: selected, page: 1 })}
            />
          </div>

          {/* Clear Filters CTA */}
          {hasActiveFilters && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="w-full py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors flex items-center justify-center space-x-1.5 border border-rose-200 dark:border-rose-900/50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear All Filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Gallery Content Column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Gallery Header Summary & Pagination Metadata Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
            <div className="flex items-center space-x-2 text-xs">
              <Users className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="font-bold text-slate-900 dark:text-white">
                Showing {engineers.length > 0 ? (currentPage - 1) * 20 + 1 : 0}–
                {Math.min(currentPage * 20, totalEngineers)} of {totalEngineers} engineers
              </span>
              {hasActiveFilters && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium text-[11px] border border-indigo-200 dark:border-indigo-800">
                  Filtered View
                </span>
              )}
            </div>

            <div className="text-xs text-slate-400 font-medium">
              Page {currentPage} of {totalPages}
            </div>
          </div>

          {/* Cards Grid Loading / Error / Empty / Success */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900 text-rose-600">
              <p className="font-semibold text-sm">Failed to load engineer gallery records.</p>
              <Button size="sm" onClick={() => refetch()} className="mt-3">
                Retry
              </Button>
            </div>
          ) : engineers.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No engineers match the selected filters.
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try widening your experience range sliders, removing specific Tool Name/Module selections, or clearing your keyword query.
              </p>
              <Button size="sm" variant="outline" onClick={handleClearAllFilters}>
                Clear All Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {engineers.map((eng) => {
                const statusBadgeColors: Record<string, string> = {
                  Deployed: 'bg-emerald-600 text-white dark:bg-emerald-700 border-emerald-500',
                  Active: 'bg-slate-700 text-white dark:bg-slate-800 border-slate-600',
                  'Active Assignment': 'bg-emerald-600 text-white dark:bg-emerald-700 border-emerald-500',
                  'On Leave': 'bg-amber-600 text-white dark:bg-amber-700 border-amber-500',
                  'In Transit': 'bg-purple-600 text-white dark:bg-purple-700 border-purple-500',
                  Training: 'bg-blue-600 text-white dark:bg-blue-700 border-blue-500',
                };

                return (
                  <div
                    key={eng.id}
                    onClick={() => navigate(`/engineers/${eng.id}`)}
                    className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
                  >
                    {/* Top Row: Lazy-loaded Avatar + Camera Button + Orbit ID Badge */}
                    <div className="flex items-start justify-between">
                      <div className="relative">
                        {eng.avatarUrl ? (
                          <img
                            src={eng.avatarUrl}
                            alt={eng.name}
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                              const fallback = (e.target as HTMLElement).nextElementSibling;
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                            className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-800 shadow-xs group-hover:scale-105 transition-transform"
                          />
                        ) : null}
                        <div
                          className={`w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold border border-sky-200 dark:border-sky-800/60 shadow-xs group-hover:scale-105 transition-transform ${eng.avatarUrl ? 'hidden' : ''
                            }`}
                        >
                          <User className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                        </div>
                        <span
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${eng.status === 'Deployed'
                              ? 'bg-emerald-500'
                              : eng.status === 'Active'
                                ? 'bg-slate-400'
                                : eng.status === 'On Leave'
                                  ? 'bg-amber-500'
                                  : 'bg-purple-500'
                            }`}
                        />
                      </div>

                      <div className="flex flex-col items-end space-y-1">
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadTargetEng({ id: eng.id, name: eng.name, orbitId: eng.orbitId });
                            }}
                            className="p-1 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Upload photo to SharePoint"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-700 dark:bg-slate-800 text-white !text-white border border-slate-600 dark:border-slate-700">
                            {eng.orbitId}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border text-white !text-white ${statusBadgeColors[eng.status] || 'bg-slate-700 text-white dark:bg-slate-800 border-slate-600'
                            }`}
                        >
                          {eng.status}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Engineer Name, Goes By, Primary Tool */}
                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[var(--color-accent)] transition-colors leading-tight">
                        {eng.name}
                      </h3>
                      {eng.goesBy && eng.goesBy !== eng.name && (
                        <p className="text-[11px] text-slate-400">Goes by: "{eng.goesBy}"</p>
                      )}

                      <div className="pt-1 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          <Wrench className="w-3 h-3 mr-1 text-[var(--color-accent)]" />
                          <span className="truncate max-w-[150px]">{eng.primaryTool || 'N/A'}</span>
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-800">
                          {eng.level}
                        </span>
                      </div>
                    </div>

                    {/* Location & Experience Attributes */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs space-y-1.5 text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {eng.country}
                          </span>
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {eng.customerExperience} Yrs (Cons) / {eng.yearsExperience} Yrs (Ind)
                        </span>
                      </div>

                      {eng.assignedSite && (
                        <div className="flex items-center space-x-1 text-[11px]">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate text-slate-600 dark:text-slate-400">
                            {eng.assignedSite}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer Action */}
                    <div className="pt-2 flex items-center justify-between text-xs font-semibold text-[var(--color-accent)] group-hover:translate-x-0.5 transition-transform">
                      <span>View Full Profile</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Gallery Server-Side Pagination Bar Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{(currentPage - 1) * 20 + 1}</span> to{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(currentPage * 20, totalEngineers)}</span> of{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{totalEngineers}</span> engineers
              </div>

              <div className="flex items-center space-x-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  icon={<ChevronLeft className="w-4 h-4" />}
                >
                  Previous
                </Button>

                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  // Render compact pagination sequence (e.g. 1 2 3 ... N)
                  if (
                    pNum === 1 ||
                    pNum === totalPages ||
                    (pNum >= currentPage - 1 && pNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pNum}
                        onClick={() => handlePageChange(pNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${pNum === currentPage
                            ? 'bg-[var(--color-accent)] text-white'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                      >
                        {pNum}
                      </button>
                    );
                  }
                  if (pNum === currentPage - 2 || pNum === currentPage + 2) {
                    return <span key={pNum} className="px-1 text-slate-400 text-xs">...</span>;
                  }
                  return null;
                })}

                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  icon={<ChevronRight className="w-4 h-4" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SharePoint Photo Upload Modal */}
      {uploadTargetEng && (
        <EngineerPhotoUploadModal
          isOpen={!!uploadTargetEng}
          onClose={() => setUploadTargetEng(null)}
          engineerId={uploadTargetEng.id}
          engineerName={uploadTargetEng.name}
          orbitId={uploadTargetEng.orbitId}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
};
