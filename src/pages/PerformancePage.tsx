import React, { useState } from 'react';
import { usePerformance, useCreatePerformance, useUpdatePerformance, useDeletePerformance } from '../hooks/usePerformance';
import { useSchedule } from '../hooks/useSchedule';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Table } from '../components/common/Table';
import type { Column } from '../components/common/Table';
import { GlobalSearch } from '../components/common/GlobalSearch';
import { Button } from '../components/forms/Button';
import { TextInput } from '../components/forms/TextInput';
import { DatePicker } from '../components/forms/DatePicker';
import { Modal } from '../components/forms/Modal';
import { SearchableDropdown } from '../components/forms/SearchableDropdown';
import type { Performance } from '../types';
import { Star, Edit, Trash2, Plus } from 'lucide-react';

export const PerformancePage: React.FC = () => {
  const { currentCompany } = useCompany();
  const { canEdit } = useAuth();
  const companyId = currentCompany.id === 'all-data' ? undefined : (currentCompany.company_id || currentCompany.id);

  const [search, setSearch] = useState('');

  // Query performance records with active company context
  const { data: res, isLoading, isError, refetch } = usePerformance({
    search,
    companyId,
  });
  const perfList = res?.data || [];

  // Query company-filtered schedules list for creation dropdown (up to 200 schedules)
  const { data: schedulesRes } = useSchedule({
    companyId: companyId || undefined,
    pageSize: 200,
  });
  const schedulesList = schedulesRes?.data || [];

  // Mutations
  const createPerfMutation = useCreatePerformance();
  const updatePerfMutation = useUpdatePerformance();
  const deletePerfMutation = useDeletePerformance();

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPerf, setSelectedPerf] = useState<Performance | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    scheduleId: '',
    actualStartDate: '',
    actualEndDate: '',
    escalation: false,
    escalationReason: '',
    feedback: '',
    score: '5.0',
    attachment: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleOpenAddModal = () => {
    setSelectedPerf(null);
    setFormData({
      scheduleId: schedulesList[0]?.id || '',
      actualStartDate: '',
      actualEndDate: '',
      escalation: false,
      escalationReason: '',
      feedback: '',
      score: '5.0',
      attachment: '',
    });
    setFormErrors({});
    setApiError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Performance) => {
    setSelectedPerf(p);
    setFormData({
      scheduleId: p.scheduleId || '',
      actualStartDate: p.actualStartDate || '',
      actualEndDate: p.actualEndDate || '',
      escalation: !!p.escalation,
      escalationReason: p.escalationReason || '',
      feedback: p.feedback || '',
      score: p.score !== undefined ? String(p.score) : '5.0',
      attachment: p.attachment || '',
    });
    setFormErrors({});
    setApiError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (p: Performance) => {
    setSelectedPerf(p);
    setApiError(null);
    setIsDeleteModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!selectedPerf && !formData.scheduleId) errors.scheduleId = 'Schedule Assignment is required';
    
    if (formData.actualStartDate && formData.actualEndDate) {
      if (new Date(formData.actualEndDate) < new Date(formData.actualStartDate)) {
        errors.actualEndDate = 'Actual End Date cannot be earlier than Actual Start Date';
      }
    }

    if (formData.escalation && !formData.escalationReason.trim()) {
      errors.escalationReason = 'Escalation reason is required when escalation is enabled.';
    }

    const valScore = Number(formData.score);
    if (isNaN(valScore) || valScore < 1.0 || valScore > 5.0) {
      errors.score = 'Performance rating score must be between 1.0 and 5.0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    const payload: Partial<Performance> = {
      actualStartDate: formData.actualStartDate || undefined,
      actualEndDate: formData.actualEndDate || undefined,
      escalation: formData.escalation,
      escalationReason: formData.escalation ? formData.escalationReason : null,
      feedback: formData.feedback || undefined,
      score: Number(formData.score),
      attachment: formData.attachment || undefined,
    };

    if (selectedPerf) {
      updatePerfMutation.mutate(
        { id: selectedPerf.id, data: payload },
        {
          onSuccess: () => {
            setSuccessMessage('Performance record updated successfully.');
            setTimeout(() => {
              setIsModalOpen(false);
              setSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to update performance record.';
            setApiError(msg);
          },
        }
      );
    } else {
      createPerfMutation.mutate(
        { scheduleId: formData.scheduleId, data: payload },
        {
          onSuccess: () => {
            setSuccessMessage('Performance record created successfully.');
            setTimeout(() => {
              setIsModalOpen(false);
              setSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to create performance record.';
            setApiError(msg);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!selectedPerf) return;
    setApiError(null);
    deletePerfMutation.mutate(selectedPerf.id, {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        setSelectedPerf(null);
        alert('Performance record deleted successfully.');
      },
      onError: (err: any) => {
        const msg = err.message || err.details?.detail || 'Failed to delete performance record.';
        setApiError(msg);
      },
    });
  };

  const columns: Column<Performance>[] = [
    { key: 'engineerName', header: 'Engineer Name', sortable: true, render: (p) => <span className="font-semibold text-slate-800 dark:text-slate-200">{p.engineerName}</span> },
    { key: 'rating', header: 'Performance Rating', sortable: true, render: (p) => <span className="font-bold text-amber-500 flex items-center"><Star className="w-3.5 h-3.5 fill-current mr-1" />{p.rating} / 5.0</span> },
    { key: 'actualStartDate', header: 'Actual Start', sortable: true, render: (p) => <span>{p.actualStartDate || 'N/A'}</span> },
    { key: 'actualEndDate', header: 'Actual End', sortable: true, render: (p) => <span>{p.actualEndDate || 'N/A'}</span> },
    {
      key: 'escalation',
      header: 'Escalation',
      sortable: true,
      render: (p) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${p.escalation ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'}`}>
          {p.escalation ? 'Yes' : 'No'}
        </span>
      ),
    },
    { key: 'reviewer', header: 'Reviewing Director', render: (p) => <span className="text-xs text-slate-500">{p.reviewer}</span> },
    { key: 'notes', header: 'Feedback / Notes', render: (p) => <span className="text-xs text-slate-500 line-clamp-1">{p.notes || 'N/A'}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) => (
        canEdit ? (
          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenEditModal(p)}
              icon={<Edit className="w-3.5 h-3.5 text-blue-500" />}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenDeleteModal(p)}
              icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
            >
              Delete
            </Button>
          </div>
        ) : null
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field Engineer Performance Evaluations"
        subtitle="Track customer feedback ratings, on-time installation metrics, and annual review notes."
        actions={
          canEdit ? (
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenAddModal}
              disabled={schedulesList.length === 0}
            >
              Add Evaluation
            </Button>
          ) : undefined
        }
      />

      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm">
        <GlobalSearch onSearch={(q) => setSearch(q)} placeholder="Search engineer name, reviewer, rating score..." />
      </div>

      <Table columns={columns} data={perfList} isLoading={isLoading} isError={isError} onRetry={refetch} emptyTitle="No Performance Logs Found" />

      {/* Add / Edit Performance Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormErrors({});
          setApiError(null);
          setSuccessMessage(null);
        }}
        title={selectedPerf ? 'Edit Performance Evaluation' : 'Record Performance Evaluation'}
        subtitle={selectedPerf ? 'Modify logged feedback and rating score.' : 'Record a new performance evaluation.'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {apiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {apiError}
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs">
              {successMessage}
            </div>
          )}

          {!selectedPerf && (
            <SearchableDropdown
              label="Schedule Assignment"
              value={formData.scheduleId}
              onChange={(val) => setFormData({ ...formData, scheduleId: val })}
              options={schedulesList.map((sch) => {
                const fabInfo = [sch.fabCity, sch.fabSite || sch.country].filter(Boolean).join(', ');
                return {
                  value: sch.id,
                  label: `${sch.engineerName} | ${sch.supportType} - ${fabInfo} (Start Date: ${sch.startDate || 'N/A'})`,
                };
              })}
              placeholder="Select a schedule assignment..."
              searchPlaceholder="Search engineer name, support type..."
              required
              error={formErrors.scheduleId}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Actual Start Date"
              value={formData.actualStartDate}
              onChange={(e) => setFormData({ ...formData, actualStartDate: e.target.value })}
            />
            <DatePicker
              label="Actual End Date"
              value={formData.actualEndDate}
              onChange={(e) => setFormData({ ...formData, actualEndDate: e.target.value })}
              error={formErrors.actualEndDate}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Score (1.0 - 5.0)"
              value={formData.score}
              onChange={(e) => setFormData({ ...formData, score: e.target.value })}
              error={formErrors.score}
              required
            />
            <TextInput
              label="Attachment URL"
              value={formData.attachment}
              onChange={(e) => setFormData({ ...formData, attachment: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-2 py-2">
            <input
              type="checkbox"
              id="global-perf-escalation"
              checked={formData.escalation}
              onChange={(e) => setFormData({ ...formData, escalation: e.target.checked })}
              className="rounded text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
            />
            <label htmlFor="global-perf-escalation" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Customer Escalation Initiated
            </label>
          </div>

          {formData.escalation && (
            <TextInput
              label="Escalation Reason"
              value={formData.escalationReason}
              onChange={(e) => setFormData({ ...formData, escalationReason: e.target.value })}
              error={formErrors.escalationReason}
              placeholder="Detail reasons for customer escalation..."
              required
            />
          )}

          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Feedback / Notes
            </label>
            <textarea
              value={formData.feedback}
              onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
              className="w-full rounded-lg border bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3.5 py-2 transition-colors duration-150 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent min-h-[80px]"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createPerfMutation.isPending || updatePerfMutation.isPending}
            >
              {createPerfMutation.isPending || updatePerfMutation.isPending
                ? (selectedPerf ? 'Saving...' : 'Recording...')
                : (selectedPerf ? 'Save Changes' : 'Record Evaluation')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal for Performance */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setApiError(null);
        }}
        title="Delete Performance Evaluation"
        subtitle="Confirm deletion of evaluation record."
      >
        <div className="space-y-4">
          {apiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {apiError}
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete this performance record? This action cannot be undone.
          </p>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setApiError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              loading={deletePerfMutation.isPending}
            >
              {deletePerfMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
