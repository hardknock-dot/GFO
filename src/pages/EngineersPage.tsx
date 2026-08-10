import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEngineers } from '../hooks/useEngineers';
import type { Engineer } from '../types';
import { PageHeader } from '../components/layout/PageHeader';
import { Table } from '../components/common/Table';
import type { Column } from '../components/common/Table';
import { GlobalSearch } from '../components/common/GlobalSearch';
import { Dropdown } from '../components/forms/Dropdown';
import { Button } from '../components/forms/Button';
import { UserPlus, Eye, MapPin, Wrench } from 'lucide-react';

export const EngineersPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');

  const { data: res, isLoading, isError, refetch } = useEngineers({
    search,
    status: statusFilter,
    country: countryFilter,
  });

  const engineers = res?.data || [];

  const columns: Column<Engineer>[] = [
    {
      key: 'name',
      header: 'Field Engineer',
      sortable: true,
      render: (item) => (
        <div className="flex items-center space-x-3">
          <img
            src={item.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt=""
            className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
          />
          <div>
            <p className="font-semibold text-slate-900 dark:text-white hover:text-[var(--color-secondary)] transition-colors">
              {item.name}
            </p>
            <p className="text-[11px] text-slate-400">{item.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'orbitId',
      header: 'Orbit ID',
      sortable: true,
      render: (item) => (
        <span className="font-mono text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded">
          {item.orbitId}
        </span>
      ),
    },
    {
      key: 'customerId',
      header: 'Customer ID',
      sortable: true,
      render: (item) => <span className="font-mono text-xs text-slate-500">{item.customerId}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (item) => {
        const badgeColors: Record<string, string> = {
          Deployed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200',
          Active: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
          'On Leave': 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200',
          'In Transit': 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200',
          Training: 'bg-slate-50 text-slate-600 dark:bg-slate-900/60 dark:text-slate-400 border-slate-200 dark:border-slate-800',
        };
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              badgeColors[item.status] || 'bg-slate-100 text-slate-700'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
            {item.status}
          </span>
        );
      },
    },
    {
      key: 'primaryTool',
      header: 'Primary Tool',
      sortable: true,
      render: (item) => (
        <div className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-200">
          <Wrench className="w-3.5 h-3.5 text-slate-400" />
          <span className="truncate max-w-[160px]">{item.primaryTool}</span>
        </div>
      ),
    },
    {
      key: 'level',
      header: 'Competency Level',
      sortable: true,
      render: (item) => (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
          {item.level}
        </span>
      ),
    },
    {
      key: 'country',
      header: 'Country Location',
      sortable: true,
      render: (item) => (
        <div className="flex items-center space-x-1 text-xs text-slate-600 dark:text-slate-400">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>{item.country}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (item) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/engineers/${item.id}`);
          }}
          icon={<Eye className="w-3.5 h-3.5 text-[var(--color-secondary)]" />}
        >
          View Profile
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field Engineer Operations Directory"
        subtitle="Manage semiconductor equipment field engineers, competency certifications, site deployments, and profiles."
        actions={
          <Button icon={<UserPlus className="w-4 h-4" />} onClick={() => alert('FastAPI Create Engineer Endpoint Modal Triggered')}>
            Add New Engineer
          </Button>
        }
      />

      {/* Control Bar: Global Search & Dropdown Filters */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <GlobalSearch onSearch={(q) => setSearch(q)} placeholder="Search by name, Orbit ID, tool chamber, or country..." />

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="w-full sm:w-36">
            <Dropdown
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={['All', 'Deployed', 'Active', 'On Leave', 'In Transit', 'Training']}
            />
          </div>
          <div className="w-full sm:w-36">
            <Dropdown
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              options={['All', 'United States', 'Germany', 'Japan', 'Taiwan', 'Italy']}
            />
          </div>
        </div>
      </div>

      {/* Enterprise Data Table */}
      <Table
        columns={columns}
        data={engineers}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onRowClick={(item) => navigate(`/engineers/${item.id}`)}
        emptyTitle="No Engineers Found"
        emptyDescription="No field engineer records match your current filter parameters."
      />
    </div>
  );
};
