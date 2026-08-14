import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { useReportsSummary, useCategoryReport } from '../hooks/useReports';
import { downloadReportCsv } from '../services/reports';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { Table } from '../components/common/Table';
import type { Column } from '../components/common/Table';
import { Button } from '../components/forms/Button';
import { DatePicker } from '../components/forms/DatePicker';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import {
  Users,
  Calendar,
  Wrench,
  FileCheck,
  Clock,
  Plane,
  TrendingUp,
  CalendarX,
  AlertTriangle,
  Download,
  Filter,
  BarChart3,
  Layers,
  RotateCcw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const companyId = currentCompany.id === 'all-data' ? undefined : (currentCompany.company_id || currentCompany.id);

  const [activeCategory, setActiveCategory] = useState<string>('workforce');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedDistKey, setSelectedDistKey] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Queries
  const {
    data: summary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    refetch: refetchSummary,
  } = useReportsSummary(companyId, startDate, endDate);

  const {
    data: categoryData,
    isLoading: isCategoryLoading,
    isError: isCategoryError,
    refetch: refetchCategory,
  } = useCategoryReport(activeCategory, companyId, startDate, endDate);

  const categories = [
    { id: 'workforce', label: 'Workforce', icon: Users },
    { id: 'schedules', label: 'Schedules', icon: Calendar },
    { id: 'skills', label: 'Skills & Tools', icon: Wrench },
    { id: 'visa', label: 'Visas & Permits', icon: FileCheck },
    { id: 'leaves', label: 'Leaves', icon: Clock },
    { id: 'travel', label: 'Travel', icon: Plane },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'missed-schedules', label: 'Missed Schedules', icon: CalendarX },
    { id: 'operational', label: 'Operational Exceptions', icon: AlertTriangle },
  ];

  // Sync selected distribution key when categoryData loads or category changes
  useEffect(() => {
    if (categoryData?.distributions) {
      const keys = Object.keys(categoryData.distributions);
      if (keys.length > 0) {
        setSelectedDistKey(keys[0]);
      } else {
        setSelectedDistKey('');
      }
    } else {
      setSelectedDistKey('');
    }
  }, [categoryData, activeCategory]);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      await downloadReportCsv(activeCategory, companyId, startDate, endDate);
    } catch (err) {
      alert('Failed to export report CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  const pageTitle = currentCompany.id === 'all-data'
    ? 'Reports — All Companies'
    : `Reports — ${currentCompany.name}`;

  // Prepare chart data from active distribution selection
  const distKeys = categoryData?.distributions ? Object.keys(categoryData.distributions) : [];
  const currentDistKey = selectedDistKey || distKeys[0];
  const activeDist = currentDistKey && categoryData?.distributions ? categoryData.distributions[currentDistKey] || [] : [];

  const chartData = activeDist.map((d) => ({
    name: d.label,
    count: d.count,
  }));

  // Build dynamic table columns based on category items
  const buildTableColumns = (): Column<any>[] => {
    if (!categoryData?.items || categoryData.items.length === 0) return [];
    const sample = categoryData.items[0];
    const keys = Object.keys(sample).filter((k) => k !== 'id');

    return keys.map((key) => ({
      key,
      header: key.replace(/_/g, ' ').toUpperCase(),
      render: (item: any) => {
        const val = item[key];
        if (typeof val === 'boolean') {
          return (
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${val ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              {val ? 'Yes' : 'No'}
            </span>
          );
        }
        if (key === 'severity') {
          const colors: Record<string, string> = {
            critical: 'bg-rose-100 text-rose-800 border-rose-200',
            warning: 'bg-amber-100 text-amber-800 border-amber-200',
            info: 'bg-blue-100 text-blue-800 border-blue-200',
          };
          return (
            <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${colors[String(val).toLowerCase()] || 'bg-slate-100 text-slate-800'}`}>
              {String(val)}
            </span>
          );
        }
        return <span className="text-xs text-slate-800 dark:text-slate-200">{val !== null && val !== undefined ? String(val) : 'N/A'}</span>;
      },
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        subtitle="Comprehensive management analytics, workforce metrics, performance scores, and exportable executive reports."
        actions={
          <Button
            loading={isExporting}
            onClick={handleExportCsv}
            icon={<Download className="w-4 h-4" />}
          >
            Export {activeCategory.replace('-', ' ').toUpperCase()} CSV
          </Button>
        }
      />

      {/* Date Filter & Scope Controls Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Filter className="w-4 h-4 text-[var(--color-secondary)]" />
          <span>Report Scope Filters:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[var(--color-secondary)] font-mono">
            {summary?.company_name || currentCompany.name}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="w-40">
            <DatePicker
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
            />
          </div>
          <span className="text-slate-400">to</span>
          <div className="w-40">
            <DatePicker
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
            />
          </div>
          {(startDate || endDate) && (
            <Button
              size="sm"
              variant="outline"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
            >
              Reset Date Filter
            </Button>
          )}
        </div>
      </div>

      {/* Executive Management Summary KPI Cards */}
      {isSummaryLoading ? (
        <CardSkeleton />
      ) : isSummaryError || !summary ? (
        <ErrorState onRetry={refetchSummary} message="Failed to load executive summary metrics." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Workforce"
            value={summary.total_engineers}
            icon={<Users className="w-5 h-5 text-blue-500" />}
            subtitle={`${summary.total_skills} Skills Logged`}
          />
          <StatCard
            title="Field Schedules"
            value={summary.total_schedules}
            icon={<Calendar className="w-5 h-5 text-emerald-500" />}
            subtitle={`${summary.active_schedules} Active • ${summary.upcoming_schedules} Upcoming`}
          />
          <StatCard
            title="Avg Performance Score"
            value={summary.avg_performance_score !== null && summary.avg_performance_score !== undefined ? `${summary.avg_performance_score} / 5.0` : 'N/A'}
            icon={<TrendingUp className="w-5 h-5 text-amber-500" />}
            subtitle={`${summary.total_performances} Evaluated Assignments`}
          />
          <StatCard
            title="Operational Exceptions"
            value={summary.total_operational_alerts}
            icon={<AlertTriangle className="w-5 h-5 text-rose-500" />}
            subtitle={`${summary.warning_alerts_count} Active Warnings`}
          />
        </div>
      )}

      {/* Report Category Selection Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-0.5">
        {categories.map((c) => {
          const Icon = c.icon;
          const isActive = activeCategory === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all duration-150 whitespace-nowrap ${
                isActive
                  ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white bg-slate-50 dark:bg-slate-800/40 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Category Analytics & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Analytics Chart */}
        <div className="lg:col-span-1 p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-[var(--color-secondary)]" />
              <span>Distribution Breakdown</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {categoryData?.total_count || 0} Total
            </span>
          </div>

          {/* Distribution metric toggle if multiple exist */}
          {distKeys.length > 1 && (
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
              {distKeys.map((dk) => (
                <button
                  key={dk}
                  onClick={() => setSelectedDistKey(dk)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors uppercase tracking-wider ${
                    currentDistKey === dk
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {dk.replace('by_', '')}
                </button>
              ))}
            </div>
          )}

          {isCategoryLoading ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">Loading chart data...</div>
          ) : isCategoryError || chartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-4 text-xs text-slate-400">
              <Layers className="w-8 h-8 mb-2 text-slate-300" />
              <span>No distribution data available for the selected scope or date range.</span>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category Data Items Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {activeCategory.replace('-', ' ')} Operational Records
            </h3>
            <span className="text-xs text-slate-500">
              Showing {categoryData?.items?.length || 0} records
            </span>
          </div>

          <Table
            columns={buildTableColumns()}
            data={categoryData?.items || []}
            isLoading={isCategoryLoading}
            isError={isCategoryError}
            onRetry={refetchCategory}
            onRowClick={(item) => {
              if (item.engineer_id || item.orbit_id) {
                navigate(`/engineers/${item.engineer_id || item.id}`);
              } else if (item.project_code || item.schedule_id) {
                navigate('/schedule');
              }
            }}
            emptyTitle={`No ${activeCategory.replace('-', ' ')} records found for selected filters`}
            emptyDescription="Adjust your company tenant or date range filters to view records."
          />
        </div>
      </div>
    </div>
  );
};
