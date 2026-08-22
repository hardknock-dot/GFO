import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Table } from '../components/common/Table';
import type { Column } from '../components/common/Table';
import { GlobalSearch } from '../components/common/GlobalSearch';
import { Dropdown } from '../components/forms/Dropdown';
import { Button } from '../components/forms/Button';
import { TextInput } from '../components/forms/TextInput';
import { Modal } from '../components/forms/Modal';
import api from '../services/axios';
import {
  getAllUsers,
  createUserAccount,
  updateUserAccount,
  deleteUserAccount,
  type ManagedUser,
} from '../services/auth';
import { getCompanies } from '../services/company';
import { getEngineers } from '../services/engineers';
import type { Company, Engineer, AuditLog } from '../types';
import {
  Plus,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Building2,
  Wrench,
  Search,
  Check,
  X,
  Users,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

const MultiSelectCompanyPicker: React.FC<{
  companies: { company_id?: string; id?: string; company_name?: string; name?: string; short_name?: string; code?: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}> = ({ companies, selectedIds, onChange }) => {
  const [search, setSearch] = useState('');

  const filtered = companies.filter((c) => {
    const nameStr = c.company_name || c.name || '';
    const codeStr = c.short_name || c.code || '';
    return (
      nameStr.toLowerCase().includes(search.toLowerCase()) ||
      codeStr.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="w-full flex flex-col space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Assigned Enterprise Tenants ({selectedIds.length} Selected)
        </label>
        <div className="flex items-center space-x-2 text-xs">
          <button
            type="button"
            onClick={() =>
              onChange(
                companies
                  .map((c) => c.company_id || c.id)
                  .filter((id): id is string => Boolean(id))
              )
            }
            className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
          >
            Select All
          </button>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-rose-600 dark:text-rose-400 hover:underline font-semibold"
          >
            Clear All
          </button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 max-h-24 overflow-y-auto">
          {selectedIds.map((id) => {
            const comp = companies.find((c) => (c.company_id || c.id) === id);
            return (
              <span
                key={id}
                className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-md text-xs font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs"
              >
                <Building2 className="w-3 h-3 text-slate-400" />
                <span>{comp?.company_name || comp?.name || id}</span>
                <button
                  type="button"
                  onClick={() => onChange(selectedIds.filter((i) => i !== id))}
                  className="text-slate-400 hover:text-rose-600 focus:outline-none ml-1 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies by name or code..."
          className="w-full text-xs rounded-lg border bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-3 py-1.5 border-slate-200 dark:border-slate-800 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium pl-8"
        />
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
      </div>

      <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 max-h-36 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-2">No companies match "{search}"</div>
        ) : (
          filtered.map((c) => {
            const cid = (c.company_id || c.id)!;
            const isChecked = selectedIds.includes(cid);
            return (
              <label
                key={cid}
                className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-white dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (!selectedIds.includes(cid)) {
                          onChange([...selectedIds, cid]);
                        }
                      } else {
                        onChange(selectedIds.filter((i) => i !== cid));
                      }
                    }}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="font-semibold">{c.company_name || c.name}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono font-medium">
                  {c.short_name || c.code || 'TENANT'}
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
};

export const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [dbCompanies, setDbCompanies] = useState<Company[]>([]);
  const [allEngineers, setAllEngineers] = useState<Engineer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('All');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

  // Engineer Search Writable Dropdown state
  const [createEngineerSearch, setCreateEngineerSearch] = useState<string>('');
  const [isCreateEngineerDropdownOpen, setIsCreateEngineerDropdownOpen] = useState<boolean>(false);

  const [editEngineerSearch, setEditEngineerSearch] = useState<string>('');
  const [isEditEngineerDropdownOpen, setIsEditEngineerDropdownOpen] = useState<boolean>(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    email: '',
    fullName: '',
    companyId: '',
    accessibleCompanyIds: [] as string[],
    role: 'Field Engineer',
    engineerId: '',
    password: '',
  });

  const [editForm, setEditForm] = useState({
    fullName: '',
    companyId: '',
    accessibleCompanyIds: [] as string[],
    role: 'Viewer',
    engineerId: '',
    isActive: true,
    newPassword: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<AuditLog | null>(null);

  // Audit Filters
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterEntity, setFilterEntity] = useState('ALL');
  const [filterSearch, setFilterSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const [fetchedUsers, fetchedCompanies, fetchedEngineersRes] = await Promise.all([
        getAllUsers(),
        getCompanies().catch(() => []),
        getEngineers().catch(() => ({ data: [] })),
      ]);
      setUsers(fetchedUsers);
      setDbCompanies(fetchedCompanies);
      setAllEngineers(fetchedEngineersRes.data || []);
    } catch (err) {
      console.error('Error loading users:', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuditLogs = async (page = 1) => {
    setAuditLoading(true);
    try {
      const params: any = { page, page_size: 20 };
      if (filterAction !== 'ALL') params.action = filterAction;
      if (filterEntity !== 'ALL') params.entity_type = filterEntity;
      if (filterSearch) params.search = filterSearch;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await api.get('/admin/audit-logs', { params });
      setAuditLogs(res.data.items || []);
      setAuditTotal(res.data.total || 0);
      setAuditPage(res.data.page || 1);
      setAuditTotalPages(res.data.total_pages || 1);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs(auditPage);
    }
  }, [activeTab, auditPage, filterAction, filterEntity, startDate, endDate]);

  const handleOpenCreateModal = () => {
    setSelectedUser(null);
    setCreateForm({
      email: '',
      fullName: '',
      companyId: dbCompanies[0]?.company_id || 'all-data',
      accessibleCompanyIds: dbCompanies.map((c) => c.company_id),
      role: 'Field Engineer',
      engineerId: '',
      password: '',
    });
    setCreateEngineerSearch('');
    setIsCreateEngineerDropdownOpen(false);
    setFormError(null);
    setSuccessMessage(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (u: ManagedUser) => {
    setSelectedUser(u);
    const initialAccessible =
      u.companies && u.companies.length > 0
        ? u.companies.map((c) => c.company_id)
        : u.accessible_company_ids && u.accessible_company_ids.length > 0
        ? u.accessible_company_ids
        : [u.company_id];

    const matchedEng = allEngineers.find((e) => e.id === u.engineer_id);
    const initialEngSearch = matchedEng ? `${matchedEng.name} (${matchedEng.orbitId || 'ID'})` : '';

    setEditForm({
      fullName: u.full_name,
      companyId: u.role === 'Global Admin' || u.role === 'Main Admin' || u.company_id === 'all-data' ? 'all-data' : u.company_id,
      accessibleCompanyIds:
        u.role === 'Global Admin' || u.role === 'Main Admin' || u.company_id === 'all-data'
          ? dbCompanies.map((c) => c.company_id)
          : initialAccessible,
      role: u.role,
      engineerId: u.engineer_id || '',
      isActive: u.is_active,
      newPassword: '',
    });
    setEditEngineerSearch(initialEngSearch);
    setIsEditEngineerDropdownOpen(false);
    setFormError(null);
    setSuccessMessage(null);
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (u: ManagedUser) => {
    setSelectedUser(u);
    setFormError(null);
    setIsDeleteModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!createForm.email.trim() || !createForm.fullName.trim() || !createForm.password.trim()) {
      setFormError('Email, Full Name, Company, and Password are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const isGlobal =
        createForm.companyId === 'all-data' || createForm.role === 'Main Admin' || createForm.role === 'Global Admin';
      const targetCompanyId = isGlobal
        ? dbCompanies[0]?.company_id || '11b9d863-b83c-4af3-8db5-b6e773f78235'
        : createForm.companyId || createForm.accessibleCompanyIds[0] || dbCompanies[0]?.company_id;

      const targetRole = createForm.role;
      const targetAccessible = isGlobal ? dbCompanies.map((c) => c.company_id) : createForm.accessibleCompanyIds;

      const isFieldEngineerRole = targetRole === 'Field Engineer' || targetRole === 'Engineer';
      const engineerIdPayload = isFieldEngineerRole ? createForm.engineerId || null : null;

      await createUserAccount({
        email: createForm.email.trim(),
        full_name: createForm.fullName.trim(),
        company_id: targetCompanyId,
        company_ids: targetAccessible,
        role: targetRole,
        engineer_id: engineerIdPayload,
        password: createForm.password,
        accessible_company_ids: targetAccessible,
      });
      setSuccessMessage('User account created successfully.');
      await loadData();
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setSuccessMessage(null);
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError(null);
    setSuccessMessage(null);

    try {
      setIsSubmitting(true);
      const isGlobal =
        editForm.companyId === 'all-data' || editForm.role === 'Main Admin' || editForm.role === 'Global Admin';
      const targetCompanyId = isGlobal
        ? dbCompanies[0]?.company_id || '11b9d863-b83c-4af3-8db5-b6e773f78235'
        : editForm.companyId || editForm.accessibleCompanyIds[0] || dbCompanies[0]?.company_id;

      const targetRole = editForm.role;
      const targetAccessible = isGlobal ? dbCompanies.map((c) => c.company_id) : editForm.accessibleCompanyIds;
      const isFieldEngineerRole = targetRole === 'Field Engineer' || targetRole === 'Engineer';
      const engineerIdPayload = isFieldEngineerRole ? editForm.engineerId || null : null;

      await updateUserAccount(selectedUser.user_id, {
        full_name: editForm.fullName.trim(),
        company_id: targetCompanyId,
        company_ids: targetAccessible,
        role: targetRole,
        engineer_id: engineerIdPayload,
        is_active: editForm.isActive,
        password: editForm.newPassword.trim() || undefined,
        accessible_company_ids: targetAccessible,
      });

      setSuccessMessage('User account and role updated successfully.');
      await loadData();
      setTimeout(() => {
        setIsEditModalOpen(false);
        setSuccessMessage(null);
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to update user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    try {
      setIsSubmitting(true);
      await deleteUserAccount(selectedUser.user_id);
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to delete user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActiveStatus = async (u: ManagedUser) => {
    try {
      await updateUserAccount(u.user_id, { is_active: !u.is_active });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle user status.');
    }
  };

  // Filtered Engineers for Writable Dropdowns
  const filteredCreateEngineers = allEngineers.filter((eng) => {
    const q = createEngineerSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      eng.name.toLowerCase().includes(q) ||
      (eng.orbitId && eng.orbitId.toLowerCase().includes(q)) ||
      (eng.email && eng.email.toLowerCase().includes(q)) ||
      (eng.primaryTool && eng.primaryTool.toLowerCase().includes(q))
    );
  });

  const filteredEditEngineers = allEngineers.filter((eng) => {
    const q = editEngineerSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      eng.name.toLowerCase().includes(q) ||
      (eng.orbitId && eng.orbitId.toLowerCase().includes(q)) ||
      (eng.email && eng.email.toLowerCase().includes(q)) ||
      (eng.primaryTool && eng.primaryTool.toLowerCase().includes(q))
    );
  });

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const compSearchStr =
      u.companies && u.companies.length > 0
        ? u.companies.map((c) => `${c.company_name} ${c.short_name || ''}`).join(' ')
        : u.company_name || '';

    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      compSearchStr.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'All' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const columns: Column<ManagedUser>[] = [
    {
      key: 'full_name',
      header: 'User Account',
      sortable: true,
      render: (u) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
            {u.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
              <span>{u.full_name}</span>
              {u.engineer_id && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 flex items-center">
                  <Wrench className="w-3 h-3 mr-0.5" /> Engineer Linked
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 font-mono">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'company_name',
      header: 'Company Tenant Access',
      sortable: true,
      render: (u) => {
        if (u.role === 'Main Admin' || u.role === 'Global Admin' || u.company_id === 'all-data') {
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs">
              🌐 Master All Data (All Tenants)
            </span>
          );
        }

        const assignedCompanies =
          u.companies && u.companies.length > 0
            ? u.companies
            : dbCompanies.filter((c) => (u.accessible_company_ids || [u.company_id]).includes(c.company_id));

        if (assignedCompanies.length === 0) {
          return <span className="text-xs text-slate-500 font-medium">{u.company_name || 'No Tenants Assigned'}</span>;
        }

        return (
          <div className="flex flex-wrap gap-1.5 max-w-xs">
            {assignedCompanies.map((c) => (
              <span
                key={c.company_id}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 shadow-2xs"
              >
                <Building2 className="w-3 h-3 text-indigo-500" />
                <span>{c.company_name}</span>
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Assigned Role',
      sortable: true,
      render: (u) => {
        const roleColors: Record<string, string> = {
          'Main Admin': 'bg-purple-100 text-purple-800 border-purple-200',
          Manager: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          'Ops Executive': 'bg-cyan-100 text-cyan-800 border-cyan-200',
          Engineer: 'bg-blue-100 text-blue-800 border-blue-200',
          'Global Admin': 'bg-purple-100 text-purple-800 border-purple-200',
          'Company Admin': 'bg-blue-100 text-blue-800 border-blue-200',
          'Resource Manager': 'bg-emerald-100 text-emerald-800 border-emerald-200',
          'Field Engineer': 'bg-amber-100 text-amber-800 border-amber-200',
          Viewer: 'bg-slate-100 text-slate-800 border-slate-200',
        };
        return (
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              roleColors[u.role] || 'bg-slate-100 text-slate-800'
            }`}
          >
            {u.role}
          </span>
        );
      },
    },
    {
      key: 'is_active',
      header: 'Access Status',
      sortable: true,
      render: (u) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleActiveStatus(u);
          }}
          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
            u.is_active
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
          }`}
          title="Click to toggle access permission"
        >
          {u.is_active ? (
            <>
              <UserCheck className="w-3 h-3 text-emerald-600" />
              <span>Active</span>
            </>
          ) : (
            <>
              <UserX className="w-3 h-3 text-rose-600" />
              <span>Disabled</span>
            </>
          )}
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (u) => (
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenEditModal(u)}
            icon={<Edit className="w-3.5 h-3.5 text-blue-500" />}
          >
            Manage Role
          </Button>
          {u.user_id !== currentUser?.id && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenDeleteModal(u)}
              icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Accounts & System Audit Management"
        subtitle="Provision accounts, manage multi-tenant access, configure roles, and inspect complete system audit trails."
        actions={
          activeTab === 'users' ? (
            <Button icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreateModal}>
              Add New User Account
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => fetchAuditLogs(auditPage)}
            >
              Refresh Audit Logs
            </Button>
          )
        }
      />

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts & Permissions</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('audit');
            fetchAuditLogs(1);
          }}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>System Audit Trail</span>
        </button>
      </div>

      {/* TAB 1: USER ACCOUNTS */}
      {activeTab === 'users' && (
        <>
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <GlobalSearch onSearch={(q) => setSearch(q)} placeholder="Search by name, email, or company tenant..." />

            <div className="w-full sm:w-48">
              <Dropdown
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  'All',
                  'Main Admin',
                  'Manager',
                  'Ops Executive',
                  'Engineer',
                  'Viewer',
                  'Global Admin',
                  'Company Admin',
                  'Resource Manager',
                  'Field Engineer',
                ]}
              />
            </div>
          </div>

          <Table
            columns={columns as any}
            data={filteredUsers.map((u) => ({ ...u, id: u.user_id }))}
            isLoading={isLoading}
            isError={isError}
            onRetry={loadData}
            emptyTitle="No User Accounts Found"
            emptyDescription="No user records match your search query or role filter."
          />
        </>
      )}

      {/* TAB 2: SYSTEM AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Audit Filters */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Audit Log Filters
              </h3>
              <button
                onClick={() => fetchAuditLogs(1)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Apply Filters
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Search</label>
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Search user, action, desc..."
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Action</label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                >
                  <option value="ALL">All Actions</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                  <option value="USER_COMPANY_ACCESS_CHANGED">USER_COMPANY_ACCESS_CHANGED</option>
                  <option value="DELETE_REQUESTED">DELETE_REQUESTED</option>
                  <option value="DELETE_APPROVED">DELETE_APPROVED</option>
                  <option value="DELETE_REJECTED">DELETE_REJECTED</option>
                  <option value="BULK_UPLOAD">BULK_UPLOAD</option>
                  <option value="LOGIN">LOGIN</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Entity Type</label>
                <select
                  value={filterEntity}
                  onChange={(e) => setFilterEntity(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                >
                  <option value="ALL">All Entities</option>
                  <option value="Engineer">Engineer</option>
                  <option value="Skill">Skill</option>
                  <option value="Schedule">Schedule</option>
                  <option value="Visa">Visa</option>
                  <option value="Leave">Leave</option>
                  <option value="Travel">Travel</option>
                  <option value="Performance">Performance</option>
                  <option value="User">User</option>
                  <option value="BulkUpload">BulkUpload</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Date From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Date To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Company Tenant</th>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Entity</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {auditLoading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                      Loading audit log entries...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                      No audit log events found matching criteria.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.audit_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <td className="px-5 py-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">{log.user_name}</td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{log.user_role}</td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{log.company_name}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            log.action === 'CREATE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : log.action === 'UPDATE' || log.action === 'USER_COMPANY_ACCESS_CHANGED'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : log.action === 'DELETE'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : log.action.includes('REQUEST')
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">{log.entity_type}</td>
                      <td className="px-5 py-4 max-w-xs truncate text-slate-600 dark:text-slate-400" title={log.description || ''}>
                        {log.description}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {(log.old_values || log.new_values) && (
                          <button
                            onClick={() => setSelectedAudit(log)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
                            title="View Old vs New Data"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Audit Pagination */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing page {auditPage} of {auditTotalPages} ({auditTotal} total events)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={auditPage >= auditTotalPages}
                  onClick={() => setAuditPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT DETAILS INSPECTION MODAL */}
      {selectedAudit && (
        <Modal
          isOpen={!!selectedAudit}
          onClose={() => setSelectedAudit(null)}
          title="System Audit Log Details"
          subtitle={`Event ID: ${selectedAudit.audit_id}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">User / Actor</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedAudit.user_name} ({selectedAudit.user_role})</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Company Scope</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedAudit.company_name || 'All Companies'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Action Performed</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{selectedAudit.action}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Timestamp</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {selectedAudit.created_at ? new Date(selectedAudit.created_at).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>

            {selectedAudit.description && (
              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200">
                <span className="font-bold block text-[10px] uppercase text-indigo-500 mb-1">Description</span>
                <span>{selectedAudit.description}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="font-bold text-rose-600 block text-[10px] uppercase mb-1">Previous Values (Before)</span>
                <pre className="p-3 bg-slate-900 text-rose-300 rounded-xl text-[11px] font-mono max-h-48 overflow-auto leading-relaxed">
                  {selectedAudit.old_values ? JSON.stringify(selectedAudit.old_values, null, 2) : 'None / New Record'}
                </pre>
              </div>
              <div>
                <span className="font-bold text-emerald-600 block text-[10px] uppercase mb-1">New Values (After)</span>
                <pre className="p-3 bg-slate-900 text-emerald-300 rounded-xl text-[11px] font-mono max-h-48 overflow-auto leading-relaxed">
                  {selectedAudit.new_values ? JSON.stringify(selectedAudit.new_values, null, 2) : 'None / Deleted'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setSelectedAudit(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Provision New User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Provision New User Account"
        subtitle="Create user credentials and configure role permissions."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {formError}
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs">
              {successMessage}
            </div>
          )}

          <TextInput
            label="Email Address"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            placeholder="e.g. user@domain.com"
            required
          />

          <TextInput
            label="Full Name"
            value={createForm.fullName}
            onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
            placeholder="e.g. Sarah Connor"
            required
          />

          <MultiSelectCompanyPicker
            companies={dbCompanies}
            selectedIds={createForm.accessibleCompanyIds}
            onChange={(ids) =>
              setCreateForm({
                ...createForm,
                accessibleCompanyIds: ids,
                companyId: ids[0] || (dbCompanies[0]?.company_id || ''),
              })
            }
          />

          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              System Role
            </label>
            <Dropdown
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              options={[
                'Main Admin',
                'Manager',
                'Ops Executive',
                'Engineer',
                'Viewer',
                'Global Admin',
                'Company Admin',
                'Resource Manager',
                'Field Engineer',
              ]}
            />
          </div>

          {/* Writable Searchable Dropdown for Field Engineer Linking */}
          {(createForm.role === 'Field Engineer' || createForm.role === 'Engineer') && (
            <div className="w-full flex flex-col space-y-1.5 pt-1 relative">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Select & Link Engineer Profile</span>
                <span className="text-[10px] text-indigo-600 font-mono font-bold">Writable Search Dropdown</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={createEngineerSearch}
                  onChange={(e) => {
                    setCreateEngineerSearch(e.target.value);
                    setIsCreateEngineerDropdownOpen(true);
                  }}
                  onFocus={() => setIsCreateEngineerDropdownOpen(true)}
                  placeholder="Type to search engineer by Name, Orbit ID, or Email..."
                  className="w-full rounded-lg border bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 px-3.5 py-2 border-slate-200 dark:border-slate-800 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] font-medium pr-16"
                />
                {createForm.engineerId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCreateForm({ ...createForm, engineerId: '' });
                      setCreateEngineerSearch('');
                    }}
                    className="absolute right-2.5 top-2.5 text-xs text-rose-500 hover:text-rose-700 font-semibold"
                  >
                    Unlink
                  </button>
                ) : (
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                )}
              </div>

              {isCreateEngineerDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCreateEngineers.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">
                      No engineers found matching "{createEngineerSearch}"
                    </div>
                  ) : (
                    filteredCreateEngineers.map((eng) => {
                      const isSelected = createForm.engineerId === eng.id;
                      return (
                        <div
                          key={eng.id}
                          onClick={() => {
                            setCreateForm({
                              ...createForm,
                              engineerId: eng.id,
                              fullName: createForm.fullName || eng.name,
                              email: createForm.email || eng.email || '',
                            });
                            setCreateEngineerSearch(`${eng.name} (${eng.orbitId || 'ID'})`);
                            setIsCreateEngineerDropdownOpen(false);
                          }}
                          className={`p-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/40 font-bold' : ''
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                              <span>{eng.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-300">
                                {eng.orbitId}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {eng.level} • {eng.primaryTool} {eng.email ? `• ${eng.email}` : ''}
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-xs font-bold text-indigo-600 flex items-center">
                              <Check className="w-3.5 h-3.5 mr-1" /> Linked
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          <TextInput
            label="Initial Password"
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            placeholder="Set user password..."
            required
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Role & Access Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Manage User Role & Permissions"
        subtitle={`Update settings for ${selectedUser?.full_name} (${selectedUser?.email}).`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {formError}
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs">
              {successMessage}
            </div>
          )}

          <TextInput
            label="Full Name"
            value={editForm.fullName}
            onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
            required
          />

          <MultiSelectCompanyPicker
            companies={dbCompanies}
            selectedIds={editForm.accessibleCompanyIds}
            onChange={(ids) =>
              setEditForm({
                ...editForm,
                accessibleCompanyIds: ids,
                companyId: ids[0] || (dbCompanies[0]?.company_id || ''),
              })
            }
          />

          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Assigned Role
            </label>
            <Dropdown
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              options={[
                'Main Admin',
                'Manager',
                'Ops Executive',
                'Engineer',
                'Viewer',
                'Global Admin',
                'Company Admin',
                'Resource Manager',
                'Field Engineer',
              ]}
            />
          </div>

          {/* Writable Searchable Dropdown for Field Engineer Linking */}
          {(editForm.role === 'Field Engineer' || editForm.role === 'Engineer') && (
            <div className="w-full flex flex-col space-y-1.5 pt-1 relative">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Link Field Engineer Profile</span>
                <span className="text-[10px] text-indigo-600 font-mono font-bold">Writable Search Dropdown</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={editEngineerSearch}
                  onChange={(e) => {
                    setEditEngineerSearch(e.target.value);
                    setIsEditEngineerDropdownOpen(true);
                  }}
                  onFocus={() => setIsEditEngineerDropdownOpen(true)}
                  placeholder="Type to search engineer by Name, Orbit ID, or Email..."
                  className="w-full rounded-lg border bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 px-3.5 py-2 border-slate-200 dark:border-slate-800 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] font-medium pr-16"
                />
                {editForm.engineerId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm({ ...editForm, engineerId: '' });
                      setEditEngineerSearch('');
                    }}
                    className="absolute right-2.5 top-2.5 text-xs text-rose-500 hover:text-rose-700 font-semibold"
                  >
                    Unlink
                  </button>
                ) : (
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                )}
              </div>

              {isEditEngineerDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEditEngineers.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">
                      No engineers found matching "{editEngineerSearch}"
                    </div>
                  ) : (
                    filteredEditEngineers.map((eng) => {
                      const isSelected = editForm.engineerId === eng.id;
                      return (
                        <div
                          key={eng.id}
                          onClick={() => {
                            setEditForm({
                              ...editForm,
                              engineerId: eng.id,
                              fullName: editForm.fullName || eng.name,
                            });
                            setEditEngineerSearch(`${eng.name} (${eng.orbitId || 'ID'})`);
                            setIsEditEngineerDropdownOpen(false);
                          }}
                          className={`p-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/40 font-bold' : ''
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                              <span>{eng.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-300">
                                {eng.orbitId}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {eng.level} • {eng.primaryTool} {eng.email ? `• ${eng.email}` : ''}
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-xs font-bold text-indigo-600 flex items-center">
                              <Check className="w-3.5 h-3.5 mr-1" /> Linked
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <input
              type="checkbox"
              id="isActive"
              checked={editForm.isActive}
              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
            />
            <label htmlFor="isActive" className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
              Account Active & Enabled (Uncheck to revoke login access)
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete User Account"
        subtitle={`Are you sure you want to delete ${selectedUser?.full_name}?`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            This action cannot be undone. User login access and assigned tenant permissions will be permanently revoked.
          </p>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteSubmit} loading={isSubmitting}>
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
