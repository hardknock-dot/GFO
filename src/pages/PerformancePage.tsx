import React, { useState } from 'react';
import { usePerformance } from '../hooks/usePerformance';
import { PageHeader } from '../components/layout/PageHeader';
import { Table } from '../components/common/Table';
import type { Column } from '../components/common/Table';
import { GlobalSearch } from '../components/common/GlobalSearch';
import { Button } from '../components/forms/Button';
import type { Performance } from '../types';
import { Star, Award } from 'lucide-react';

export const PerformancePage: React.FC = () => {
  const [search, setSearch] = useState('');

  const { data: res, isLoading, isError, refetch } = usePerformance({ search });
  const perfList = res?.data || [];

  const columns: Column<Performance>[] = [
    { key: 'engineerName', header: 'Field Engineer', sortable: true, render: (p) => <span className="font-semibold text-slate-800 dark:text-slate-200">{p.engineerName}</span> },
    { key: 'rating', header: 'Performance Rating', sortable: true, render: (p) => <span className="font-bold text-amber-500 flex items-center"><Star className="w-3.5 h-3.5 fill-current mr-1" />{p.rating} / 5.0</span> },
    { key: 'projectsCompleted', header: 'Completed Fabs', sortable: true, render: (p) => <span className="font-mono text-xs">{p.projectsCompleted} Projects</span> },
    { key: 'customerFeedbackScore', header: 'Customer CSAT %', sortable: true, render: (p) => <span className="font-semibold text-emerald-600">{p.customerFeedbackScore}% Satisfaction</span> },
    { key: 'onTimeArrivalRate', header: 'On-Time Arrival', sortable: true, render: (p) => <span className="font-semibold text-slate-700 dark:text-slate-300">{p.onTimeArrivalRate}% On-Time</span> },
    { key: 'reviewer', header: 'Reviewing Director', render: (p) => <span className="text-xs text-slate-500">{p.reviewer}</span> },
    { key: 'reviewDate', header: 'Review Date', sortable: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field Engineer Performance Evaluations"
        subtitle="Track customer feedback ratings, on-time installation metrics, and annual review notes."
        actions={<Button icon={<Award className="w-4 h-4" />} onClick={() => alert('FastAPI Performance Evaluation Endpoint')}>Add Evaluation</Button>}
      />

      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm">
        <GlobalSearch onSearch={(q) => setSearch(q)} placeholder="Search engineer name, reviewer, rating score..." />
      </div>

      <Table columns={columns} data={perfList} isLoading={isLoading} isError={isError} onRetry={refetch} emptyTitle="No Performance Logs Found" />
    </div>
  );
};
