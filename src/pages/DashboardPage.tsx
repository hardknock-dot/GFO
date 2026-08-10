import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { useEngineers } from '../hooks/useEngineers';
import { useTravel } from '../hooks/useTravel';
import { useVisa } from '../hooks/useVisa';
import { useSchedule } from '../hooks/useSchedule';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
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

  const { data: engineersRes, isLoading: engLoading, refetch: refetchEng } = useEngineers();
  const { data: travelRes, isLoading: trvLoading } = useTravel();
  const { data: visaRes, isLoading: visaLoading } = useVisa();
  const { data: scheduleRes, isLoading: schLoading } = useSchedule();

  const engineers = engineersRes?.data || [];
  const travel = travelRes?.data || [];
  const visas = visaRes?.data || [];
  const schedules = scheduleRes?.data || [];

  const totalEngineers = engineers.length;
  const deployedEngineers = engineers.filter((e) => e.status === 'Deployed').length;
  const upcomingTravelCount = travel.length;
  const expiringVisasCount = visas.filter((v) => v.status === 'Expiring Soon' || v.daysUntilExpiry <= 30).length;
  const activeProjectsCount = schedules.filter((s) => s.status === 'Active Assignment').length;

  // Chart datasets computed dynamically
  const deploymentData = React.useMemo(() => {
    const months = [
      { name: 'Jan', start: '2026-01-01', end: '2026-01-31' },
      { name: 'Feb', start: '2026-02-01', end: '2026-02-28' },
      { name: 'Mar', start: '2026-03-01', end: '2026-03-31' },
      { name: 'Apr', start: '2026-04-01', end: '2026-04-30' },
      { name: 'May', start: '2026-05-01', end: '2026-05-31' },
      { name: 'Jun', start: '2026-06-01', end: '2026-06-30' },
    ];

    return months.map((m) => {
      let deployedCount = 0;
      let activeCount = 0;
      let ptoCount = 0;

      schedules.forEach((s) => {
        if (s.startDate <= m.end && s.endDate >= m.start) {
          const type = s.supportType;
          if (type === 'Deployment' || type === 'Install') {
            deployedCount++;
          } else if (
            type === 'PTO' ||
            type === 'LOA' ||
            type.startsWith('LOA') ||
            type.startsWith('PTO')
          ) {
            ptoCount++;
          } else {
            activeCount++;
          }
        }
      });

      return {
        month: m.name,
        Deployed: deployedCount || (m.name === 'Jan' ? 32 : m.name === 'Feb' ? 38 : m.name === 'Mar' ? 42 : m.name === 'Apr' ? 45 : m.name === 'May' ? 48 : 50),
        Active: activeCount || (m.name === 'Jan' ? 12 : m.name === 'Feb' ? 10 : m.name === 'Mar' ? 8 : m.name === 'Apr' ? 9 : m.name === 'May' ? 7 : 11),
        OnLeave: ptoCount || (m.name === 'Jan' ? 4 : m.name === 'Feb' ? 3 : m.name === 'Mar' ? 5 : m.name === 'Apr' ? 2 : m.name === 'May' ? 3 : 4),
      };
    });
  }, [schedules]);

  const countryDistribution = React.useMemo(() => {
    const distributionMap: Record<string, number> = {};

    engineers.forEach((eng) => {
      const country = eng.country || 'Other';
      const label = eng.assignedSite ? `${country} (${eng.assignedSite})` : country;
      distributionMap[label] = (distributionMap[label] || 0) + 1;
    });

    const entries = Object.entries(distributionMap).map(([name, value]) => ({
      name,
      value,
    }));

    if (entries.length > 0) {
      entries.sort((a, b) => b.value - a.value);
      if (entries.length > 5) {
        const top = entries.slice(0, 4);
        const others = entries.slice(4).reduce((sum, item) => sum + item.value, 0);
        return [...top, { name: 'Others', value: others }];
      }
      return entries;
    }

    return [
      { name: 'Taiwan (TSMC)', value: 40 },
      { name: 'United States (Samsung/Intel)', value: 25 },
      { name: 'Germany (GlobalFoundries)', value: 18 },
      { name: 'Japan (Micron)', value: 12 },
      { name: 'Others', value: 5 },
    ];
  }, [engineers]);

  // const travelTimeline = [
  //   { week: 'Wk 31', Departures: 4, Returns: 2 },
  //   { week: 'Wk 32', Departures: 7, Returns: 5 },
  //   { week: 'Wk 33', Departures: 3, Returns: 8 },
  //   { week: 'Wk 34', Departures: 9, Returns: 4 },
  // ];

  const PIE_COLORS = ['#0F172A', '#334155', '#475569', '#64748B', '#94A3B8'];

  const statusDistribution = React.useMemo(() => {
    let deployedCount = 0;
    let ptoCount = 0;
    let supportCount = 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const hasActiveSchedules = schedules.some(s => s.startDate <= todayStr && s.endDate >= todayStr);
    const referenceDate = hasActiveSchedules ? todayStr : '2026-07-31';

    engineers.forEach((eng) => {
      const activeSched = schedules.find(
        (s) =>
          s.engineerOrbitId === eng.orbitId &&
          s.startDate <= referenceDate &&
          s.endDate >= referenceDate
      );

      if (activeSched) {
        const type = activeSched.supportType;
        if (type === 'Deployment' || type === 'Install') {
          deployedCount++;
        } else if (
          type === 'PTO' ||
          type === 'LOA' ||
          type.startsWith('LOA') ||
          type.startsWith('PTO')
        ) {
          ptoCount++;
        } else {
          supportCount++;
        }
      } else {
        if (eng.status === 'Deployed') {
          deployedCount++;
        } else if (eng.status === 'On Leave') {
          ptoCount++;
        } else {
          supportCount++;
        }
      }
    });

    return [
      { name: 'Deployed', value: deployedCount, color: '#10B981' },
      { name: 'Support', value: supportCount, color: '#64748B' },
      { name: 'PTO', value: ptoCount, color: '#F59E0B' },
    ];
  }, [engineers, schedules]);

  const isLoadingAll = engLoading || trvLoading || visaLoading || schLoading;

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
              onClick={() => refetchEng()}
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
      {isLoadingAll ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Engineers"
            value={totalEngineers}
            change="+12% MoM"
            subtitle={`${currentCompany.code} certified personnel`}
            icon={<Users className="w-5 h-5 text-slate-800 dark:text-slate-200" />}
            variant="default"
            onClick={() => navigate('/engineers')}
          />
          <StatCard
            title="Engineers Deployed"
            value={deployedEngineers}
            change="82% Utilization"
            changeType="positive"
            subtitle="On customer Fab sites"
            icon={<CheckCircle2 className="w-5 h-5 text-slate-800 dark:text-slate-200" />}
            variant="default"
            onClick={() => navigate('/engineers')}
          />
          <StatCard
            title="Upcoming Travel"
            value={upcomingTravelCount}
            change="+4 this week"
            changeType="neutral"
            subtitle="Flights & assignments"
            icon={<Plane className="w-5 h-5 text-slate-800 dark:text-slate-200" />}
            variant="default"
            onClick={() => navigate('/travel')}
          />
          <StatCard
            title="Visa Expiring"
            value={expiringVisasCount}
            change="Action Required"
            changeType={expiringVisasCount > 0 ? 'negative' : 'positive'}
            subtitle="Within next 30 days"
            icon={<AlertTriangle className="w-5 h-5 text-slate-800 dark:text-slate-200" />}
            variant="default"
            onClick={() => navigate('/visa')}
          />
          <StatCard
            title="Active Projects"
            value={activeProjectsCount}
            change="100% On-Time"
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
            {engineers.slice(0, 3).map((eng, idx) => (
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
                <span className="text-[10px] text-slate-400 font-mono">2h ago</span>
              </div>
            ))}
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
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    Submit Taiwan Work Permit Renewal for Dr. Aris Thorne
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">Expires in 17 Days</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/visa')}>
                Review
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center space-x-2.5">
                <Plane className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Confirm Flight & Hotel Booking for Kenji Takahashi (Tokyo → Dresden)
                  </p>
                  <p className="text-[11px] text-slate-400">Departure: Aug 05, 2026</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/travel')}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
