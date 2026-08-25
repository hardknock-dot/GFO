import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchedule, useCreateSchedule, useUpdateSchedule, useDeleteSchedule } from '../hooks/useSchedule';
import {
  useMissedSchedules,
  useCreateMissedSchedule,
  useUpdateMissedSchedule,
  useDeleteMissedSchedule,
} from '../hooks/useMissedSchedules';
import { useEngineers } from '../hooks/useEngineers';
import { useLeaves } from '../hooks/useLeaves';
import { useVisa } from '../hooks/useVisa';
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
import type { Schedule, MissedSchedule } from '../types';
import { Plus, MapPin, Building2, Edit, Trash2, CalendarX, AlertTriangle, MessageSquare } from 'lucide-react';
import { notifyScheduleCommentAdded } from '../utils/notifications';


export const SchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const { user, canEdit } = useAuth();
  const isEngineerUser = user?.role === 'Field Engineer' || user?.role === 'Engineer';
  const companyId = currentCompany.id === 'all-data' ? undefined : (currentCompany.company_id || currentCompany.id);


  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Query schedules with active company filter
  const { data: res, isLoading, isError, refetch } = useSchedule({
    search,
    status: statusFilter,
    companyId,
    page,
    pageSize,
  });
  const schedules = res?.data || [];
  const totalItems = res?.total || 0;
  const totalPages = res?.totalPages || 1;

  // Query company-filtered engineer list for creation dropdown
  const { data: engineersRes } = useEngineers(
    companyId ? { company_id: companyId } : undefined
  );
  const engineersList = engineersRes?.data || [];

  // Query leaves and visas for cross-module informational indicators
  const { data: leavesRes } = useLeaves({ companyId });
  const { data: visaRes } = useVisa({ companyId });

  // Mutations
  const createScheduleMutation = useCreateSchedule();
  const updateScheduleMutation = useUpdateSchedule();
  const deleteScheduleMutation = useDeleteSchedule();

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    engineerId: '',
    supportType: 'Customer Support',
    country: 'Taiwan',
    fabCity: 'Hsinchu',
    fabSite: 'TSMC Fab 12',
    startDate: '',
    endDate: '',
    scheduleStatus: 'Upcoming',
    remarks: '',
  });

  // Missed Schedule Mutations & State
  const { data: missedSchedulesRes } = useMissedSchedules({ companyId });
  const createMissedScheduleMutation = useCreateMissedSchedule();
  const updateMissedScheduleMutation = useUpdateMissedSchedule();
  const deleteMissedScheduleMutation = useDeleteMissedSchedule();

  const [isMissedModalOpen, setIsMissedModalOpen] = useState(false);
  const [isMissedDeleteModalOpen, setIsMissedDeleteModalOpen] = useState(false);
  const [selectedMissedSchedule, setSelectedMissedSchedule] = useState<MissedSchedule | null>(null);
  const [targetScheduleForMissed, setTargetScheduleForMissed] = useState<Schedule | null>(null);

  const [missedFormData, setMissedFormData] = useState({
    requestedStartDate: '',
    requestedEndDate: '',
    actualStartDate: '',
    actualEndDate: '',
    reason: '',
    evidence: '',
  });

  const [missedFormErrors, setMissedFormErrors] = useState<Record<string, string>>({});
  const [missedApiError, setMissedApiError] = useState<string | null>(null);
  const [missedSuccessMessage, setMissedSuccessMessage] = useState<string | null>(null);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleOpenAddModal = () => {
    setSelectedSchedule(null);
    setFormData({
      engineerId: engineersList[0]?.id || '',
      supportType: 'Customer Support',
      country: 'Taiwan',
      fabCity: 'Hsinchu',
      fabSite: 'TSMC Fab 12',
      startDate: '',
      endDate: '',
      scheduleStatus: 'Upcoming',
      remarks: '',
    });
    setFormErrors({});
    setApiError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sch: Schedule) => {
    setSelectedSchedule(sch);
    setFormData({
      engineerId: sch.engineerId || '',
      supportType: sch.supportType || 'Customer Support',
      country: sch.country || '',
      fabCity: sch.fabCity || '',
      fabSite: sch.fabSite || '',
      startDate: sch.startDate || '',
      endDate: sch.endDate || '',
      scheduleStatus: sch.scheduleStatus || 'Upcoming',
      remarks: sch.remarks || '',
    });
    setFormErrors({});
    setApiError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (sch: Schedule) => {
    setSelectedSchedule(sch);
    setApiError(null);
    setIsDeleteModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!selectedSchedule && !formData.engineerId) errors.engineerId = 'Engineer Name is required';
    if (!formData.supportType.trim()) errors.supportType = 'Support Type is required';
    if (!formData.country.trim()) errors.country = 'Country is required';
    if (!formData.startDate) errors.startDate = 'Start Date is required';

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        errors.endDate = 'End Date cannot be earlier than Start Date';
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

    const payload: Partial<Schedule> = {
      supportType: formData.supportType,
      country: formData.country,
      fabCity: formData.fabCity,
      fabSite: formData.fabSite,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      scheduleStatus: formData.scheduleStatus,
      remarks: formData.remarks,
    };

    if (selectedSchedule) {
      updateScheduleMutation.mutate(
        { id: selectedSchedule.id, data: payload },
        {
          onSuccess: () => {
            setSuccessMessage('Schedule updated successfully.');
            setTimeout(() => {
              setIsModalOpen(false);
              setSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to update schedule.';
            setApiError(msg);
          },
        }
      );
    } else {
      createScheduleMutation.mutate(
        { engineerId: formData.engineerId, data: payload },
        {
          onSuccess: () => {
            setSuccessMessage('Schedule created successfully.');
            setTimeout(() => {
              setIsModalOpen(false);
              setSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to create schedule.';
            setApiError(msg);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!selectedSchedule) return;
    setApiError(null);
    deleteScheduleMutation.mutate(selectedSchedule.id, {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        setSelectedSchedule(null);
        alert('Schedule deleted successfully.');
      },
      onError: (err: any) => {
        const msg = err.message || err.details?.detail || 'Failed to delete schedule.';
        setApiError(msg);
      },
    });
  };

  // Schedule Comment Modal State
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

  const [selectedScheduleForComment, setSelectedScheduleForComment] = useState<Schedule | null>(null);
  const [commentInput, setCommentInput] = useState('');

  const handleOpenCommentModal = (sch: Schedule) => {
    setSelectedScheduleForComment(sch);
    setCommentInput(sch.remarks || '');
    setIsCommentModalOpen(true);
  };

  const handleSaveComment = () => {
    if (!selectedScheduleForComment) return;
    updateScheduleMutation.mutate(
      {
        id: selectedScheduleForComment.id,
        data: { remarks: commentInput } as any,
      },
      {
        onSuccess: () => {
          setIsCommentModalOpen(false);
          notifyScheduleCommentAdded({
            engineerName: selectedScheduleForComment.engineerName || 'N/A',
            scheduleId: selectedScheduleForComment.id,
            supportType: selectedScheduleForComment.supportType,
            fabSite: selectedScheduleForComment.siteLocation || selectedScheduleForComment.customerName,
            remarks: commentInput,
          });
        },
      }
    );
  };

  // Missed Schedule logic functions

  const handleOpenAddMissedModal = (sch: Schedule) => {
    setTargetScheduleForMissed(sch);
    setSelectedMissedSchedule(null);
    setMissedFormData({
      requestedStartDate: sch.startDate || '',
      requestedEndDate: sch.endDate || '',
      actualStartDate: '',
      actualEndDate: '',
      reason: '',
      evidence: '',
    });
    setMissedFormErrors({});
    setMissedApiError(null);
    setMissedSuccessMessage(null);
    setIsMissedModalOpen(true);
  };

  const validateMissedForm = () => {
    const errors: Record<string, string> = {};
    if (missedFormData.requestedStartDate && missedFormData.requestedEndDate) {
      if (new Date(missedFormData.requestedEndDate) < new Date(missedFormData.requestedStartDate)) {
        errors.requestedEndDate = 'Requested End Date cannot be earlier than Requested Start Date';
      }
    }
    if (missedFormData.actualStartDate && missedFormData.actualEndDate) {
      if (new Date(missedFormData.actualEndDate) < new Date(missedFormData.actualStartDate)) {
        errors.actualEndDate = 'Actual End Date cannot be earlier than Actual Start Date';
      }
    }

    setMissedFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleMissedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMissedApiError(null);
    setMissedSuccessMessage(null);

    if (!validateMissedForm()) return;

    const payload: Partial<MissedSchedule> = {
      requestedStartDate: missedFormData.requestedStartDate || undefined,
      requestedEndDate: missedFormData.requestedEndDate || undefined,
      actualStartDate: missedFormData.actualStartDate || undefined,
      actualEndDate: missedFormData.actualEndDate || undefined,
      reason: missedFormData.reason,
      evidence: missedFormData.evidence,
    };

    if (selectedMissedSchedule) {
      updateMissedScheduleMutation.mutate(
        { id: selectedMissedSchedule.id, data: payload },
        {
          onSuccess: () => {
            setMissedSuccessMessage('Missed schedule record updated successfully.');
            setTimeout(() => {
              setIsMissedModalOpen(false);
              setMissedSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to update missed schedule record.';
            setMissedApiError(msg);
          },
        }
      );
    } else {
      if (!targetScheduleForMissed) return;
      createMissedScheduleMutation.mutate(
        { scheduleId: targetScheduleForMissed.id, data: payload },
        {
          onSuccess: () => {
            setMissedSuccessMessage('Missed schedule record created successfully.');
            setTimeout(() => {
              setIsMissedModalOpen(false);
              setMissedSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to create missed schedule record.';
            setMissedApiError(msg);
          },
        }
      );
    }
  };

  const handleMissedDelete = () => {
    if (!selectedMissedSchedule) return;
    setMissedApiError(null);
    deleteMissedScheduleMutation.mutate(selectedMissedSchedule.id, {
      onSuccess: () => {
        setIsMissedDeleteModalOpen(false);
        setSelectedMissedSchedule(null);
        alert('Missed schedule record deleted successfully.');
      },
      onError: (err: any) => {
        const msg = err.message || err.details?.detail || 'Failed to delete missed schedule record.';
        setMissedApiError(msg);
      },
    });
  };

  const columns: Column<Schedule>[] = [
    { key: 'projectCode', header: 'Project Code', sortable: true, render: (s) => <span className="font-mono text-xs font-semibold text-[var(--color-secondary)]">{s.projectCode}</span> },
    { key: 'engineerName', header: 'Engineer Name', sortable: true, render: (s) => <span className="font-semibold text-slate-800 dark:text-slate-200">{s.engineerName}</span> },
    { key: 'customerName', header: 'Customer Fab', sortable: true, render: (s) => <div className="flex items-center space-x-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" /><span>{s.customerName}</span></div> },
    { key: 'siteLocation', header: 'Site Location', sortable: true, render: (s) => <div className="flex items-center space-x-1 text-xs text-slate-600 dark:text-slate-400"><MapPin className="w-3.5 h-3.5 text-slate-400" /><span>{s.siteLocation}</span></div> },
    { key: 'startDate', header: 'Start Date', sortable: true },
    { key: 'endDate', header: 'End Date', sortable: true, render: (s) => <span>{s.endDate || 'Ongoing'}</span> },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (s) => {
        const colors: Record<string, string> = {
          Upcoming: 'bg-blue-100 text-blue-800 border-blue-200',
          Confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          Completed: 'bg-slate-100 text-slate-800 border-slate-200',
          Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
          Ongoing: 'bg-amber-100 text-amber-800 border-amber-200',
        };
        const getDynamicStatus = (startDate?: string, endDate?: string, dbStatus?: string) => {
          if (dbStatus === 'Cancelled') return 'Cancelled';
          const todayStr = new Date().toISOString().split('T')[0];
          if (!startDate) return dbStatus || 'Upcoming';
          if (todayStr >= startDate && (!endDate || todayStr <= endDate)) return 'Ongoing';
          if (endDate && todayStr > endDate) return 'Completed';
          if (todayStr < startDate) return 'Upcoming';
          return dbStatus || 'Upcoming';
        };
        const displayStatus = getDynamicStatus(s.startDate, s.endDate, s.scheduleStatus);
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[displayStatus] || 'bg-slate-100 text-slate-800'}`}>
            {displayStatus}
          </span>
        );
      },
    },
    {
      key: 'readiness',
      header: 'Operational Readiness',
      render: (s) => {
        const engLeaves = leavesRes?.data?.filter((l) => l.engineerId === s.engineerId) || [];
        const hasLeaveConflict = engLeaves.some((l) => {
          if (!l.requestedDate || !s.startDate) return false;
          return l.requestedDate >= s.startDate && (!s.endDate || l.requestedDate <= s.endDate);
        });

        const engVisas = visaRes?.data?.filter((v) => v.engineerId === s.engineerId) || [];
        const hasVisa = engVisas.some(
          (v) => (v.country || '').toLowerCase() === (s.country || '').toLowerCase() && v.status !== 'Expired'
        );

        return (
          <div className="flex flex-wrap gap-1">
            {hasLeaveConflict && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                <span>Leave Conflict</span>
              </span>
            )}
            {hasVisa ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Visa Ready
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                No Visa
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'missedCount',
      header: 'Missed Log',
      render: (s) => {
        const hasMissed = missedSchedulesRes?.data?.some((ms) => ms.scheduleId === s.id);
        return hasMissed ? (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            Logged
          </span>
        ) : (
          <span className="text-xs text-slate-400">None</span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (s) => (
        <div className="flex items-center space-x-2 justify-end" onClick={(e) => e.stopPropagation()}>
          {isEngineerUser && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenCommentModal(s)}
              icon={<MessageSquare className="w-3.5 h-3.5 text-indigo-500" />}
              title="Add or Edit Schedule Comment"
            >
              Comment
            </Button>
          )}

          {canEdit && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenAddMissedModal(s)}
                icon={<CalendarX className="w-3.5 h-3.5 text-amber-500" />}
              >
                Log Missed
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenEditModal(s)}
                icon={<Edit className="w-3.5 h-3.5 text-blue-500" />}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenDeleteModal(s)}
                icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      ),
    },

  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field Operations Schedule & Shifts"
        subtitle="Track semiconductor fab installations, emergency callouts, and shift rosters worldwide."
        actions={
          canEdit ? (
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenAddModal}
              disabled={engineersList.length === 0}
            >
              Create Schedule Assignment
            </Button>
          ) : undefined
        }
      />

      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <GlobalSearch onSearch={(q) => setSearch(q)} placeholder="Search by project code, engineer, customer fab..." />
        <div className="w-full sm:w-48">
          <Dropdown value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={['All', 'Upcoming', 'Confirmed', 'Completed', 'Cancelled']} />
        </div>
      </div>

      <Table
        columns={columns}
        data={schedules}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onRowClick={(sch) => navigate(`/engineers/${sch.engineerId}`)}
        emptyTitle="No Schedules Found"
      />

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{schedules.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(page * pageSize, totalItems)}</span> of <span className="font-semibold text-slate-700 dark:text-slate-200">{totalItems}</span> schedules
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

      {/* Add / Edit Schedule Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormErrors({});
          setApiError(null);
          setSuccessMessage(null);
        }}
        title={selectedSchedule ? 'Edit Schedule Assignment' : 'Add Schedule Assignment'}
        subtitle={selectedSchedule ? 'Modify roster and support details.' : 'Create a new fab field support schedule.'}
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

          {!selectedSchedule && (
            <SearchableDropdown
              label="Engineer Name"
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
            label="Support Type"
            value={formData.supportType}
            onChange={(e) => setFormData({ ...formData, supportType: e.target.value })}
            error={formErrors.supportType}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              error={formErrors.country}
              required
            />
            <TextInput
              label="FAB City"
              value={formData.fabCity}
              onChange={(e) => setFormData({ ...formData, fabCity: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="FAB Site / Customer"
              value={formData.fabSite}
              onChange={(e) => setFormData({ ...formData, fabSite: e.target.value })}
            />
            <Dropdown
              label="Status"
              value={formData.scheduleStatus}
              onChange={(e) => setFormData({ ...formData, scheduleStatus: e.target.value })}
              options={['Upcoming', 'Confirmed', 'Completed', 'Cancelled']}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Start Date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              error={formErrors.startDate}
              required
            />
            <DatePicker
              label="End Date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              error={formErrors.endDate}
            />
          </div>

          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Remarks / Comments
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
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
              loading={createScheduleMutation.isPending || updateScheduleMutation.isPending}
            >
              {createScheduleMutation.isPending || updateScheduleMutation.isPending
                ? (selectedSchedule ? 'Saving...' : 'Creating...')
                : (selectedSchedule ? 'Save Changes' : 'Create Schedule')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal for Schedule */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setApiError(null);
        }}
        title="Delete Schedule Assignment"
        subtitle="Confirm deletion of roster assignment."
      >
        <div className="space-y-4">
          {apiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {apiError}
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete the schedule support assignment <strong className="text-slate-800 dark:text-slate-100">{selectedSchedule?.supportType}</strong> at {selectedSchedule?.fabSite}? This action cannot be undone.
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
              loading={deleteScheduleMutation.isPending}
            >
              {deleteScheduleMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Missed Schedule Modal */}
      <Modal
        isOpen={isMissedModalOpen}
        onClose={() => {
          setIsMissedModalOpen(false);
          setMissedFormErrors({});
          setMissedApiError(null);
          setMissedSuccessMessage(null);
        }}
        title={selectedMissedSchedule ? 'Edit Missed Schedule' : 'Log Missed Schedule'}
        subtitle={selectedMissedSchedule ? 'Modify schedule deviation details.' : `Record missed schedule details for ${targetScheduleForMissed?.supportType || 'schedule'}.`}
      >
        <form onSubmit={handleMissedSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {missedApiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {missedApiError}
            </div>
          )}
          {missedSuccessMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs">
              {missedSuccessMessage}
            </div>
          )}

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs space-y-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Target Assignment: </span>
            <span className="text-slate-600 dark:text-slate-400">{targetScheduleForMissed?.supportType} at {targetScheduleForMissed?.fabSite}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Requested Start Date"
              value={missedFormData.requestedStartDate}
              onChange={(e) => setMissedFormData({ ...missedFormData, requestedStartDate: e.target.value })}
              error={missedFormErrors.requestedStartDate}
            />
            <DatePicker
              label="Requested End Date"
              value={missedFormData.requestedEndDate}
              onChange={(e) => setMissedFormData({ ...missedFormData, requestedEndDate: e.target.value })}
              error={missedFormErrors.requestedEndDate}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Actual Start Date"
              value={missedFormData.actualStartDate}
              onChange={(e) => setMissedFormData({ ...missedFormData, actualStartDate: e.target.value })}
              error={missedFormErrors.actualStartDate}
            />
            <DatePicker
              label="Actual End Date"
              value={missedFormData.actualEndDate}
              onChange={(e) => setMissedFormData({ ...missedFormData, actualEndDate: e.target.value })}
              error={missedFormErrors.actualEndDate}
            />
          </div>

          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Reason for Change / Delay
            </label>
            <textarea
              value={missedFormData.reason}
              onChange={(e) => setMissedFormData({ ...missedFormData, reason: e.target.value })}
              className="w-full rounded-lg border bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3.5 py-2 transition-colors duration-150 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent min-h-[70px]"
              placeholder="Explain why the schedule was missed or modified..."
            />
          </div>

          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Evidence / Notes Reference
            </label>
            <textarea
              value={missedFormData.evidence}
              onChange={(e) => setMissedFormData({ ...missedFormData, evidence: e.target.value })}
              className="w-full rounded-lg border bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3.5 py-2 transition-colors duration-150 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent min-h-[70px]"
              placeholder="Attach customer notes, email references, or documentation links..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsMissedModalOpen(false)}
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
        isOpen={isMissedDeleteModalOpen}
        onClose={() => {
          setIsMissedDeleteModalOpen(false);
          setMissedApiError(null);
        }}
        title="Delete Missed Schedule Record"
        subtitle="Confirm deletion of schedule deviation record."
      >
        <div className="space-y-4">
          {missedApiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {missedApiError}
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
                setIsMissedDeleteModalOpen(false);
                setMissedApiError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleMissedDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              loading={deleteMissedScheduleMutation.isPending}
            >
              {deleteMissedScheduleMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Schedule Comment Modal */}

      <Modal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        title="Schedule Remarks & Comments"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Add or update operational remarks for assignment: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedScheduleForComment?.projectCode} ({selectedScheduleForComment?.customerName})</span>
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Remarks & Comments
            </label>
            <textarea
              rows={4}
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Enter schedule status updates, transit notes, or customer site comments..."
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsCommentModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveComment} loading={updateScheduleMutation.isPending}>
              Save Comment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

