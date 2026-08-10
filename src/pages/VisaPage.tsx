import React, { useState } from 'react';
import { useVisa, useRenewVisa } from '../hooks/useVisa';
import { PageHeader } from '../components/layout/PageHeader';
import { Table } from '../components/common/Table';
import type { Column } from '../components/common/Table';
import { GlobalSearch } from '../components/common/GlobalSearch';
import { Dropdown } from '../components/forms/Dropdown';
import { Button } from '../components/forms/Button';
import type { Visa } from '../types';
import { RefreshCw, Plus } from 'lucide-react';

export const VisaPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const { data: res, isLoading, isError, refetch } = useVisa({ search, status: statusFilter });
  const visaList = res?.data || [];

  const renewMutation = useRenewVisa();

  const columns: Column<Visa>[] = [
    { key: 'engineerName', header: 'Field Engineer', sortable: true, render: (v) => <span className="font-semibold text-slate-800 dark:text-slate-200">{v.engineerName}</span> },
    { key: 'country', header: 'Jurisdiction / Country', sortable: true, render: (v) => <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{v.country}</span> },
    { key: 'visaType', header: 'Work Permit / Visa Class', sortable: true, render: (v) => <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600">{v.visaType}</span> },
    { key: 'passportNumber', header: 'Passport No.', render: (v) => <span className="font-mono text-xs text-slate-500">{v.passportNumber}</span> },
    { key: 'expiryDate', header: 'Expiry Date', sortable: true },
    {
      key: 'daysUntilExpiry',
      header: 'Days Left',
      sortable: true,
      render: (v) => (
        <span className={`font-mono text-xs font-bold ${v.daysUntilExpiry <= 30 ? 'text-rose-600' : 'text-slate-600'}`}>
          {v.daysUntilExpiry > 0 ? `${v.daysUntilExpiry} Days` : 'EXPIRED'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (v) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            v.status === 'Expiring Soon'
              ? 'bg-amber-100 text-amber-800 border-amber-200'
              : v.status === 'Expired'
              ? 'bg-rose-100 text-rose-800 border-rose-200'
              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
          }`}
        >
          {v.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (v) => (
        <Button
          size="sm"
          variant="outline"
          loading={renewMutation.isPending}
          onClick={() => renewMutation.mutate(v.id)}
          icon={<RefreshCw className="w-3.5 h-3.5 text-slate-500" />}
        >
          Renew Visa
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Work Permit & Visa Tracking"
        subtitle="Automated expiration tracking, passport compliance, and renewal workflows for field engineers."
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={() => alert('FastAPI Register Visa Endpoint')}>Register New Visa</Button>}
      />

      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <GlobalSearch onSearch={(q) => setSearch(q)} placeholder="Search by engineer, jurisdiction country, passport number..." />
        <div className="w-full sm:w-48">
          <Dropdown value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={['All', 'Valid', 'Expiring Soon', 'Expired', 'In Progress']} />
        </div>
      </div>

      <Table columns={columns} data={visaList} isLoading={isLoading} isError={isError} onRetry={refetch} emptyTitle="No Visa Records Found" />
    </div>
  );
};
