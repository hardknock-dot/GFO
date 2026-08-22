import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanyOperationalAlerts } from '../hooks/useOperationalAlerts';
import { PageHeader } from '../components/layout/PageHeader';
import { GlobalSearch } from '../components/common/GlobalSearch';
import { Dropdown } from '../components/forms/Dropdown';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { ShieldAlert, ArrowUpRight, AlertTriangle, Info, BellOff } from 'lucide-react';

export const OperationalAlertsPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: opAlerts, isLoading, isError, refetch } = useCompanyOperationalAlerts();

  const [severityFilter, setSeverityFilter] = useState<'All' | 'warning' | 'info'>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  if (isError) {
    return <ErrorState onRetry={refetch} />;
  }

  // Derived filtered alerts list
  const filteredAlerts = (opAlerts || []).filter((alert) => {
    const matchesSeverity = severityFilter === 'All' || alert.severity === severityFilter;
    const matchesType = typeFilter === 'All' || alert.type === typeFilter;
    
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      alert.title.toLowerCase().includes(query) ||
      alert.message.toLowerCase().includes(query) ||
      alert.type.toLowerCase().includes(query);

    return matchesSeverity && matchesType && matchesSearch;
  });

  // Extract unique alert types for filter options
  const uniqueTypes = ['All', ...Array.from(new Set((opAlerts || []).map((a) => a.type)))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational Alerts"
        subtitle="Review deterministic data validation exceptions, travel scheduling conflicts, and pending compliance requirements."
        actions={
          <span className="text-xs font-mono font-semibold px-3 py-1.5 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 rounded-full flex items-center space-x-1.5 shadow-sm">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>{opAlerts?.length || 0} Total Exceptions</span>
          </span>
        }
      />

      {/* Control Filters Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <GlobalSearch
          onSearch={(q) => setSearchQuery(q)}
          placeholder="Search alerts by title, description..."
          className="max-w-md"
        />
        <div className="flex items-center gap-3">
          <Dropdown
            label="Severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            options={[
              { value: 'All', label: 'All Severities' },
              { value: 'warning', label: 'Warning Only' },
              { value: 'info', label: 'Info Only' },
            ]}
            className="w-40"
          />
          <Dropdown
            label="Category"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={uniqueTypes.map((t) => ({ value: t, label: t === 'All' ? 'All Categories' : t }))}
            className="w-44"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/40 flex items-center justify-center text-slate-400">
            <BellOff className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No operational alerts detected</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              All compliance checks, travel schedules, and performance validations match standard procedures.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAlerts.map((alert) => {
            const isWarning = alert.severity === 'warning';
            return (
              <div
                key={alert.id}
                onClick={() => {
                  if (alert.engineer_id) navigate(`/engineers/${alert.engineer_id}`);
                  else if (alert.schedule_id) navigate('/schedule');
                }}
                className={`p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl cursor-pointer hover:shadow-md transition-all duration-150 flex flex-col justify-between space-y-3 relative group overflow-hidden`}
              >
                {/* Visual Accent Indicator */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    isWarning ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                />
                
                <div className="space-y-2 pl-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-1.5">
                      {isWarning ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                      <span className="font-semibold text-slate-800 dark:text-slate-100 text-xs tracking-tight line-clamp-1">
                        {alert.title}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded-full font-bold border flex-shrink-0 ${
                        isWarning
                          ? 'bg-amber-100 text-amber-800 border-amber-200/60 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/40'
                          : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-100 dark:text-slate-300 dark:border-slate-200'
                      }`}
                    >
                      {alert.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-5">
                    {alert.message}
                  </p>
                </div>

                <div className="flex items-center justify-end text-[11px] text-[var(--color-secondary)] font-semibold border-t border-slate-100 dark:border-slate-800/40 pt-2.5 pl-1.5">
                  <span>Inspect Details</span>
                  <ArrowUpRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OperationalAlertsPage;
