import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEngineers } from '../hooks/useEngineers';
import { useSchedule } from '../hooks/useSchedule';
import { useTravel } from '../hooks/useTravel';
import { useVisa } from '../hooks/useVisa';
import { useSkills } from '../hooks/useSkills';
import { usePerformance } from '../hooks/usePerformance';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { Table } from '../components/common/Table';
import type { Column } from '../components/common/Table';
import { GlobalSearch } from '../components/common/GlobalSearch';
import { Dropdown } from '../components/forms/Dropdown';
import { Button } from '../components/forms/Button';
import type { Engineer, Schedule, Travel, Visa, Skill, Performance } from '../types';
import {
  Users,
  Calendar,
  Plane,
  FileCheck,
  Wrench,
  TrendingUp,
  Eye,
  Download,
  Filter,
} from 'lucide-react';

export const AllDataPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<'engineers' | 'schedules' | 'travel' | 'visas' | 'skills' | 'performance'>('engineers');
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('All');

  const { data: engineersRes, isLoading: engLoading } = useEngineers({ search });
  const { data: scheduleRes, isLoading: schLoading } = useSchedule({ search });
  const { data: travelRes, isLoading: trvLoading } = useTravel({ search });
  const { data: visaRes, isLoading: visaLoading } = useVisa({ search });
  const { data: skillsRes, isLoading: sklLoading } = useSkills({ search });
  const { data: perfRes, isLoading: perfLoading } = usePerformance({ search });

  const allEngineers = engineersRes?.data || [];
  const allSchedules = scheduleRes?.data || [];
  const allTravel = travelRes?.data || [];
  const allVisas = visaRes?.data || [];
  const allSkills = skillsRes?.data || [];
  const allPerformance = perfRes?.data || [];

  // Filter dataset by company if selected
  const filteredEngineers = companyFilter === 'All'
    ? allEngineers
    : allEngineers.filter((e) => e.customerId.toLowerCase().includes(companyFilter.toLowerCase()) || e.email.toLowerCase().includes(companyFilter.toLowerCase()));

  const moduleTabs = [
    { id: 'engineers', label: `All Engineers (${filteredEngineers.length})`, icon: Users },
    { id: 'schedules', label: `All Schedules (${allSchedules.length})`, icon: Calendar },
    { id: 'travel', label: `All Travel (${allTravel.length})`, icon: Plane },
    { id: 'visas', label: `All Visas (${allVisas.length})`, icon: FileCheck },
    { id: 'skills', label: `All Skills Matrix (${allSkills.length})`, icon: Wrench },
    { id: 'performance', label: `All Performance (${allPerformance.length})`, icon: TrendingUp },
  ];

  // Column configurations per module
  const engineerColumns: Column<Engineer>[] = [
    {
      key: 'name',
      header: 'Field Engineer',
      sortable: true,
      render: (item) => (
        <div className="flex items-center space-x-3">
          <img
            src={item.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt=""
            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
          />
          <div>
            <p className="font-semibold text-slate-900 dark:text-white hover:underline">{item.name}</p>
            <p className="text-[11px] text-slate-400">{item.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'orbitId', header: 'Orbit ID', sortable: true, render: (i) => <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">{i.orbitId}</span> },
    { key: 'customerId', header: 'Customer Ref', sortable: true, render: (i) => <span className="font-mono text-xs text-slate-500">{i.customerId}</span> },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (i) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
          {i.status}
        </span>
      ),
    },
    { key: 'primaryTool', header: 'Primary Tool', sortable: true },
    { key: 'level', header: 'Competency Level', sortable: true },
    { key: 'country', header: 'Country Location', sortable: true },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (i) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/engineers/${i.id}`);
          }}
          icon={<Eye className="w-3.5 h-3.5" />}
        >
          View Profile
        </Button>
      ),
    },
  ];

  const scheduleColumns: Column<Schedule>[] = [
    { key: 'projectCode', header: 'Project Code', sortable: true, render: (s) => <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{s.projectCode}</span> },
    { key: 'engineerName', header: 'Engineer Name', sortable: true },
    { key: 'customerName', header: 'Customer Fab Site', sortable: true },
    { key: 'siteLocation', header: 'Fab Location', sortable: true },
    { key: 'shiftType', header: 'Shift' },
    { key: 'startDate', header: 'Start Date', sortable: true },
    { key: 'endDate', header: 'End Date', sortable: true },
    { key: 'status', header: 'Status', render: (s) => <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">{s.status}</span> },
  ];

  const travelColumns: Column<Travel>[] = [
    { key: 'engineerName', header: 'Engineer Name', sortable: true },
    { key: 'originCountry', header: 'Origin', sortable: true },
    { key: 'destinationCountry', header: 'Destination', sortable: true, render: (t) => <span className="font-semibold text-slate-900 dark:text-white">{t.destinationCountry}</span> },
    { key: 'departureDate', header: 'Departure Date', sortable: true },
    { key: 'returnDate', header: 'Return Date', sortable: true },
    { key: 'flightNumber', header: 'Flight No.', render: (t) => <span className="font-mono text-xs">{t.flightNumber}</span> },
    { key: 'status', header: 'Status', render: (t) => <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800">{t.status}</span> },
  ];

  const visaColumns: Column<Visa>[] = [
    { key: 'engineerName', header: 'Engineer Name', sortable: true },
    { key: 'country', header: 'Jurisdiction', sortable: true },
    { key: 'visaType', header: 'Visa / Permit Class', sortable: true },
    { key: 'passportNumber', header: 'Passport No.', render: (v) => <span className="font-mono text-xs">{v.passportNumber}</span> },
    { key: 'expiryDate', header: 'Expiry Date', sortable: true },
    { key: 'daysUntilExpiry', header: 'Days Left', sortable: true, render: (v) => <span className="font-mono text-xs font-bold">{v.daysUntilExpiry > 0 ? `${v.daysUntilExpiry} Days` : 'EXPIRED'}</span> },
    { key: 'status', header: 'Status', render: (v) => <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800">{v.status}</span> },
  ];

  const skillColumns: Column<Skill>[] = [
    { key: 'toolModel', header: 'Tool Model / Chamber', sortable: true },
    { key: 'category', header: 'Process Category', sortable: true },
    { key: 'competencyLevel', header: 'Competency Level', sortable: true },
    { key: 'certified', header: 'Certification Status', render: (sk) => <span className="text-xs font-semibold">{sk.certified ? 'Certified' : 'Pending Audit'}</span> },
    { key: 'lastAssessedDate', header: 'Audit Date', sortable: true },
  ];

  const performanceColumns: Column<Performance>[] = [
    { key: 'engineerName', header: 'Engineer Name', sortable: true },
    { key: 'rating', header: 'Rating Score', sortable: true, render: (p) => <span className="font-bold">★ {p.rating} / 5.0</span> },
    { key: 'projectsCompleted', header: 'Projects Done', sortable: true },
    { key: 'customerFeedbackScore', header: 'CSAT %', sortable: true, render: (p) => `${p.customerFeedbackScore}%` },
    { key: 'onTimeArrivalRate', header: 'On-Time Rate %', sortable: true, render: (p) => `${p.onTimeArrivalRate}%` },
    { key: 'reviewer', header: 'Reviewer' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Global Operations Master Directory (All Data)"
        subtitle="Aggregated multi-tenant data center compiling total field engineers, schedules, travel, visas, and tool skills across all companies."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => alert('Exporting Master All Data CSV Workbook...')}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export Master Dataset
          </Button>
        }
      />

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Engineers (All)"
          value={allEngineers.length}
          subtitle="Aggregated field workforce"
          icon={<Users className="w-5 h-5" />}
          onClick={() => setActiveModule('engineers')}
        />
        <StatCard
          title="Total Schedules"
          value={allSchedules.length}
          subtitle="Fab assignments & shifts"
          icon={<Calendar className="w-5 h-5" />}
          onClick={() => setActiveModule('schedules')}
        />
        <StatCard
          title="Total Travel Ops"
          value={allTravel.length}
          subtitle="Flight & hotel itineraries"
          icon={<Plane className="w-5 h-5" />}
          onClick={() => setActiveModule('travel')}
        />
        <StatCard
          title="Total Visas Tracked"
          value={allVisas.length}
          subtitle="Work permits & passports"
          icon={<FileCheck className="w-5 h-5" />}
          onClick={() => setActiveModule('visas')}
        />
        <StatCard
          title="Tool Competencies"
          value={allSkills.length}
          subtitle="Chamber certifications"
          icon={<Wrench className="w-5 h-5" />}
          onClick={() => setActiveModule('skills')}
        />
      </div>

      {/* Control Bar: Global Search & Company Selector */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <GlobalSearch onSearch={(q) => setSearch(q)} placeholder="Search across all engineers, fab sites, project codes, flight numbers, or tools..." />

        <div className="w-full sm:w-48 flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <Dropdown
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            options={['All', 'LAM Research', 'Axcelis']}
          />
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-0.5">
        {moduleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeModule === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveModule(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all duration-150 whitespace-nowrap ${
                isActive
                  ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white bg-white dark:bg-slate-900 rounded-t-lg shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Data Table based on active tab */}
      {activeModule === 'engineers' && (
        <Table
          columns={engineerColumns}
          data={filteredEngineers}
          isLoading={engLoading}
          onRowClick={(item) => navigate(`/engineers/${item.id}`)}
          emptyTitle="No Engineers Match Query"
        />
      )}

      {activeModule === 'schedules' && (
        <Table
          columns={scheduleColumns}
          data={allSchedules}
          isLoading={schLoading}
          emptyTitle="No Schedules Match Query"
        />
      )}

      {activeModule === 'travel' && (
        <Table
          columns={travelColumns}
          data={allTravel}
          isLoading={trvLoading}
          emptyTitle="No Travel Records Match Query"
        />
      )}

      {activeModule === 'visas' && (
        <Table
          columns={visaColumns}
          data={allVisas}
          isLoading={visaLoading}
          emptyTitle="No Visa Records Match Query"
        />
      )}

      {activeModule === 'skills' && (
        <Table
          columns={skillColumns}
          data={allSkills}
          isLoading={sklLoading}
          emptyTitle="No Skill Competencies Match Query"
        />
      )}

      {activeModule === 'performance' && (
        <Table
          columns={performanceColumns}
          data={allPerformance}
          isLoading={perfLoading}
          emptyTitle="No Performance Evaluations Match Query"
        />
      )}
    </div>
  );
};
