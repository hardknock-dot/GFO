import React, { useState } from 'react';
import { useVisa, useCreateVisa, useUpdateVisa, useDeleteVisa, useRenewVisa } from '../hooks/useVisa';
import { useEngineers } from '../hooks/useEngineers';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Table } from '../components/common/Table';
import type { Column } from '../components/common/Table';
import { GlobalSearch } from '../components/common/GlobalSearch';
import { Dropdown } from '../components/forms/Dropdown';
import { Button } from '../components/forms/Button';
import { TextInput } from '../components/forms/TextInput';
import { DatePicker } from '../components/forms/DatePicker';
import { Modal } from '../components/forms/Modal';
import { SearchableDropdown } from '../components/forms/SearchableDropdown';
import type { Visa } from '../types';
import { RefreshCw, Plus, Edit, Trash2 } from 'lucide-react';

export const VisaPage: React.FC = () => {
  const { currentCompany } = useCompany();
  const { canEdit } = useAuth();
  const companyId = currentCompany.id === 'all-data' ? undefined : (currentCompany.company_id || currentCompany.id);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Query visas with active company filter
  const { data: res, isLoading, isError, refetch } = useVisa({
    search,
    status: statusFilter,
    companyId,
  });
  const visaList = res?.data || [];

  // Query company-filtered engineer list for creation dropdown
  const { data: engineersRes } = useEngineers(
    companyId ? { company_id: companyId } : undefined
  );
  const engineersList = engineersRes?.data || [];

  // Mutations
  const createVisaMutation = useCreateVisa();
  const updateVisaMutation = useUpdateVisa();
  const deleteVisaMutation = useDeleteVisa();
  const renewMutation = useRenewVisa();

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedVisa, setSelectedVisa] = useState<Visa | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    engineerId: '',
    country: 'United States',
    visaType: 'B1/B2',
    appliedOn: '',
    issueDate: '',
    expiryDate: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleOpenAddModal = () => {
    setSelectedVisa(null);
    setFormData({
      engineerId: engineersList[0]?.id || '',
      country: 'United States',
      visaType: 'B1/B2',
      appliedOn: '',
      issueDate: '',
      expiryDate: '',
    });
    setFormErrors({});
    setApiError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (v: Visa) => {
    setSelectedVisa(v);
    setFormData({
      engineerId: v.engineerId || '',
      country: v.country || '',
      visaType: v.visaType || '',
      appliedOn: v.appliedOn || '',
      issueDate: v.issueDate || '',
      expiryDate: v.expiryDate || '',
    });
    setFormErrors({});
    setApiError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (v: Visa) => {
    setSelectedVisa(v);
    setApiError(null);
    setIsDeleteModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!selectedVisa && !formData.engineerId) errors.engineerId = 'Field Engineer is required';
    if (!formData.country.trim()) errors.country = 'Country is required';

    if (formData.issueDate && formData.expiryDate) {
      if (new Date(formData.expiryDate) < new Date(formData.issueDate)) {
        errors.expiryDate = 'Expiry Date cannot be earlier than Start Date';
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

    const payload: Partial<Visa> = {
      country: formData.country,
      visaType: formData.visaType,
      appliedOn: formData.appliedOn || undefined,
      issueDate: formData.issueDate || undefined,
      expiryDate: formData.expiryDate || undefined,
    };

    if (selectedVisa) {
      updateVisaMutation.mutate(
        { id: selectedVisa.id, data: payload },
        {
          onSuccess: () => {
            setSuccessMessage('Visa record updated successfully.');
            setTimeout(() => {
              setIsModalOpen(false);
              setSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to update visa.';
            setApiError(msg);
          },
        }
      );
    } else {
      createVisaMutation.mutate(
        { engineerId: formData.engineerId, data: payload },
        {
          onSuccess: () => {
            setSuccessMessage('Visa record created successfully.');
            setTimeout(() => {
              setIsModalOpen(false);
              setSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to create visa.';
            setApiError(msg);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!selectedVisa) return;
    setApiError(null);
    deleteVisaMutation.mutate(selectedVisa.id, {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        setSelectedVisa(null);
        alert('Visa record deleted successfully.');
      },
      onError: (err: any) => {
        const msg = err.message || err.details?.detail || 'Failed to delete visa.';
        setApiError(msg);
      },
    });
  };

  const columns: Column<Visa>[] = [
    { key: 'engineerName', header: 'Field Engineer', sortable: true, render: (v) => <span className="font-semibold text-slate-800 dark:text-slate-200">{v.engineerName}</span> },
    { key: 'country', header: 'Jurisdiction / Country', sortable: true, render: (v) => <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{v.country}</span> },
    { key: 'visaType', header: 'Work Permit / Visa Class', sortable: true, render: (v) => <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{v.visaType}</span> },
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
        canEdit ? (
          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              loading={renewMutation.isPending}
              onClick={() => renewMutation.mutate(v.id)}
              icon={<RefreshCw className="w-3.5 h-3.5 text-slate-500" />}
            >
              Renew
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenEditModal(v)}
              icon={<Edit className="w-3.5 h-3.5 text-blue-500" />}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenDeleteModal(v)}
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
        title="Global Work Permit & Visa Tracking"
        subtitle="Automated expiration tracking, passport compliance, and renewal workflows for field engineers."
        actions={
          canEdit ? (
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenAddModal}
              disabled={engineersList.length === 0}
            >
              Register New Visa
            </Button>
          ) : undefined
        }
      />

      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <GlobalSearch onSearch={(q) => setSearch(q)} placeholder="Search by engineer, jurisdiction country, passport number..." />
        <div className="w-full sm:w-48">
          <Dropdown value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={['All', 'Valid', 'Expiring Soon', 'Expired']} />
        </div>
      </div>

      <Table columns={columns} data={visaList} isLoading={isLoading} isError={isError} onRetry={refetch} emptyTitle="No Visa Records Found" />

      {/* Add / Edit Visa Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormErrors({});
          setApiError(null);
          setSuccessMessage(null);
        }}
        title={selectedVisa ? 'Edit Visa Record' : 'Register New Visa'}
        subtitle={selectedVisa ? 'Modify permit details.' : 'Register a new visa jurisdiction permit record.'}
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

          {!selectedVisa && (
            <SearchableDropdown
              label="Field Engineer"
              value={formData.engineerId}
              onChange={(val) => setFormData({ ...formData, engineerId: val })}
              options={engineersList.map((eng) => ({
                value: eng.id,
                label: `${eng.name} (${eng.orbitId || 'N/A'})`,
              }))}
              placeholder="Select an engineer..."
              searchPlaceholder="Search engineer name..."
              required
              error={formErrors.engineerId}
            />
          )}

          <TextInput
            label="Country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            error={formErrors.country}
            required
          />

          <TextInput
            label="Visa / Permit Class"
            value={formData.visaType}
            onChange={(e) => setFormData({ ...formData, visaType: e.target.value })}
          />

          <DatePicker
            label="Applied On"
            value={formData.appliedOn}
            onChange={(e) => setFormData({ ...formData, appliedOn: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Start Date"
              value={formData.issueDate}
              onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
            />
            <DatePicker
              label="Expiry Date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              error={formErrors.expiryDate}
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
              loading={createVisaMutation.isPending || updateVisaMutation.isPending}
            >
              {createVisaMutation.isPending || updateVisaMutation.isPending
                ? (selectedVisa ? 'Saving...' : 'Creating...')
                : (selectedVisa ? 'Save Changes' : 'Register Visa')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal for Visa */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setApiError(null);
        }}
        title="Delete Visa Record"
        subtitle="Confirm deletion of permit record."
      >
        <div className="space-y-4">
          {apiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {apiError}
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete the visa permit record for <strong className="text-slate-800 dark:text-slate-100">{selectedVisa?.visaType}</strong> to {selectedVisa?.country}? This action cannot be undone.
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
              loading={deleteVisaMutation.isPending}
            >
              {deleteVisaMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
