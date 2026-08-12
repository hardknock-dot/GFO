import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useEngineers,
  useCreateEngineer,
  useUpdateEngineer,
  useDeleteEngineer,
} from '../hooks/useEngineers';
import type { Engineer } from '../types';
import { PageHeader } from '../components/layout/PageHeader';
import { Table } from '../components/common/Table';
import type { Column } from '../components/common/Table';
import { GlobalSearch } from '../components/common/GlobalSearch';
import { Dropdown } from '../components/forms/Dropdown';
import { Button } from '../components/forms/Button';
import { TextInput } from '../components/forms/TextInput';
import { DatePicker } from '../components/forms/DatePicker';
import { Modal } from '../components/forms/Modal';
import { useCompany } from '../context/CompanyContext';
import { UserPlus, Eye, MapPin, Wrench, Edit, Trash2, Building2 } from 'lucide-react';

export const EngineersPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const createEngineerMutation = useCreateEngineer();
  const updateEngineerMutation = useUpdateEngineer();
  const deleteEngineerMutation = useDeleteEngineer();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState<Engineer | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    goesBy: '',
    customerId: '',
    orbitId: '',
    level: 'L2 Specialist',
    joinDate: '',
    primaryTool: 'Etch',
    customerExperience: '',
    yearsExperience: '',
    status: 'Active',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: res, isLoading, isError, refetch } = useEngineers({
    search,
    status: statusFilter,
    country: countryFilter,
  });

  const engineers = res?.data || [];

  const handleOpenAddModal = () => {
    setSelectedEngineer(null);
    setFormData({
      name: '',
      goesBy: '',
      customerId: '',
      orbitId: '',
      level: 'L2 Specialist',
      joinDate: '',
      primaryTool: 'Etch',
      customerExperience: '',
      yearsExperience: '',
      status: 'Active',
    });
    setFormErrors({});
    setApiError(null);
    setSuccessMessage(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (engineer: Engineer) => {
    setSelectedEngineer(engineer);
    setFormData({
      name: engineer.name,
      goesBy: engineer.goesBy || '',
      customerId: engineer.customerId || '',
      orbitId: engineer.orbitId,
      level: engineer.level,
      joinDate: engineer.joinDate || '',
      primaryTool: engineer.primaryTool || 'Etch',
      customerExperience: engineer.customerExperience !== undefined ? String(engineer.customerExperience) : '',
      yearsExperience: engineer.yearsExperience !== undefined ? String(engineer.yearsExperience) : '',
      status: engineer.status,
    });
    setFormErrors({});
    setApiError(null);
    setSuccessMessage(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenDeleteModal = (engineer: Engineer) => {
    setSelectedEngineer(engineer);
    setApiError(null);
    setIsDeleteModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Engineer Name is required';
    if (!formData.orbitId.trim()) errors.orbitId = 'Orbit ID is required';

    const custExp = Number(formData.customerExperience);
    if (formData.customerExperience && (isNaN(custExp) || custExp < 0)) {
      errors.customerExperience = 'Customer Experience must be >= 0';
    }

    const yrsExp = Number(formData.yearsExperience);
    if (formData.yearsExperience && (isNaN(yrsExp) || yrsExp < 0)) {
      errors.yearsExperience = 'Industry Experience must be >= 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSuccessMessage(null);
    
    if (!validateForm()) return;

    const payload: Partial<Engineer> & { company_id?: string } = {
      name: formData.name,
      goesBy: formData.goesBy,
      customerId: formData.customerId,
      orbitId: formData.orbitId,
      level: formData.level as any,
      joinDate: formData.joinDate,
      primaryTool: formData.primaryTool,
      customerExperience: formData.customerExperience ? Number(formData.customerExperience) : undefined,
      yearsExperience: formData.yearsExperience ? Number(formData.yearsExperience) : undefined,
      status: formData.status as any,
    };

    if (selectedEngineer) {
      // Edit mode
      updateEngineerMutation.mutate(
        { id: selectedEngineer.id, data: payload },
        {
          onSuccess: () => {
            setSuccessMessage('Engineer updated successfully.');
            setTimeout(() => {
              setIsAddEditModalOpen(false);
              setSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to update engineer.';
            setApiError(msg);
          },
        }
      );
    } else {
      // Add mode
      payload.company_id = currentCompany.company_id || currentCompany.id;
      createEngineerMutation.mutate(payload, {
        onSuccess: () => {
          setSuccessMessage('Engineer created successfully.');
          setTimeout(() => {
            setIsAddEditModalOpen(false);
            setSuccessMessage(null);
          }, 1000);
        },
        onError: (err: any) => {
          const msg = err.message || err.details?.detail || 'Failed to create engineer.';
          setApiError(msg);
        },
      });
    }
  };

  const handleDelete = () => {
    if (!selectedEngineer) return;
    setApiError(null);
    deleteEngineerMutation.mutate(selectedEngineer.id, {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        setSelectedEngineer(null);
        alert('Engineer deleted successfully.');
      },
      onError: (err: any) => {
        const msg = err.message || err.details?.detail || 'Failed to delete engineer.';
        setApiError(msg);
      },
    });
  };

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
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/engineers/${item.id}`)}
            icon={<Eye className="w-3.5 h-3.5 text-[var(--color-secondary)]" />}
          >
            View Profile
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenEditModal(item)}
            icon={<Edit className="w-3.5 h-3.5 text-blue-500" />}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenDeleteModal(item)}
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
        title="Field Engineer Operations Directory"
        subtitle="Manage semiconductor equipment field engineers, competency certifications, site deployments, and profiles."
        actions={
          <Button icon={<UserPlus className="w-4 h-4" />} onClick={handleOpenAddModal}>
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setFormErrors({});
          setApiError(null);
          setSuccessMessage(null);
        }}
        title={selectedEngineer ? 'Edit Field Engineer' : 'Add New Field Engineer'}
        subtitle={selectedEngineer ? 'Update engineer competency profile.' : 'Onboard a new field engineer.'}
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

          {/* Read-Only Company Selection */}
          <div className="w-full flex flex-col space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Company Tenant Workspace
            </span>
            <div className="flex items-center space-x-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-500">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>{currentCompany.name} ({currentCompany.code})</span>
            </div>
          </div>

          <TextInput
            label="Engineer Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Goes By"
              value={formData.goesBy}
              onChange={(e) => setFormData({ ...formData, goesBy: e.target.value })}
            />
            <TextInput
              label="Employee ID"
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Orbit ID"
              value={formData.orbitId}
              onChange={(e) => setFormData({ ...formData, orbitId: e.target.value })}
              error={formErrors.orbitId}
              required
            />
            <Dropdown
              label="Competency Level"
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              options={['L1 Junior', 'L2 Specialist', 'L3 Senior', 'L4 Master', 'L5 Principal Expert']}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Date of Joining"
              value={formData.joinDate}
              onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
            />
            <Dropdown
              label="Primary Tool / Chamber"
              value={formData.primaryTool}
              onChange={(e) => setFormData({ ...formData, primaryTool: e.target.value })}
              options={['Etch', 'SENSAI', 'Kiyo', 'Purion', 'ALTUS', 'CVD', 'ALD']}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Customer Experience (Yrs)"
              type="number"
              step="0.1"
              value={formData.customerExperience}
              onChange={(e) => setFormData({ ...formData, customerExperience: e.target.value })}
              error={formErrors.customerExperience}
            />
            <TextInput
              label="Industry Experience (Yrs)"
              type="number"
              step="0.1"
              value={formData.yearsExperience}
              onChange={(e) => setFormData({ ...formData, yearsExperience: e.target.value })}
              error={formErrors.yearsExperience}
            />
          </div>

          <Dropdown
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={['Active', 'Deployed', 'On Leave', 'In Transit', 'Training']}
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createEngineerMutation.isPending || updateEngineerMutation.isPending}
            >
              {createEngineerMutation.isPending || updateEngineerMutation.isPending
                ? (selectedEngineer ? 'Saving...' : 'Creating...')
                : (selectedEngineer ? 'Save Changes' : 'Create Engineer')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setApiError(null);
        }}
        title="Delete Field Engineer"
        subtitle="Confirm deletion of engineer record."
      >
        <div className="space-y-4">
          {apiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {apiError}
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete engineer <strong className="text-slate-800 dark:text-slate-100">{selectedEngineer?.name}</strong> ({selectedEngineer?.orbitId})? This action cannot be undone.
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
              loading={deleteEngineerMutation.isPending}
            >
              {deleteEngineerMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

