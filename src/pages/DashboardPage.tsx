import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { useDashboard } from '../hooks/useDashboard';
import { useCompanyOperationalAlerts } from '../hooks/useOperationalAlerts';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { Button } from '../components/forms/Button';
import {
  Users,
  CheckCircle2,
  Plane,
  AlertTriangle,
  FolderGit2,
  ArrowUpRight,
  Clock,
  CheckSquare,
  Building2,
  RefreshCw,
  ShieldAlert,
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
  const recentActivity = data?.recent_activity || [];
  const actionChecklist = data?.action_checklist || [];

  const PIE_COLORS = ['#0F172A', '#334155', '#475569', '#64748B', '#94A3B8'];

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
            <Button
              size="sm"
              onClick={() => navigate('/upload')}
              icon={<FolderGit2 className="w-3.5 h-3.5" />}
            >
              Bulk Data Import
            </Button>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Engineers"
            value={kpi.total_engineers}
            change={`${kpi.total_engineers} Certified`}
            subtitle={`${currentCompany.code} certified personnel`}
            icon={<Users className="w-5 h-5 text-slate-800 dark:text-slate-200" />}
            variant="default"
            onClick={() => navigate('/engineers')}
          />
          <StatCard
            title="Engineers Deployed"
            value={kpi.deployed_engineers}
            change={`${kpi.utilization_rate}% Utilization`}
            changeType="positive"
            subtitle="On customer Fab sites"
            icon={<CheckCircle2 className="w-5 h-5 text-slate-800 dark:text-slate-200" />}
            variant="default"
            onClick={() => navigate('/engineers')}
          />
          <StatCard
            title="Upcoming Travel"
            value={kpi.upcoming_travel_count}
            change={`${kpi.upcoming_travel_count} Scheduled`}
            changeType="neutral"
            subtitle="Flights & assignments"
            icon={<Plane className="w-5 h-5 text-slate-800 dark:text-slate-200" />}
            variant="default"
            onClick={() => navigate('/travel')}
          />
          <StatCard
            title="Visa Expiring"
            value={kpi.expiring_visas_count}
            change={kpi.expiring_visas_count > 0 ? "Action Required" : "All Clear"}
            changeType={kpi.expiring_visas_count > 0 ? 'negative' : 'positive'}
            subtitle="Within next 30 days"
            icon={<AlertTriangle className="w-5 h-5 text-slate-800 dark:text-slate-200" />}
            variant="default"
            onClick={() => navigate('/visa')}
          />
          <StatCard
            title="Active Projects"
            value={kpi.active_projects_count}
            change={`${kpi.active_projects_count} Active`}
            changeType="positive"
            subtitle="Customer Fab installations"
            icon={<Building2 className="w-5 h-5 text-slate-800 dark:text-slate-200" />}
            variant="default"
            onClick={() => navigate('/schedule')}
          />
        </div>
      )}

      {/* Charts Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Deployment Chart */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Engineer Deployment Trend
              </h3>
              <p className="text-xs text-slate-400">Monthly field workforce allocation across global fabs</p>
            </div>
            <div className="flex items-center space-x-2 text-xs font-semibold">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-secondary)] inline-block" />
                <span>Deployed</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading Deployment Analytics...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={deploymentData}>
                  <defs>
                    <linearGradient id="colorDeployed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={currentCompany.secondaryColor} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={currentCompany.secondaryColor} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#BAE6FD" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '8px',
                      color: '#FFF',
                      border: 'none',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Deployed"
                    stroke={currentCompany.secondaryColor}
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
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Workforce Status Distribution
            </h3>
            <p className="text-xs text-slate-400">Current allocation: Deployed, Support, & PTO</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            {isLoading ? (
              <div className="text-xs text-slate-400">Loading Status Distribution...</div>
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
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {statusDistribution.map((item) => {
              const total = statusDistribution.reduce((acc, curr) => acc + curr.value, 0);
              const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="truncate max-w-[160px]">{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.value} ({percentage}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Country Distribution Donut Chart */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Fab Site Country Distribution
            </h3>
            <p className="text-xs text-slate-400">Geographic footprint of active assignments</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            {isLoading ? (
              <div className="text-xs text-slate-400">Loading Country Footprint...</div>
            ) : countryDistribution.length === 0 ? (
              <div className="text-xs text-slate-400">No active country assignments</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={countryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {countryDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {countryDistribution.slice(0, 3).map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx] }} />
                  <span className="truncate max-w-[160px]">{item.name}</span>
                </div>
                <span className="font-semibold">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity & Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Component */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[var(--color-secondary)]" />
              <span>Recent Field Operations Activity</span>
            </h3>
            <button
              onClick={() => navigate('/schedule')}
              className="text-xs text-[var(--color-secondary)] font-medium hover:underline flex items-center"
            >
              View All <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No recent field operations activity recorded.</p>
            ) : (
              recentActivity.map((eng, idx) => (
                <div
                  key={eng.id || idx}
                  className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60"
                >
                  <img src={eng.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover mt-0.5" />
                  <div className="flex-1 text-xs space-y-0.5">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      <span className="font-bold text-slate-900 dark:text-white">{eng.name}</span> assigned to{' '}
                      <span className="text-[var(--color-secondary)] font-semibold">{eng.assignedSite || 'Fab Site'}</span>
                    </p>
                    <p className="text-slate-400">Primary Chamber: {eng.primaryTool} • {eng.country}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{eng.timeAgo}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Tasks Component */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
              <CheckSquare className="w-4 h-4 text-emerald-500" />
              <span>Pending Action Checklist</span>
            </h3>
            <button
              onClick={() => navigate('/visa')}
              className="text-xs text-[var(--color-secondary)] font-medium hover:underline flex items-center"
            >
              Manage Visas <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            {actionChecklist.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">All clear! No pending actions require attention.</p>
            ) : (
              actionChecklist.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    item.type === 'visa'
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    {item.type === 'visa' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    ) : (
                      <Plane className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`font-semibold ${
                          item.type === 'visa' ? 'text-amber-900 dark:text-amber-200' : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {item.title}
                      </p>
                      <p
                        className={`text-[11px] ${
                          item.type === 'visa' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(item.targetRoute)}>
                    {item.actionText}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Operational Intelligence & Deterministic Exception Detection */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <span>Operational Intelligence & Deterministic Exceptions</span>
          </h3>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 rounded-full">
            {opAlerts?.length || 0} Conditions Detected
          </span>
        </div>

        {!opAlerts || opAlerts.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800">
            No operational exceptions detected for {currentCompany.name}. Operational data is consistent.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {opAlerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => {
                  if (alert.engineer_id) navigate(`/engineers/${alert.engineer_id}`);
                  else if (alert.schedule_id) navigate('/schedule');
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all hover:shadow-sm flex flex-col justify-between space-y-2 ${
                  alert.severity === 'warning'
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40 hover:border-amber-300'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/60 hover:border-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-semibold text-xs ${
                        alert.severity === 'warning' ? 'text-amber-900 dark:text-amber-200' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {alert.title}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        alert.severity === 'warning'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {alert.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">{alert.message}</p>
                </div>
                <div className="flex items-center justify-end text-[11px] text-[var(--color-secondary)] font-medium">
                  <span>Inspect Details</span>
                  <ArrowUpRight className="w-3 h-3 ml-0.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
