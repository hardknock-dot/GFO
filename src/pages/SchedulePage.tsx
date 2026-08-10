import React, { useState } from 'react';
import { useSchedule } from '../hooks/useSchedule';
import { PageHeader } from '../components/layout/PageHeader';
import { Table } from '../components/common/Table';
import type { Column } from '../components/common/Table';
import { GlobalSearch } from '../components/common/GlobalSearch';
import { Dropdown } from '../components/forms/Dropdown';
import { Button } from '../components/forms/Button';
import type { Schedule } from '../types';
import { Plus, MapPin, Building2 } from 'lucide-react';

export const SchedulePage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const { data: res, isLoading, isError, refetch } = useSchedule({ search, status: statusFilter });
  const schedules = res?.data || [];

  const columns: Column<Schedule>[] = [
    { key: 'projectCode', header: 'Project Code', sortable: true, render: (s) => <span className="font-mono text-xs font-semibold text-[var(--color-secondary)]">{s.projectCode}</span> },
    { key: 'engineerName', header: 'Field Engineer', sortable: true, render: (s) => <span className="font-semibold text-slate-800 dark:text-slate-200">{s.engineerName}</span> },
    { key: 'customerName', header: 'Customer Fab', sortable: true, render: (s) => <div className="flex items-center space-x-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" /><span>{s.customerName}</span></div> },
    { key: 'siteLocation', header: 'Site Location', sortable: true, render: (s) => <div className="flex items-center space-x-1 text-xs text-slate-600 dark:text-slate-400"><MapPin className="w-3.5 h-3.5 text-slate-400" /><span>{s.siteLocation}</span></div> },
    { key: 'shiftType', header: 'Shift', render: (s) => <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600">{s.shiftType}</span> },
    { key: 'startDate', header: 'Start Date', sortable: true },
    { key: 'endDate', header: 'End Date', sortable: true },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (s) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          {s.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field Operations Schedule & Shifts"
        subtitle="Track semiconductor fab installations, emergency callouts, and shift rosters worldwide."
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={() => alert('FastAPI Create Schedule Endpoint')}>Create Schedule Assignment</Button>}
      />

      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <GlobalSearch onSearch={(q) => setSearch(q)} placeholder="Search by project code, engineer, customer fab..." />
        <div className="w-full sm:w-48">
          <Dropdown value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={['All', 'Active Assignment', 'Upcoming', 'Completed', 'Standby']} />
        </div>
      </div>

      <Table columns={columns} data={schedules} isLoading={isLoading} isError={isError} onRetry={refetch} emptyTitle="No Schedules Found" />
    </div>
  );
};
