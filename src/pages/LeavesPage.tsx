import React, { useState } from 'react';
import { useLeaves, useCreateLeave, useUpdateLeave, useDeleteLeave } from '../hooks/useLeaves';
import { useEngineers } from '../hooks/useEngineers';
import { useCompany } from '../context/CompanyContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Table } from '../components/common/Table';
import type { Column } from '../components/common/Table';
import { GlobalSearch } from '../components/common/GlobalSearch';
import { Dropdown } from '../components/forms/Dropdown';
import { Button } from '../components/forms/Button';
import { DatePicker } from '../components/forms/DatePicker';
import { Modal } from '../components/forms/Modal';
import type { Leave } from '../types';
import { Plus, Edit, Trash2, User } from 'lucide-react';

export const LeavesPage: React.FC = () => {
  const { currentCompany } = useCompany();
  const companyId = currentCompany.id === 'all-data' ? undefined : (currentCompany.company_id || currentCompany.id);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Query leave records with active company context
  const { data: res, isLoading, isError, refetch } = useLeaves({
    search,
    status: statusFilter,
    companyId,
  });
  const leaves = res?.data || [];

  // Query company-filtered engineers list for creation dropdown
  const { data: engineersRes } = useEngineers(
    companyId ? { company_id: companyId } : undefined
  );
  const engineersList = engineersRes?.data || [];

  // Mutations
  const createLeaveMutation = useCreateLeave();
  const updateLeaveMutation = useUpdateLeave();
  const deleteLeaveMutation = useDeleteLeave();

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    engineerId: '',
    leaveType: 'Annual Leave',
    requestedDate: '',
    requestedOn: new Date().toISOString().split('T')[0],
    approvalStatus: 'Pending',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleOpenAddModal = () => {
    setSelectedLeave(null);
    setFormData({
      engineerId: engineersList[0]?.id || '',
      leaveType: 'Annual Leave',
      requestedDate: '',
      requestedOn: new Date().toISOString().split('T')[0],
      approvalStatus: 'Pending',
    });
    setFormErrors({});
    setApiError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (l: Leave) => {
    setSelectedLeave(l);
    setFormData({
      engineerId: l.engineerId || '',
      leaveType: l.leaveType || l.type || 'Annual Leave',
      requestedDate: l.requestedDate || l.startDate || '',
      requestedOn: l.requestedOn || new Date().toISOString().split('T')[0],
      approvalStatus: l.approvalStatus || l.status || 'Pending',
    });
    setFormErrors({});
    setApiError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (l: Leave) => {
    setSelectedLeave(l);
    setApiError(null);
    setIsDeleteModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!selectedLeave && !formData.engineerId) errors.engineerId = 'Field Engineer is required';
    if (!formData.requestedDate) errors.requestedDate = 'Requested Date is required';

    if (formData.requestedOn && formData.requestedDate) {
      if (new Date(formData.requestedOn) > new Date(formData.requestedDate)) {
        errors.requestedOn = 'Requested On date cannot be later than Requested Date';
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

    const payload: Partial<Leave> = {
      leaveType: formData.leaveType,
      requestedDate: formData.requestedDate,
      requestedOn: formData.requestedOn,
      approvalStatus: formData.approvalStatus,
    };

    if (selectedLeave) {
      updateLeaveMutation.mutate(
        { id: selectedLeave.id, data: payload },
        {
          onSuccess: () => {
            setSuccessMessage('Leave record updated successfully.');
            setTimeout(() => {
              setIsModalOpen(false);
              setSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to update leave record.';
            setApiError(msg);
          },
        }
      );
    } else {
      createLeaveMutation.mutate(
        { engineerId: formData.engineerId, data: payload },
        {
          onSuccess: () => {
            setSuccessMessage('Leave record created successfully.');
            setTimeout(() => {
              setIsModalOpen(false);
              setSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to create leave record.';
            setApiError(msg);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!selectedLeave) return;
    setApiError(null);
    deleteLeaveMutation.mutate(selectedLeave.id, {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        setSelectedLeave(null);
        alert('Leave record deleted successfully.');
      },
      onError: (err: any) => {
        const msg = err.message || err.details?.detail || 'Failed to delete leave record.';
        setApiError(msg);
      },
    });
  };

  const columns: Column<Leave>[] = [
    {
      key: 'engineerName',
      header: 'Field Engineer',
      sortable: true,
      render: (l) => (
        <div className="flex items-center space-x-2">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">{l.engineerName}</span>
        </div>
      ),
    },
    {
      key: 'leaveType',
      header: 'Leave Type',
      sortable: true,
      render: (l) => <span className="font-medium text-slate-700 dark:text-slate-300">{l.leaveType || l.type}</span>,
    },
    {
      key: 'requestedDate',
      header: 'Requested Date (Absence)',
      sortable: true,
      render: (l) => <span>{l.requestedDate || l.startDate || 'N/A'}</span>,
    },
    {
      key: 'requestedOn',
      header: 'Submission Date',
      sortable: true,
      render: (l) => <span>{l.requestedOn || 'N/A'}</span>,
    },
    {
      key: 'approvalStatus',
      header: 'Approval Status',
      sortable: true,
      render: (l) => {
        const st = l.approvalStatus || l.status || 'Pending';
        const colors: Record<string, string> = {
          Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          Pending: 'bg-amber-100 text-amber-800 border-amber-200',
          Rejected: 'bg-rose-100 text-rose-800 border-rose-200',
          Cancelled: 'bg-slate-100 text-slate-800 border-slate-200',
        };
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[st] || 'bg-slate-100 text-slate-800'}`}>
            {st}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (l) => (
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenEditModal(l)}
            icon={<Edit className="w-3.5 h-3.5 text-blue-500" />}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenDeleteModal(l)}
            icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Engineer Leave Operations"
        subtitle="Manage annual leaves, sick leaves, emergency time-off, and approval statuses across engineers."
        actions={
          <Button
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenAddModal}
            disabled={engineersList.length === 0}
          >
            Request Leave
          </Button>
        }
      />

      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <GlobalSearch onSearch={(q) => setSearch(q)} placeholder="Search by engineer, leave type..." />
        <div className="w-full sm:w-48">
          <Dropdown
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={['All', 'Pending', 'Approved', 'Rejected', 'Cancelled']}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={leaves}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        emptyTitle="No Leave Records Found"
        emptyDescription="Click Request Leave to log a new absence request for an engineer."
      />

      {/* Add / Edit Leave Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormErrors({});
          setApiError(null);
          setSuccessMessage(null);
        }}
        title={selectedLeave ? 'Edit Leave Record' : 'Request Leave'}
        subtitle={selectedLeave ? 'Modify leave request details.' : 'Submit a new leave request.'}
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

          {!selectedLeave && (
            <div className="w-full flex flex-col space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Field Engineer
              </label>
              <select
                value={formData.engineerId}
                onChange={(e) => setFormData({ ...formData, engineerId: e.target.value })}
                className="w-full rounded-lg border bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 px-3.5 py-2 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                required
              >
                <option value="" disabled>Select an engineer...</option>
                {engineersList.map((eng) => (
                  <option key={eng.id} value={eng.id}>
                    {eng.name} ({eng.orbitId})
                  </option>
                ))}
              </select>
              {formErrors.engineerId && (
                <span className="text-xs text-rose-500">{formErrors.engineerId}</span>
              )}
            </div>
          )}

          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Leave Type
            </label>
            <Dropdown
              value={formData.leaveType}
              onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
              options={['Annual Leave', 'Sick Leave', 'Training', 'Emergency', 'Personal Leave', 'Others']}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Requested Date (Absence Date)"
              value={formData.requestedDate}
              onChange={(e) => setFormData({ ...formData, requestedDate: e.target.value })}
              error={formErrors.requestedDate}
              required
            />
            <DatePicker
              label="Requested On (Submission Date)"
              value={formData.requestedOn}
              onChange={(e) => setFormData({ ...formData, requestedOn: e.target.value })}
              error={formErrors.requestedOn}
            />
          </div>

          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Approval Status
            </label>
            <Dropdown
              value={formData.approvalStatus}
              onChange={(e) => setFormData({ ...formData, approvalStatus: e.target.value })}
              options={['Pending', 'Approved', 'Rejected', 'Cancelled']}
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
              loading={createLeaveMutation.isPending || updateLeaveMutation.isPending}
            >
              {createLeaveMutation.isPending || updateLeaveMutation.isPending
                ? (selectedLeave ? 'Saving...' : 'Submitting...')
                : (selectedLeave ? 'Save Changes' : 'Submit Leave Request')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal for Leave */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setApiError(null);
        }}
        title="Delete Leave Record"
        subtitle="Confirm deletion of absence request."
      >
        <div className="space-y-4">
          {apiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {apiError}
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete this leave record? This action cannot be undone.
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
              loading={deleteLeaveMutation.isPending}
            >
              {deleteLeaveMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
