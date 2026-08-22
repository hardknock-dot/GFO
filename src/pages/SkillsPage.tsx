import React, { useState } from 'react';
import { useSkills } from '../hooks/useSkills';
import { PageHeader } from '../components/layout/PageHeader';
import { Table } from '../components/common/Table';
import type { Column } from '../components/common/Table';
import { GlobalSearch } from '../components/common/GlobalSearch';
import { Dropdown } from '../components/forms/Dropdown';
import { Button } from '../components/forms/Button';
import type { Skill } from '../types';
import { CheckCircle2, Plus } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export const SkillsPage: React.FC = () => {
  const { canEdit } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const { data: res, isLoading, isError, refetch } = useSkills({ search, category: categoryFilter });
  const skills = res?.data || [];

  const columns: Column<Skill>[] = [
    { key: 'toolModel', header: 'Tool Model / Chamber', sortable: true, render: (s) => <span className="font-semibold text-slate-800 dark:text-slate-200">{s.toolModel}</span> },
    { key: 'category', header: 'Category', sortable: true, render: (s) => <span className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 font-mono">{s.category}</span> },
    { key: 'competencyLevel', header: 'Competency Level', sortable: true, render: (s) => <span className="font-semibold text-[var(--color-secondary)]">{s.competencyLevel}</span> },
    {
      key: 'certified',
      header: 'Certification Status',
      render: (s) => (
        <span className="inline-flex items-center text-xs font-semibold text-emerald-600">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          {s.certified ? 'Certified' : 'Pending Audit'}
        </span>
      ),
    },
    { key: 'certificationAuthority', header: 'Certifying Authority', render: (s) => <span className="text-xs text-slate-500">{s.certificationAuthority || 'Global Technical Academy'}</span> },
    { key: 'lastAssessedDate', header: 'Audit Date', sortable: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Semiconductor Tool Skills Matrix"
        subtitle="Cross-company competency mapping for Etch, Deposition, Metrology, Clean, and Ion Implantation modules."
        actions={canEdit ? <Button icon={<Plus className="w-4 h-4" />} onClick={() => alert('FastAPI Skill Certification Endpoint')}>Log Skill Assessment</Button> : undefined}
      />

      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <GlobalSearch onSearch={(q) => setSearch(q)} placeholder="Search by tool chamber model, category, or competency level..." />
        <div className="w-full sm:w-48">
          <Dropdown value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} options={['All', 'Etch', 'Deposition', 'Clean', 'Metrology', 'Ion Implantation']} />
        </div>
      </div>

      <Table columns={columns} data={skills} isLoading={isLoading} isError={isError} onRetry={refetch} emptyTitle="No Skills Competencies Found" />
    </div>
  );
};
