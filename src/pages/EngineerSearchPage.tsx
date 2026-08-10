import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEngineers } from '../hooks/useEngineers';
import { PageHeader } from '../components/layout/PageHeader';
import { Dropdown } from '../components/forms/Dropdown';
import { Button } from '../components/forms/Button';
import { GlobalSearch } from '../components/common/GlobalSearch';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import {
  Users,
  Search,
  Filter,
  Wrench,
  MapPin,
  ArrowRight,
  RotateCcw,
  Building2,
} from 'lucide-react';

export const EngineerSearchPage: React.FC = () => {
  const navigate = useNavigate();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [toolFilter, setToolFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [minExpFilter, setMinExpFilter] = useState<number>(0);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  const { data: res, isLoading, isError, refetch } = useEngineers({
    search,
    status: statusFilter,
    tool: toolFilter,
    country: countryFilter,
    level: levelFilter,
    minExperience: minExpFilter,
  });

  const engineers = res?.data || [];

  // Reset filters
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setToolFilter('All');
    setLevelFilter('All');
    setCountryFilter('All');
    setMinExpFilter(0);
  };

  const hasActiveFilters =
    search !== '' ||
    statusFilter !== 'All' ||
    toolFilter !== 'All' ||
    levelFilter !== 'All' ||
    countryFilter !== 'All' ||
    minExpFilter > 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Field Engineer Talent Gallery & Search"
        subtitle="Explore and query certified semiconductor equipment field engineers by tool chambers, skill certifications, experience, and deployment status."
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilterPanelOpen(!filterPanelOpen)}
              className="lg:hidden flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{filterPanelOpen ? 'Hide Filters' : 'Filter Panel'}</span>
            </button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetFilters}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              disabled={!hasActiveFilters}
            >
              Reset Filters
            </Button>
          </div>
        }
      />

      {/* Main Layout: Left Filter Sidebar + Right Gallery Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Sidebar Filter Panel */}
        <div
          className={`space-y-5 p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs transition-all ${
            filterPanelOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Filter className="w-4 h-4 text-[var(--color-secondary)]" />
              <span>Filter Engineers</span>
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">
              {engineers.length} Found
            </span>
          </div>

          {/* Search Query */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Keyword Search
            </label>
            <GlobalSearch
              onSearch={(q) => setSearch(q)}
              placeholder="Name, Orbit ID, Fab site..."
            />
          </div>

          {/* Tool Model / Chamber Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Primary Tool / Chamber
            </label>
            <Dropdown
              value={toolFilter}
              onChange={(e) => setToolFilter(e.target.value)}
              options={['All', 'Etch', 'SENSAI', 'Kiyo', 'Purion', 'ALTUS', 'CVD', 'ALD']}
            />
          </div>

          {/* Competency Level Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Competency Level
            </label>
            <Dropdown
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              options={[
                'All',
                'L1 Junior Engineer',
                'L2 Field Engineer',
                'L3 Senior Specialist',
                'Master Engineer',
              ]}
            />
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Deployment Status
            </label>
            <Dropdown
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={['All', 'Deployed', 'Active', 'On Leave', 'In Transit', 'Training']}
            />
          </div>

          {/* Country Location Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Country Location
            </label>
            <Dropdown
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              options={['All', 'Japan', 'Taiwan', 'USA', 'Germany', 'Singapore', 'India', 'Italy']}
            />
          </div>

          {/* Minimum Experience Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Minimum Experience
            </label>
            <select
              value={minExpFilter}
              onChange={(e) => setMinExpFilter(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-400"
            >
              <option value={0}>Any Experience</option>
              <option value={1}>1+ Years</option>
              <option value={3}>3+ Years</option>
              <option value={5}>5+ Years</option>
              <option value={8}>8+ Years</option>
              <option value={10}>10+ Years</option>
            </select>
          </div>

          {/* Clear Filters CTA */}
          {hasActiveFilters && (
            <div className="pt-2">
              <button
                onClick={handleResetFilters}
                className="w-full py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Gallery Cards Grid */}
        <div className="lg:col-span-3 space-y-4">
          {/* Active Filter Summary Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
            <div className="flex items-center space-x-2 text-xs">
              <Users className="w-4 h-4 text-[var(--color-secondary)]" />
              <span className="font-bold text-slate-900 dark:text-white">
                {engineers.length} Engineers Matched
              </span>
              {hasActiveFilters && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 font-mono">
                  Filtered View
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span>Click card to view complete profile</span>
            </div>
          </div>

          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 text-rose-600">
              <p className="font-semibold text-sm">Failed to load engineer gallery records.</p>
              <Button size="sm" onClick={() => refetch()} className="mt-3">
                Retry
              </Button>
            </div>
          ) : engineers.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <Search className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No Engineers Found
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No field engineers matched your filter parameters. Try clearing your search query or lowering experience thresholds.
              </p>
              <Button size="sm" variant="outline" onClick={handleResetFilters}>
                Reset Search Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {engineers.map((eng) => {
                const statusBadgeColors: Record<string, string> = {
                  Deployed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200',
                  Active: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
                  'On Leave': 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200',
                  'In Transit': 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200',
                  Training: 'bg-slate-50 text-slate-600 dark:bg-slate-900/60 dark:text-slate-400 border-slate-200 dark:border-slate-800',
                };

                return (
                  <div
                    key={eng.id}
                    onClick={() => navigate(`/engineers/${eng.id}`)}
                    className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
                  >
                    {/* Top Row: Avatar + Status + Orbit ID */}
                    <div className="flex items-start justify-between">
                      <div className="relative">
                        <img
                          src={
                            eng.avatarUrl ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                          }
                          alt={eng.name}
                          className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-800 group-hover:scale-105 transition-transform"
                        />
                        <span
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                            eng.status === 'Deployed'
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
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {eng.orbitId}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            statusBadgeColors[eng.status] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {eng.status}
                        </span>
                      </div>
                    </div>

                    {/* Middle Info: Name, Tool, Level */}
                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[var(--color-secondary)] transition-colors leading-tight">
                        {eng.name}
                      </h3>
                      {eng.goesBy && eng.goesBy !== eng.name && (
                        <p className="text-[11px] text-slate-400">Goes by: "{eng.goesBy}"</p>
                      )}

                      <div className="pt-1 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          <Wrench className="w-3 h-3 mr-1 text-slate-400" />
                          <span className="truncate max-w-[150px]">{eng.primaryTool}</span>
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
                          {eng.yearsExperience} Yrs Exp
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
                    <div className="pt-2 flex items-center justify-between text-xs font-semibold text-[var(--color-secondary)] group-hover:translate-x-0.5 transition-transform">
                      <span>View Full Profile</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
