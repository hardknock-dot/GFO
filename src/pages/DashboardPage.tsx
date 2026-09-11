import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { useCompanyOperationalAlerts } from '../hooks/useOperationalAlerts';
import { useCompanySettings } from '../hooks/useSettings';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { Button } from '../components/forms/Button';
import { ScheduleCommentsCard } from '../components/schedule/ScheduleCommentsCard';
import { WorldMapDistribution } from '../components/dashboard/WorldMapDistribution';

import {
  Users,
  CheckCircle2,
  Plane,
  AlertTriangle,
  FolderGit2,
  ArrowUpRight,
  RefreshCw,
  ShieldAlert,
  Building2,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const companyId = currentCompany.id === 'all-data' ? undefined : (currentCompany.company_id || currentCompany.id);
  const { data: companySettings } = useCompanySettings(companyId);
  const remarksAlertsEnabled = companySettings?.operational_remark_alerts_enabled ?? true;
  const { data, isLoading, isError, refetch } = useDashboard();
  const { data: opAlerts } = useCompanyOperationalAlerts();

  const kpi = data?.kpi || {
    total_engineers: 0,
    deployed_engineers: 0,
    utilization_rate: 0,
    upcoming_travel_count: 0,
    expiring_visas_count: 0,
    active_projects_count: 0,
  };

  const deploymentData = data?.deployment_trend || [];
  const statusDistribution = data?.status_distribution || [];
  const countryDistribution = data?.country_distribution || [];


  const getStatusColor = (item: { name: string; color?: string }, index: number) => {
    const s = item.name.toLowerCase();
    const companyId = currentCompany.company_id || currentCompany.id || currentCompany.code || '';

    // LAM Research Theme
    if (companyId.includes('11b9d863') || currentCompany.code === 'LAM') {
      if (s.includes('deploy')) return '#C1121F';
      if (s.includes('free') || s.includes('avail')) return '#669BBC';
      if (s.includes('support')) return '#8DA7BE';
      if (s.includes('pto') || s.includes('leave')) return '#2B3D41';
      return index === 0 ? '#C1121F' : index === 1 ? '#669BBC' : index === 2 ? '#8DA7BE' : '#2B3D41';
    }

    // Axcelis Technologies Theme
    if (companyId.includes('f81bd16c') || currentCompany.code === 'AXCELIS') {
      if (s.includes('deploy')) return '#A2D2FF';
      if (s.includes('free') || s.includes('avail')) return '#BDE0FE';
      if (s.includes('support')) return '#FFAFCC';
      if (s.includes('pto') || s.includes('leave')) return '#CDB4DB';
      return index === 0 ? '#A2D2FF' : index === 1 ? '#BDE0FE' : index === 2 ? '#FFAFCC' : '#CDB4DB';
    }

    // Vishay Semiconductor Theme
    if (companyId.includes('34d51cd0') || currentCompany.code === 'VISHAY') {
      if (s.includes('deploy')) return '#495867';
      if (s.includes('free') || s.includes('avail')) return '#A5A58D';
      if (s.includes('support')) return '#899D78';
      if (s.includes('pto') || s.includes('leave')) return '#741B21';
      return index === 0 ? '#495867' : index === 1 ? '#A5A58D' : index === 2 ? '#899D78' : '#741B21';
    }

    // Default / Master All Data Theme
    if (s.includes('deploy')) return '#606C38';
    if (s.includes('free') || s.includes('avail')) return '#2A9D8F';
    if (s.includes('support')) return '#DDA15E';
    if (s.includes('pto') || s.includes('leave')) return '#BC6C25';

    if (item.color) return item.color;

    // Fallback company theme colors
    const fallbackPalette = [
      currentCompany.primaryColor || '#606C38',
      currentCompany.secondaryColor || '#DDA15E',
      currentCompany.accentColor || '#BC6C25',
      currentCompany.textColor || '#283618',
    ];
    return fallbackPalette[index % fallbackPalette.length];
  };

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`${currentCompany.name} Executive Dashboard`}
          subtitle="Global field operations summary, deployment analytics, and critical mobility alerts."
        />
        <ErrorState
          title="Dashboard Analytics Exception"
          message="Failed to connect to the PostgreSQL operational dashboard API. Please check backend connection."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`${currentCompany.name} Executive Dashboard`}
        subtitle="Global field operations summary, deployment analytics, and critical mobility alerts."
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Sync Data
            </Button>
            {user?.role !== 'Viewer' && (
              <Button
                size="sm"
                onClick={() => navigate('/upload')}
                icon={<FolderGit2 className="w-3.5 h-3.5" />}
              >
                Bulk Data Import
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <StatCard
            title="Total Engineers"
            value={kpi.total_engineers}
            change={`${kpi.total_engineers} Certified`}
            subtitle={`${currentCompany.code} certified personnel`}
            icon={<Users className="w-5 h-5" />}
            variant="cream"
            onClick={() => navigate('/engineers')}
          />
          <StatCard
            title="Engineers Deployed"
            value={kpi.deployed_engineers}
            change={`${kpi.utilization_rate}% Utilization`}
            changeType="positive"
            subtitle="On customer Fab sites"
            icon={<CheckCircle2 className="w-5 h-5" />}
            variant="ice"
            onClick={() => navigate('/engineers')}
          />
          <StatCard
            title="Upcoming Travel"
            value={kpi.upcoming_travel_count}
            change={`${kpi.upcoming_travel_count} Scheduled`}
            changeType="neutral"
            subtitle="Flights & assignments"
            icon={<Plane className="w-5 h-5" />}
            variant="sand"
            onClick={() => navigate('/travel')}
          />
          <StatCard
            title="Visa Expiring"
            value={kpi.expiring_visas_count}
            change={kpi.expiring_visas_count > 0 ? "Action Required" : "All Clear"}
            changeType={kpi.expiring_visas_count > 0 ? 'negative' : 'positive'}
            subtitle="Within next 30 days"
            icon={<AlertTriangle className="w-5 h-5" />}
            variant="orange"
            onClick={() => navigate('/visa')}
          />
          <StatCard
            title="Active Projects"
            value={kpi.active_projects_count}
            change={`${kpi.active_projects_count} Active`}
            changeType="positive"
            subtitle="Customer Fab installations"
            icon={<Building2 className="w-5 h-5" />}
            variant="default"
            onClick={() => navigate('/schedule')}
          />
        </div>
      )}

      {/* Charts Visualization Section */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        {/* Main Deployment Chart (decreased width by 50px on desktop) */}
        <div className="w-full lg:w-[calc(50%-50px)] flex-shrink-0 p-5 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-md shadow-black/20 space-y-4 flex flex-col justify-between transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                Engineer Deployment Trend
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] opacity-80">Monthly field workforce allocation across global fabs</p>
            </div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-[var(--color-text-primary)]">
              <span className="flex items-center space-x-1">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: currentCompany.primaryColor || '#78B654' }}
                />
                <span>Deployed</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-[var(--color-text-secondary)]">
                Loading Deployment Analytics...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={deploymentData}>
                  <defs>
                    <linearGradient id="colorDeployed" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={currentCompany.primaryColor || '#78B654'}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor={currentCompany.secondaryColor || '#A8BC8B'}
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--color-text-secondary)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--color-text-secondary)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-sidebar, #1C1917)',
                      borderRadius: '8px',
                      color: 'var(--color-sidebar-text, #FFFFFF)',
                      border: '1px solid var(--color-border, transparent)',
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: 'var(--color-sidebar-text, #FFFFFF)' }}
                    labelStyle={{ color: 'var(--color-sidebar-text, #FFFFFF)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Deployed"
                    stroke={currentCompany.primaryColor || '#78B654'}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorDeployed)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Workforce Status Distribution Donut Chart */}
        <div className="w-full lg:flex-1 p-5 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-md shadow-black/20 space-y-4 flex flex-col justify-between transition-colors duration-200">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
              Workforce Status Distribution
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] opacity-80">Current allocation: Deployed, Free (Available), Support, & PTO</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            {isLoading ? (
              <div className="text-xs text-[var(--color-text-secondary)]">Loading Status Distribution...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getStatusColor(entry, index)} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-sidebar, #1C1917)',
                      borderRadius: '8px',
                      color: 'var(--color-sidebar-text, #FFFFFF)',
                      border: '1px solid var(--color-border, transparent)',
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: 'var(--color-sidebar-text, #FFFFFF)' }}
                    labelStyle={{ color: 'var(--color-sidebar-text, #FFFFFF)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[var(--color-border)] text-xs">
            {statusDistribution.map((item, index) => {
              const total = statusDistribution.reduce((acc, curr) => acc + curr.value, 0);
              const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
              const sliceColor = getStatusColor(item, index);
              return (
                <div key={item.name} className="flex items-center justify-between text-[var(--color-text-primary)]">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: sliceColor }} />
                    <span className="truncate max-w-[160px]">{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.value} ({percentage}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* World Map Engineer Location Distribution (increased width by 50px on desktop) */}
        <div className="w-full lg:w-[calc(25%+50px)] flex-shrink-0 flex flex-col">
          <WorldMapDistribution
            data={countryDistribution}
            totalEngineers={kpi.total_engineers}
            className="h-full"
          />
        </div>
      </div>

      {/* Schedule Comments Card (Controlled by operational_remark_alerts_enabled setting) */}
      {remarksAlertsEnabled && <ScheduleCommentsCard />}

      {/* Operational Intelligence Summary Card */}
      {user?.role !== 'Viewer' && (

        <div className="p-5 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-md shadow-black/20 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors duration-200">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-white/40 dark:bg-slate-800/40 rounded-xl border border-[var(--color-border)] backdrop-blur-xs">
              <ShieldAlert className="w-6 h-6 text-[var(--color-primary)]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)] flex items-center space-x-2">
                <span>Operational Intelligence & Deterministic Exceptions</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-white/60 dark:bg-slate-800/60 text-[var(--color-primary)] border border-[var(--color-border)] rounded-full">
                  {opAlerts?.length || 0}
                </span>
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] opacity-80 mt-0.5">
                Review and address compliance validation issues, travel scheduling delays, or leaves anomalies.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/alerts')}
            icon={<ArrowUpRight className="w-4 h-4" />}
          >
            Review Exceptions
          </Button>
        </div>
      )}
    </div>
  );
};
