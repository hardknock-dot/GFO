import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useEngineers,
  useCreateEngineer,
  useUpdateEngineer,
  useDeleteEngineer,
} from '../hooks/useEngineers';
import {
  useEngineerDeletionRequests,
  useRequestEngineerDeletion,
  useApproveEngineerDeletionRequest,
  useRejectEngineerDeletionRequest,
} from '../hooks/useEngineerDeletionRequests';
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
import { useAuth } from '../context/AuthContext';
import { UserPlus, User, Eye, MapPin, Wrench, Edit, Trash2, Building2, ShieldAlert, Check, X } from 'lucide-react';

export const EngineersPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const { user, canEdit } = useAuth();
  const isGlobalAdmin = user?.role === 'Main Admin' || user?.role === 'Global Admin';
  const isManager = user?.role === 'Manager' || user?.role === 'Company Admin';
  const canApproveDeletion = isGlobalAdmin || isManager;

  const createEngineerMutation = useCreateEngineer();
  const updateEngineerMutation = useUpdateEngineer();
  const deleteEngineerMutation = useDeleteEngineer();

  const companyId = currentCompany.id === 'all-data' ? undefined : (currentCompany.company_id || currentCompany.id);
  const { data: deletionRequests = [] } = useEngineerDeletionRequests(companyId);
  const requestDeletionMutation = useRequestEngineerDeletion();
  const approveDeletionMutation = useApproveEngineerDeletionRequest();
  const rejectDeletionMutation = useRejectEngineerDeletionRequest();

  // Search & Filter & Pagination state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState<Engineer | null>(null);
  const [deleteReason, setDeleteReason] = useState('');


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
    email: '',
    phoneNumber: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: res, isLoading, isError, refetch } = useEngineers({
    search,
    status: statusFilter !== 'All' ? statusFilter : undefined,
    country: countryFilter !== 'All' ? countryFilter : undefined,
    page,
    limit: pageSize,
  });

  const engineers = res?.data || [];
  const totalItems = res?.total || 0;
  const totalPages = res?.totalPages || 1;

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
      email: '',
      phoneNumber: '',
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
      email: engineer.email || '',
      phoneNumber: engineer.phoneNumber || '',
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

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Invalid email format';
    }

    if (formData.phoneNumber && !/^[+\d\s().-]{3,30}$/.test(formData.phoneNumber.trim())) {
      errors.phoneNumber = 'Phone number is invalid or too long (max 30 chars)';
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
      email: formData.email,
      phoneNumber: formData.phoneNumber,
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

    if (isGlobalAdmin) {
      deleteEngineerMutation.mutate(selectedEngineer.id, {
        onSuccess: () => {
          setIsDeleteModalOpen(false);
          setSelectedEngineer(null);
          setApiError(null);
        },
        onError: (err: any) => {
          const msg = err.message || err.details?.detail || 'Failed to delete engineer.';
          setApiError(msg);
        },
      });
    } else {
      requestDeletionMutation.mutate(
        { engineerId: selectedEngineer.id, reason: deleteReason },
        {
          onSuccess: () => {
            setIsDeleteModalOpen(false);
            setSelectedEngineer(null);
            setDeleteReason('');
            setSuccessMessage('Engineer deletion request submitted for Global Admin review.');
            setTimeout(() => setSuccessMessage(null), 3000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to submit deletion request.';
            setApiError(msg);
          },
        }
      );
    }
  };

  const columns: Column<Engineer>[] = [
    {
      key: 'name',
      header: 'Engineer Name',
      sortable: true,
      render: (item) => (
        <div className="flex items-center space-x-3">
          {item.avatarUrl ? (
            <img
              src={item.avatarUrl}
              alt={item.name}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
                const fallback = (e.target as HTMLElement).nextElementSibling;
                if (fallback) fallback.classList.remove('hidden');
              }}
              className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 flex-shrink-0"
            />
          ) : null}
          <div
            className={`w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold border border-sky-200 dark:border-sky-800/60 flex-shrink-0 ${
              item.avatarUrl ? 'hidden' : ''
            }`}
          >
            <User className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
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
        <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
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
          Deployed: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40',
          Active: 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60',
          'On Leave': 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40',
          'In Transit': 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/40',
          Training: 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800',
        };
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeColors[item.status] || 'bg-slate-100 text-slate-700'
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
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
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
      render: (item) => {
        const pendingReq = deletionRequests.find((r) => r.engineerId === item.id && r.status === 'PENDING');
        return (
          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/engineers/${item.id}`)}
              icon={<Eye className="w-3.5 h-3.5 text-[var(--color-secondary)]" />}
            >
              View Profile
            </Button>
            {canEdit && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEditModal(item)}
                  icon={<Edit className="w-3.5 h-3.5 text-blue-500" />}
                >
                  Edit
                </Button>
                {pendingReq ? (
                  canApproveDeletion ? (
                    <div className="flex items-center space-x-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          approveDeletionMutation.mutate(pendingReq.requestId, {
                            onSuccess: () => {
                              setSuccessMessage('Engineer deletion approved and record removed successfully.');
                              setTimeout(() => setSuccessMessage(null), 3000);
                              refetch();
                            },
                            onError: (err: any) => {
                              alert(err.message || err.details?.detail || 'Failed to approve deletion request.');
                            },
                          });
                        }}
                        loading={approveDeletionMutation.isPending}
                        icon={<Check className="w-3.5 h-3.5 text-emerald-600" />}
                        className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                      >
                        Approve Deletion
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          rejectDeletionMutation.mutate(
                            { requestId: pendingReq.requestId },
                            {
                              onSuccess: () => {
                                setSuccessMessage('Engineer deletion request rejected successfully.');
                                setTimeout(() => setSuccessMessage(null), 3000);
                                refetch();
                              },
                              onError: (err: any) => {
                                alert(err.message || err.details?.detail || 'Failed to reject deletion request.');
                              },
                            }
                          );
                        }}
                        loading={rejectDeletionMutation.isPending}
                        icon={<X className="w-3.5 h-3.5 text-rose-600" />}
                        className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                      <ShieldAlert className="w-3 h-3 mr-1 text-amber-600" />
                      Deletion Pending Approval
                    </span>
                  )
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenDeleteModal(item)}
                    icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                  >
                    Delete
                  </Button>
                )}
              </>
            )}
          </div>
        );
      },
    },
  ];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Field Engineer Operations Directory"
        subtitle="Manage semiconductor equipment field engineers, competency certifications, site deployments, and profiles."
        actions={
          canEdit ? (
            <Button icon={<UserPlus className="w-4 h-4" />} onClick={handleOpenAddModal}>
              Add New Engineer
            </Button>
          ) : undefined
        }
      />

      {/* Control Bar: Global Search & Dropdown Filters */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <GlobalSearch onSearch={(q) => { setSearch(q); setPage(1); }} placeholder="Search by name, Orbit ID, tool chamber, or country..." />

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="w-full sm:w-36">
            <Dropdown
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              options={['All', 'Deployed', 'Active', 'On Leave', 'In Transit', 'Training']}
            />
          </div>
          <div className="w-full sm:w-36">
            <Dropdown
              value={countryFilter}
              onChange={(e) => { setCountryFilter(e.target.value); setPage(1); }}
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

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{engineers.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(page * pageSize, totalItems)}</span> of <span className="font-semibold text-slate-700 dark:text-slate-200">{totalItems}</span> engineers
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>

            <span className="px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
              Page {page} of {totalPages}
            </span>

            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

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

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={formErrors.email}
            />
            <TextInput
              label="Phone Number"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              error={formErrors.phoneNumber}
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

      {/* Global Admin Pending Deletion Requests Section */}
      {isGlobalAdmin && deletionRequests.filter(r => r.status === 'PENDING').length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-700/60 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-200">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-base font-extrabold tracking-tight">
              PENDING ENGINEER DELETION REQUESTS ({deletionRequests.filter(r => r.status === 'PENDING').length})
            </h3>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Managers have requested engineer deletions. Global Admin approval is required. Safe-deletion checks will verify 0 child records exist before proceeding.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {deletionRequests.filter(r => r.status === 'PENDING').map((req) => (
              <div
                key={req.requestId}
                className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {req.engineerName} ({req.orbitId})
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      PENDING REVIEW
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Requested by: <strong>{req.requestedByName}</strong> ({req.companyName})
                  </p>
                  {req.reason && (
                    <p className="text-xs italic text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      "{req.reason}"
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    size="sm"
                    onClick={() => approveDeletionMutation.mutate(req.requestId)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5"
                    loading={approveDeletionMutation.isPending}
                    icon={<Check className="w-3.5 h-3.5" />}
                  >
                    Approve Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectDeletionMutation.mutate({ requestId: req.requestId, reviewComment: 'Rejected by Global Admin' })}
                    className="border-rose-300 text-rose-600 hover:bg-rose-50 text-xs px-3 py-1.5"
                    loading={rejectDeletionMutation.isPending}
                    icon={<X className="w-3.5 h-3.5" />}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation / Request Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setApiError(null);
          setDeleteReason('');
        }}
        title={isGlobalAdmin ? "Delete Field Engineer" : "Request Engineer Deletion"}
        subtitle={isGlobalAdmin ? "Confirm permanent deletion of engineer record." : "Submit deletion request for Global Admin approval."}
      >
        <div className="space-y-4">
          {apiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
              {apiError}
            </div>
          )}

          {isGlobalAdmin ? (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <p className="font-bold flex items-center space-x-1.5 text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Cascading Deletion Confirmation</span>
              </p>
              <p>
                Deleting engineer <strong className="font-bold">{selectedEngineer?.name}</strong> ({selectedEngineer?.orbitId}) will permanently remove the engineer profile along with <strong>all associated child records</strong> (skills, schedules, visa details, leaves, travel arrangements, performance reviews, and linked user credentials).
              </p>
              <p className="font-semibold text-rose-700 dark:text-rose-400">
                Are you sure you want to proceed with deleting this engineer and all linked child data?
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              You are requesting deletion of engineer <strong className="text-slate-800 dark:text-slate-100">{selectedEngineer?.name}</strong> ({selectedEngineer?.orbitId}). This request will be submitted for Admin review.
            </p>
          )}

          {!isGlobalAdmin && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reason for Deletion Request
              </label>
              <textarea
                rows={3}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Employee offboarded or record created in error..."
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setApiError(null);
                setDeleteReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              loading={deleteEngineerMutation.isPending || requestDeletionMutation.isPending}
            >
              {deleteEngineerMutation.isPending || requestDeletionMutation.isPending
                ? (isGlobalAdmin ? 'Deleting...' : 'Submitting...')
                : (isGlobalAdmin ? 'Delete Engineer' : 'Submit Deletion Request')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};


