import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMissedSchedules, useCreateMissedSchedule, useUpdateMissedSchedule, useDeleteMissedSchedule } from '../hooks/useMissedSchedules';
import { useSchedule } from '../hooks/useSchedule';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Table } from '../components/common/Table';
import type { Column } from '../components/common/Table';
import { GlobalSearch } from '../components/common/GlobalSearch';
import { Button } from '../components/forms/Button';
import { DatePicker } from '../components/forms/DatePicker';
import { Modal } from '../components/forms/Modal';
import { SearchableDropdown } from '../components/forms/SearchableDropdown';
import type { MissedSchedule } from '../types';
import { Plus, Edit, Trash2, User } from 'lucide-react';

export const MissedSchedulesPage: React.FC = () => {
  const { currentCompany } = useCompany();
  const { canEdit } = useAuth();
  const companyId = currentCompany.id === 'all-data' ? undefined : (currentCompany.company_id || currentCompany.id);

  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');

  // Query missed schedule records with active company context
  const { data: res, isLoading, isError, refetch } = useMissedSchedules({
    search,
    companyId,
  });
  const missedSchedules = res?.data || [];

  // Query company-filtered schedule list for creation dropdown
  const { data: schedulesRes } = useSchedule(
    companyId ? { companyId } : undefined
  );
  const schedulesList = schedulesRes?.data || [];

  // Mutations
  const createMissedScheduleMutation = useCreateMissedSchedule();
  const updateMissedScheduleMutation = useUpdateMissedSchedule();
  const deleteMissedScheduleMutation = useDeleteMissedSchedule();

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMissedSchedule, setSelectedMissedSchedule] = useState<MissedSchedule | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    scheduleId: '',
    requestedStartDate: '',
    requestedEndDate: '',
    actualStartDate: '',
    actualEndDate: '',
    reason: '',
    evidence: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleOpenAddModal = () => {
    setSelectedMissedSchedule(null);
    const matchedSchedule = schedulesList.find(s => s.id === search) || schedulesList[0];
    setFormData({
      scheduleId: matchedSchedule?.id || '',
      requestedStartDate: matchedSchedule?.startDate || '',
      requestedEndDate: matchedSchedule?.endDate || '',
      actualStartDate: '',
      actualEndDate: '',
      reason: '',
      evidence: '',
    });
    setFormErrors({});
    setApiError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ms: MissedSchedule) => {
    setSelectedMissedSchedule(ms);
    setFormData({
      scheduleId: ms.scheduleId || '',
      requestedStartDate: ms.requestedStartDate || '',
      requestedEndDate: ms.requestedEndDate || '',
      actualStartDate: ms.actualStartDate || '',
      actualEndDate: ms.actualEndDate || '',
      reason: ms.reason || ms.reasonForChange || '',
      evidence: ms.evidence || ms.notesAttachEvidence || '',
    });
    setFormErrors({});
    setApiError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (ms: MissedSchedule) => {
    setSelectedMissedSchedule(ms);
    setApiError(null);
    setIsDeleteModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!selectedMissedSchedule && !formData.scheduleId) errors.scheduleId = 'Schedule Assignment is required';

    if (formData.requestedStartDate && formData.requestedEndDate) {
      if (new Date(formData.requestedEndDate) < new Date(formData.requestedStartDate)) {
        errors.requestedEndDate = 'Requested End Date cannot be earlier than Requested Start Date';
      }
    }

    if (formData.actualStartDate && formData.actualEndDate) {
      if (new Date(formData.actualEndDate) < new Date(formData.actualStartDate)) {
        errors.actualEndDate = 'Actual End Date cannot be earlier than Actual Start Date';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    const payload: Partial<MissedSchedule> = {
      requestedStartDate: formData.requestedStartDate || undefined,
      requestedEndDate: formData.requestedEndDate || undefined,
      actualStartDate: formData.actualStartDate || undefined,
      actualEndDate: formData.actualEndDate || undefined,
      reason: formData.reason,
      evidence: formData.evidence,
    };

    if (selectedMissedSchedule) {
      updateMissedScheduleMutation.mutate(
        { id: selectedMissedSchedule.id, data: payload },
        {
          onSuccess: () => {
            setSuccessMessage('Missed schedule record updated successfully.');
            setTimeout(() => {
              setIsModalOpen(false);
              setSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to update missed schedule record.';
            setApiError(msg);
          },
        }
      );
    } else {
      createMissedScheduleMutation.mutate(
        { scheduleId: formData.scheduleId, data: payload },
        {
          onSuccess: () => {
            setSuccessMessage('Missed schedule record created successfully.');
            setTimeout(() => {
              setIsModalOpen(false);
              setSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to create missed schedule record.';
            setApiError(msg);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!selectedMissedSchedule) return;
    setApiError(null);
    deleteMissedScheduleMutation.mutate(selectedMissedSchedule.id, {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        setSelectedMissedSchedule(null);
        alert('Missed schedule record deleted successfully.');
      },
      onError: (err: any) => {
        const msg = err.message || err.details?.detail || 'Failed to delete missed schedule record.';
        setApiError(msg);
      },
    });
  };

  const columns: Column<MissedSchedule>[] = [
    {
      key: 'engineerName',
      header: 'Field Engineer',
      sortable: true,
      render: (ms) => (
        <div className="flex items-center space-x-2">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">{ms.engineerName}</span>
        </div>
      ),
    },
    {
      key: 'requestedRange',
      header: 'Requested Window',
      render: (ms) => (
        <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
          {ms.requestedStartDate || 'N/A'} → {ms.requestedEndDate || 'N/A'}
        </span>
      ),
    },
    {
      key: 'actualRange',
      header: 'Actual Window',
      render: (ms) => (
        <span className="text-xs font-mono text-amber-700 dark:text-amber-400 font-semibold">
          {ms.actualStartDate || 'N/A'} → {ms.actualEndDate || 'N/A'}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason for Change / Delay',
      sortable: true,
      render: (ms) => <span>{ms.reason || ms.reasonForChange || 'No reason provided'}</span>,
    },
    {
      key: 'evidence',
      header: 'Evidence Reference',
      render: (ms) => <span className="text-xs text-slate-500 italic">{ms.evidence || ms.notesAttachEvidence || 'None'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (ms) => (
        canEdit ? (
          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenEditModal(ms)}
              icon={<Edit className="w-3.5 h-3.5 text-blue-500" />}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenDeleteModal(ms)}
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
        title="Missed Schedule Log"
        subtitle="Monitor schedule deviations, customer delays, requested vs. actual window shifts, and evidence."
        actions={
          canEdit ? (
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenAddModal}
              disabled={schedulesList.length === 0}
            >
              Log Missed Schedule
            </Button>
          ) : undefined
        }
      />

      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <GlobalSearch initialValue={search} onSearch={(q) => setSearch(q)} placeholder="Search by engineer, reason, evidence..." />
      </div>

      <Table
        columns={columns}
        data={missedSchedules}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        emptyTitle="No Missed Schedule Records Found"
        emptyDescription="Click Log Missed Schedule to record a new schedule deviation."
      />

      {/* Add / Edit Missed Schedule Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormErrors({});
          setApiError(null);
          setSuccessMessage(null);
        }}
        title={selectedMissedSchedule ? 'Edit Missed Schedule' : 'Log Missed Schedule'}
        subtitle={selectedMissedSchedule ? 'Modify schedule deviation details.' : 'Record a new schedule deviation.'}
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

          {!selectedMissedSchedule && (
            <SearchableDropdown
              label="Target Schedule Assignment"
              value={formData.scheduleId}
              onChange={(val) => {
                const matched = schedulesList.find((s) => s.id === val);
                setFormData({
                  ...formData,
                  scheduleId: val,
                  requestedStartDate: matched?.startDate || '',
                  requestedEndDate: matched?.endDate || '',
                });
              }}
              options={schedulesList.map((sch) => ({
                value: sch.id,
                label: `${sch.engineerName} - ${sch.supportType} (${sch.fabSite || ''})`,
              }))}
              placeholder="Select a schedule assignment..."
              searchPlaceholder="Search engineer name, support type..."
              required
              error={formErrors.scheduleId}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Requested Start Date"
              value={formData.requestedStartDate}
              onChange={(e) => setFormData({ ...formData, requestedStartDate: e.target.value })}
              error={formErrors.requestedStartDate}
            />
            <DatePicker
              label="Requested End Date"
              value={formData.requestedEndDate}
              onChange={(e) => setFormData({ ...formData, requestedEndDate: e.target.value })}
              error={formErrors.requestedEndDate}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Actual Start Date"
              value={formData.actualStartDate}
              onChange={(e) => setFormData({ ...formData, actualStartDate: e.target.value })}
              error={formErrors.actualStartDate}
            />
            <DatePicker
              label="Actual End Date"
              value={formData.actualEndDate}
              onChange={(e) => setFormData({ ...formData, actualEndDate: e.target.value })}
              error={formErrors.actualEndDate}
            />
          </div>

          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Reason for Change / Delay
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full rounded-lg border bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3.5 py-2 transition-colors duration-150 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent min-h-[70px]"
              placeholder="Explain why the schedule was missed or modified..."
            />
          </div>

          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Evidence / Notes Reference
            </label>
            <textarea
              value={formData.evidence}
              onChange={(e) => setFormData({ ...formData, evidence: e.target.value })}
              className="w-full rounded-lg border bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3.5 py-2 transition-colors duration-150 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent min-h-[70px]"
              placeholder="Attach customer notes, email references, or documentation links..."
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
              loading={createMissedScheduleMutation.isPending || updateMissedScheduleMutation.isPending}
            >
              {createMissedScheduleMutation.isPending || updateMissedScheduleMutation.isPending
                ? (selectedMissedSchedule ? 'Saving...' : 'Logging...')
                : (selectedMissedSchedule ? 'Save Changes' : 'Log Missed Schedule')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal for Missed Schedule */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setApiError(null);
        }}
        title="Delete Missed Schedule Record"
        subtitle="Confirm deletion of schedule deviation record."
      >
        <div className="space-y-4">
          {apiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {apiError}
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete this missed schedule record? This action cannot be undone.
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
              loading={deleteMissedScheduleMutation.isPending}
            >
              {deleteMissedScheduleMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
