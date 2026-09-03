import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { useCompanyOperationalAlerts } from '../hooks/useOperationalAlerts';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { Button } from '../components/forms/Button';
import { ScheduleCommentsCard } from '../components/schedule/ScheduleCommentsCard';

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

  const PIE_COLORS = ['#527E3A', '#A8BC8B', '#F1A67E', '#F6D4BA', '#3D5E2B'];

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Engineers"
            value={kpi.total_engineers}
            change={`${kpi.total_engineers} Certified`}
            subtitle={`${currentCompany.code} certified personnel`}
            icon={<Users className="w-5 h-5 text-stone-800" />}
            variant="sand"
            onClick={() => navigate('/engineers')}
          />
          <StatCard
            title="Engineers Deployed"
            value={kpi.deployed_engineers}
            change={`${kpi.utilization_rate}% Utilization`}
            changeType="positive"
            subtitle="On customer Fab sites"
            icon={<CheckCircle2 className="w-5 h-5 text-stone-800" />}
            variant="cream"
            onClick={() => navigate('/engineers')}
          />
          <StatCard
            title="Upcoming Travel"
            value={kpi.upcoming_travel_count}
            change={`${kpi.upcoming_travel_count} Scheduled`}
            changeType="neutral"
            subtitle="Flights & assignments"
            icon={<Plane className="w-5 h-5 text-stone-800" />}
            variant="ice"
            onClick={() => navigate('/travel')}
          />
          <StatCard
            title="Visa Expiring"
            value={kpi.expiring_visas_count}
            change={kpi.expiring_visas_count > 0 ? "Action Required" : "All Clear"}
            changeType={kpi.expiring_visas_count > 0 ? 'negative' : 'positive'}
            subtitle="Within next 30 days"
            icon={<AlertTriangle className="w-5 h-5 text-white" />}
            variant="orange"
            onClick={() => navigate('/visa')}
          />
          <StatCard
            title="Active Projects"
            value={kpi.active_projects_count}
            change={`${kpi.active_projects_count} Active`}
            changeType="positive"
            subtitle="Customer Fab installations"
            icon={<Building2 className="w-5 h-5 text-stone-800" />}
            variant="default"
            onClick={() => navigate('/schedule')}
          />
        </div>
      )}

      {/* Charts Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Deployment Chart */}
        <div className="lg:col-span-2 p-5 bg-[#FEFADC] border border-[#E8DEC8] rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-stone-900">
                Engineer Deployment Trend
              </h3>
              <p className="text-xs text-stone-500">Monthly field workforce allocation across global fabs</p>
            </div>
            <div className="flex items-center space-x-2 text-xs font-semibold">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#527E3A] inline-block" />
                <span>Deployed</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-stone-400">
                Loading Deployment Analytics...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={deploymentData}>
                  <defs>
                    <linearGradient id="colorDeployed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#527E3A" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#A8BC8B" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DEC8" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#78716C" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#78716C" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1C1917',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: '#FFFFFF' }}
                    labelStyle={{ color: '#FFFFFF' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Deployed"
                    stroke="#527E3A"
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
        <div className="p-5 bg-[#FEFADC] border border-[#E8DEC8] rounded-2xl shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-semibold text-stone-900">
              Workforce Status Distribution
            </h3>
            <p className="text-xs text-stone-500">Current allocation: Deployed, Support, & PTO</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            {isLoading ? (
              <div className="text-xs text-stone-400">Loading Status Distribution...</div>
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
                      <Cell key={`cell-${index}`} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1C1917',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: '#FFFFFF' }}
                    labelStyle={{ color: '#FFFFFF' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#E8DEC8] text-xs">
            {statusDistribution.map((item) => {
              const total = statusDistribution.reduce((acc, curr) => acc + curr.value, 0);
              const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center justify-between text-stone-700">
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
        <div className="p-5 bg-[#FEFADC] border border-[#E8DEC8] rounded-2xl shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-semibold text-stone-900">
              Fab Site Country Distribution
            </h3>
            <p className="text-xs text-stone-500">Geographic footprint of active assignments</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            {isLoading ? (
              <div className="text-xs text-stone-400">Loading Country Footprint...</div>
            ) : countryDistribution.length === 0 ? (
              <div className="text-xs text-stone-400">No active country assignments</div>
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
                      backgroundColor: '#1C1917',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: '#FFFFFF' }}
                    labelStyle={{ color: '#FFFFFF' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#E8DEC8] text-xs">
            {countryDistribution.slice(0, 3).map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-stone-700">
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

      {/* Schedule Comments Card */}
      <ScheduleCommentsCard />

      {/* Operational Intelligence Summary Card */}
      {user?.role !== 'Viewer' && (

        <div className="p-5 bg-[#FEFADC] border border-[#E8DEC8] rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-white rounded-xl border border-[#E8DEC8]">
              <ShieldAlert className="w-6 h-6 text-[#527E3A]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900 flex items-center space-x-2">
                <span>Operational Intelligence & Deterministic Exceptions</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-white text-[#527E3A] border border-[#E8DEC8] rounded-full">
                  {opAlerts?.length || 0}
                </span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
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
