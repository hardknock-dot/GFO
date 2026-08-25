import React, { useState, useEffect } from 'react';
import {
  Shield,
  Building2,
  Users,
  Activity,
  RefreshCw,
  Plus,
  Eye,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';
import api from '../services/axios';
import { createCompany, updateCompany, deleteCompany } from '../services/company';
import type { AuditLog } from '../types';

interface OverviewStats {
  total_companies: number;
  total_engineers: number;
  total_managers: number;
  total_ops_executives: number;
  total_users: number;
  pending_delete_requests: number;
  companies: Array<{
    company_id: string;
    company_name: string;
    region: string;
    country: string;
    status: string;
    engineers_count: number;
    users_count: number;
  }>;
  recent_activity: AuditLog[];
}

interface UserItem {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  company_id: string | null;
  company_name: string;
  is_active: boolean;
  last_login: string | null;
}

export const MainAdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'users' | 'audit' | 'activity'>('overview');
  
  // Stats
  const [stats, setStats] = useState<OverviewStats | null>(null);

  // Users
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editCompanyId, setEditCompanyId] = useState('');
  const [editActive, setEditActive] = useState(true);

  // Audit Logs
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

  // Create & Edit Company Modal
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [companyCodeInput, setCompanyCodeInput] = useState('');
  const [companyModalError, setCompanyModalError] = useState<string | null>(null);

  // Create User Modal
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: '',
    email: '',
    role: 'Engineer',
    company_id: '',
    password: '',
  });

  const handleOpenCreateCompany = () => {
    setEditingCompany(null);
    setCompanyNameInput('');
    setCompanyCodeInput('');
    setCompanyModalError(null);
    setShowCreateCompany(true);
  };

  const handleOpenEditCompany = (c: any) => {
    setEditingCompany(c);
    setCompanyNameInput(c.company_name || '');
    setCompanyCodeInput(c.short_name || c.code || '');
    setCompanyModalError(null);
    setShowCreateCompany(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyModalError(null);
    if (!companyNameInput.trim()) {
      setCompanyModalError('Company name is required');
      return;
    }
    if (!companyCodeInput.trim()) {
      setCompanyModalError('Company short code is required');
      return;
    }

    try {
      if (editingCompany) {
        await updateCompany(editingCompany.company_id, {
          company_name: companyNameInput,
          short_name: companyCodeInput,
        });
      } else {
        await createCompany({
          company_name: companyNameInput,
          short_name: companyCodeInput,
        });
      }
      setShowCreateCompany(false);
      fetchOverview();
    } catch (err: any) {
      setCompanyModalError(err.message || err.details?.detail || 'Failed to save company record.');
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!window.confirm('Are you sure you want to delete this company tenant?')) return;
    try {
      await deleteCompany(companyId);
      fetchOverview();
    } catch (err: any) {
      alert(`Failed to delete company: ${err.message || 'Error occurred.'}`);
    }
  };

  const fetchOverview = async () => {
    try {
      const res = await api.get('/admin/overview');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsersList(res.data);
    } catch (err) {
      console.error('Failed to load users:', err);
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
      setAuditLogs(res.data.items);
      setAuditTotal(res.data.total);
      setAuditPage(res.data.page);
      setAuditTotalPages(res.data.total_pages);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchUsers();
    fetchAuditLogs(1);
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs(auditPage);
    }
  }, [auditPage, filterAction, filterEntity, startDate, endDate]);

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.put(`/admin/users/${editingUser.user_id}`, {
        role: editRole,
        company_id: editCompanyId,
        is_active: editActive,
      });
      setEditingUser(null);
      fetchUsers();
      fetchOverview();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update user.');
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', createForm);
      setShowCreateUser(false);
      setCreateForm({ full_name: '', email: '', role: 'Engineer', company_id: '', password: '' });
      fetchUsers();
      fetchOverview();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create user.');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight">Main Admin Control Center</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Highest Privilege
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Global Governance, Multi-Tenant Auditing, System Security & Access Control
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchOverview();
            fetchUsers();
            fetchAuditLogs(auditPage);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition-all border border-slate-700 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh All Data</span>
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'companies', label: 'Companies', icon: Building2 },
          { id: 'users', label: 'User Management', icon: Users },
          { id: 'audit', label: 'Audit Trail', icon: FileText },
          { id: 'activity', label: 'System Activity', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-slate-400 text-xs font-medium">Total Companies</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.total_companies ?? 0}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-slate-400 text-xs font-medium">Total Engineers</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.total_engineers ?? 0}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-slate-400 text-xs font-medium">Managers</div>
              <div className="text-2xl font-bold text-indigo-600 mt-1">{stats?.total_managers ?? 0}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-slate-400 text-xs font-medium">Ops Executives</div>
              <div className="text-2xl font-bold text-cyan-600 mt-1">{stats?.total_ops_executives ?? 0}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-slate-400 text-xs font-medium">System Users</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.total_users ?? 0}</div>
            </div>
            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 shadow-xs">
              <div className="text-amber-700 text-xs font-semibold">Pending Deletes</div>
              <div className="text-2xl font-bold text-amber-900 mt-1">{stats?.pending_delete_requests ?? 0}</div>
            </div>
          </div>

          {/* Quick Overview Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Companies Quick Box */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Organization Scope</h3>
                <button
                  onClick={() => setActiveTab('companies')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  View All &rarr;
                </button>
              </div>
              <div className="space-y-2">
                {stats?.companies.map((c) => (
                  <div
                    key={c.company_id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-800 text-xs">{c.company_name}</p>
                      <p className="text-[10px] text-slate-500">{c.region} &bull; {c.country}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-700">{c.engineers_count} Engineers</p>
                      <p className="text-[10px] text-slate-400">{c.users_count} Users</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent System Activity Box */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Recent Audit Events</h3>
                <button
                  onClick={() => setActiveTab('audit')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Full Audit Trail &rarr;
                </button>
              </div>
              <div className="space-y-2.5">
                {stats?.recent_activity.slice(0, 5).map((a) => (
                  <div key={a.audit_id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{a.user_name} ({a.user_role})</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center space-x-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          a.action === 'CREATE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : a.action === 'UPDATE'
                            ? 'bg-blue-100 text-blue-800'
                            : a.action === 'DELETE'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {a.action}
                      </span>
                      <span className="text-slate-600 text-xs truncate">{a.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPANIES */}
      {activeTab === 'companies' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Semiconductor Equipment Companies</h3>
              <p className="text-xs text-slate-500">Multi-tenant partner organizational hierarchy</p>
            </div>
            <button
              onClick={handleOpenCreateCompany}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Company</span>
            </button>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Company Name</th>
                <th className="px-5 py-3.5">Region</th>
                <th className="px-5 py-3.5">Country</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Engineers Count</th>
                <th className="px-5 py-3.5">Users Count</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {stats?.companies.map((c) => (
                <tr key={c.company_id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4 font-bold text-slate-900">{c.company_name}</td>
                  <td className="px-5 py-4">{c.region || 'Global'}</td>
                  <td className="px-5 py-4">{c.country || 'N/A'}</td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {c.status || 'Active'}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-800">{c.engineers_count}</td>
                  <td className="px-5 py-4 font-bold text-slate-800">{c.users_count}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleOpenEditCompany(c)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCompany(c.company_id)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">User Role & Company Scoping</h3>
              <p className="text-xs text-slate-500">Assign roles (Main Admin, Manager, Ops Executive, Engineer, Viewer) and company tenant scope</p>
            </div>
            <button
              onClick={() => setShowCreateUser(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New User</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Full Name</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Assigned Role</th>
                  <th className="px-5 py-3.5">Company Scope</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {usersList.map((u) => (
                  <tr key={u.user_id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4 font-bold text-slate-900">{u.full_name}</td>
                    <td className="px-5 py-4 text-slate-600">{u.email}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          u.role === 'Main Admin' || u.role === 'Global Admin'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : u.role === 'Manager' || u.role === 'Company Admin'
                            ? 'bg-indigo-100 text-indigo-800'
                            : u.role === 'Ops Executive' || u.role === 'Resource Manager'
                            ? 'bg-cyan-100 text-cyan-800'
                            : u.role === 'Engineer' || u.role === 'Field Engineer'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role === 'Global Admin' ? 'Main Admin' : u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700 font-medium">{u.company_name}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setEditRole(u.role);
                          setEditCompanyId(u.company_id || '');
                          setEditActive(u.is_active);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all"
                      >
                        Edit User
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Audit Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Audit Log Filters</h3>
              <button
                onClick={() => fetchAuditLogs(1)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
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
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Action</label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="ALL">All Actions</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
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
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Date To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Audit Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Company</th>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Entity</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLoading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                      Loading audit log entries...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                      No audit log events found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.audit_id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-mono text-[11px] text-slate-500">
                        {new Date(log.created_at).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-800">{log.user_name}</td>
                      <td className="px-5 py-4 text-slate-600">{log.user_role}</td>
                      <td className="px-5 py-4 text-slate-600">{log.company_name}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            log.action === 'CREATE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.action === 'UPDATE'
                              ? 'bg-blue-100 text-blue-800'
                              : log.action === 'DELETE'
                              ? 'bg-rose-100 text-rose-800'
                              : log.action.includes('REQUEST')
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700">{log.entity_type}</td>
                      <td className="px-5 py-4 max-w-xs truncate text-slate-600" title={log.description || ''}>
                        {log.description}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {(log.old_values || log.new_values) && (
                          <button
                            onClick={() => setSelectedAudit(log)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
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

            {/* Pagination Controls */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Showing page {auditPage} of {auditTotalPages} ({auditTotal} total events)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={auditPage >= auditTotalPages}
                  onClick={() => setAuditPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Live System Activity Stream</h3>
          <div className="space-y-3 divide-y divide-slate-100">
            {stats?.recent_activity.map((a) => (
              <div key={a.audit_id} className="pt-3 first:pt-0 flex items-start space-x-3 text-xs">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-600 mt-0.5">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{a.user_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{a.created_at}</span>
                  </div>
                  <p className="text-slate-600 mt-0.5">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800">Edit User Scope & Role</h3>
            <form onSubmit={handleUpdateUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input type="text" value={editingUser.full_name} disabled className="w-full p-2.5 rounded-xl bg-slate-100 border text-slate-500" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-medium"
                >
                  <option value="Main Admin">Main Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Ops Executive">Ops Executive</option>
                  <option value="Engineer">Engineer</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Scope</label>
                <select
                  value={editCompanyId}
                  onChange={(e) => setEditCompanyId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-medium"
                >
                  <option value="all-data">All Companies (Global Access)</option>
                  {stats?.companies.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="userActiveCheck"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="userActiveCheck" className="font-semibold text-slate-700">Account Active</label>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showCreateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800">Create New System User</h3>
            <form onSubmit={handleCreateUserSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  placeholder="Rahul Sharma"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="r.sharma@partner.com"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                >
                  <option value="Main Admin">Main Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Ops Executive">Ops Executive</option>
                  <option value="Engineer">Engineer</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Scope</label>
                <select
                  value={createForm.company_id}
                  onChange={(e) => setCreateForm({ ...createForm, company_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                >
                  <option value="all-data">All Companies (Global)</option>
                  {stats?.companies.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Strong password..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700"
                >
                  Create User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDIT DETAILS MODAL */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">
                Audit Event Payload Details ({selectedAudit.action})
              </h3>
              <button onClick={() => setSelectedAudit(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-700 mb-1">OLD VALUES (Before Mutation)</h4>
                <pre className="bg-slate-50 p-3 rounded-xl border text-[11px] text-slate-700 overflow-x-auto max-h-60">
                  {selectedAudit.old_values ? JSON.stringify(selectedAudit.old_values, null, 2) : 'NULL (Creation)'}
                </pre>
              </div>
              <div>
                <h4 className="font-bold text-slate-700 mb-1">NEW VALUES (After Mutation)</h4>
                <pre className="bg-slate-50 p-3 rounded-xl border text-[11px] text-slate-700 overflow-x-auto max-h-60">
                  {selectedAudit.new_values ? JSON.stringify(selectedAudit.new_values, null, 2) : 'NULL (Deletion)'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setSelectedAudit(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT COMPANY MODAL */}
      {showCreateCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingCompany ? 'Edit Enterprise Company' : 'Register New Enterprise Company'}
            </h3>
            {companyModalError && (
              <div className="p-3 bg-rose-50 text-rose-600 rounded-lg text-xs">{companyModalError}</div>
            )}
            <form onSubmit={handleSaveCompany} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyNameInput}
                  onChange={(e) => setCompanyNameInput(e.target.value)}
                  placeholder="e.g. Lam Research Corp"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Short Code / Tenant ID</label>
                <input
                  type="text"
                  value={companyCodeInput}
                  onChange={(e) => setCompanyCodeInput(e.target.value)}
                  placeholder="e.g. LAM"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateCompany(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  {editingCompany ? 'Save Changes' : 'Register Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
