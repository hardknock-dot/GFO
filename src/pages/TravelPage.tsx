import React, { useState } from 'react';
import { useTravel, useCreateTravel, useUpdateTravel, useDeleteTravel } from '../hooks/useTravel';
import { useSchedule } from '../hooks/useSchedule';
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
import type { Travel } from '../types';
import { Plus, MapPin, Edit, Trash2 } from 'lucide-react';

export const TravelPage: React.FC = () => {
  const { currentCompany } = useCompany();
  const { canEdit } = useAuth();
  const companyId = currentCompany.id === 'all-data' ? undefined : (currentCompany.company_id || currentCompany.id);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Query travel arrangements with active company context
  const { data: res, isLoading, isError, refetch } = useTravel({
    search,
    status: statusFilter,
    companyId,
  });
  const travelList = res?.data || [];

  // Query company-filtered schedules list for creation dropdown
  const { data: schedulesRes } = useSchedule(
    companyId ? { companyId } : undefined
  );
  const schedulesList = schedulesRes?.data || [];

  // Mutations
  const createTravelMutation = useCreateTravel();
  const updateTravelMutation = useUpdateTravel();
  const deleteTravelMutation = useDeleteTravel();

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTravel, setSelectedTravel] = useState<Travel | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    scheduleId: '',
    bookingDate: '',
    travelDate: '',
    purpose: 'Customer Support',
    comments: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleOpenAddModal = () => {
    setSelectedTravel(null);
    setFormData({
      scheduleId: schedulesList[0]?.id || '',
      bookingDate: '',
      travelDate: '',
      purpose: 'Customer Support',
      comments: '',
    });
    setFormErrors({});
    setApiError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: Travel) => {
    setSelectedTravel(t);
    setFormData({
      scheduleId: t.scheduleId || '',
      bookingDate: t.bookingDate || '',
      travelDate: t.travelDate || '',
      purpose: t.purpose || 'Customer Support',
      comments: t.comments || '',
    });
    setFormErrors({});
    setApiError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (t: Travel) => {
    setSelectedTravel(t);
    setApiError(null);
    setIsDeleteModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!selectedTravel && !formData.scheduleId) errors.scheduleId = 'Schedule Assignment is required';
    
    if (formData.bookingDate && formData.travelDate) {
      if (new Date(formData.travelDate) < new Date(formData.bookingDate)) {
        errors.travelDate = 'Travel Date cannot be earlier than Booking Date';
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

    const payload: Partial<Travel> = {
      bookingDate: formData.bookingDate || undefined,
      travelDate: formData.travelDate || undefined,
      purpose: formData.purpose,
      comments: formData.comments,
    };

    if (selectedTravel) {
      updateTravelMutation.mutate(
        { id: selectedTravel.id, data: payload },
        {
          onSuccess: () => {
            setSuccessMessage('Travel arrangement updated successfully.');
            setTimeout(() => {
              setIsModalOpen(false);
              setSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to update travel arrangement.';
            setApiError(msg);
          },
        }
      );
    } else {
      createTravelMutation.mutate(
        { scheduleId: formData.scheduleId, data: payload },
        {
          onSuccess: () => {
            setSuccessMessage('Travel arrangement created successfully.');
            setTimeout(() => {
              setIsModalOpen(false);
              setSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to create travel arrangement.';
            setApiError(msg);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!selectedTravel) return;
    setApiError(null);
    deleteTravelMutation.mutate(selectedTravel.id, {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        setSelectedTravel(null);
        alert('Travel arrangement deleted successfully.');
      },
      onError: (err: any) => {
        const msg = err.message || err.details?.detail || 'Failed to delete travel arrangement.';
        setApiError(msg);
      },
    });
  };

  const columns: Column<Travel>[] = [
    { key: 'engineerName', header: 'Engineer Name', sortable: true, render: (t) => <span className="font-semibold text-slate-800 dark:text-slate-200">{t.engineerName}</span> },
    { key: 'originCountry', header: 'Origin', sortable: true, render: (t) => <div className="flex items-center space-x-1 text-xs"><MapPin className="w-3.5 h-3.5 text-slate-400" /><span>{t.originCountry}</span></div> },
    { key: 'destinationCountry', header: 'Destination', sortable: true, render: (t) => <div className="flex items-center space-x-1 text-xs font-semibold text-[var(--color-secondary)]"><MapPin className="w-3.5 h-3.5" /><span>{t.destinationCountry}</span></div> },
    { key: 'bookingDate', header: 'Booking Date', sortable: true, render: (t) => <span>{t.bookingDate || 'N/A'}</span> },
    { key: 'travelDate', header: 'Travel Date', sortable: true, render: (t) => <span>{t.travelDate || 'N/A'}</span> },
    { key: 'purpose', header: 'Purpose', sortable: true },
    { key: 'comments', header: 'Comments', render: (t) => <span className="text-xs text-slate-500 line-clamp-1">{t.comments || 'N/A'}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (t) => (
        canEdit ? (
          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenEditModal(t)}
              icon={<Edit className="w-3.5 h-3.5 text-blue-500" />}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenDeleteModal(t)}
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
        title="Global Field Mobility & Travel Operations"
        subtitle="Manage flight bookings, hotel reservations, and emergency travel dispatches."
        actions={
          canEdit ? (
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenAddModal}
              disabled={schedulesList.length === 0}
            >
              Book Field Travel
            </Button>
          ) : undefined
        }
      />

      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <GlobalSearch onSearch={(q) => setSearch(q)} placeholder="Search by engineer, origin, destination, flight number..." />
        <div className="w-full sm:w-48">
          <Dropdown value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={['All', 'Confirmed', 'Pending Approval', 'In Transit', 'Completed']} />
        </div>
      </div>

      <Table columns={columns} data={travelList} isLoading={isLoading} isError={isError} onRetry={refetch} emptyTitle="No Travel Itineraries Found" />

      {/* Add / Edit Travel Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormErrors({});
          setApiError(null);
          setSuccessMessage(null);
        }}
        title={selectedTravel ? 'Edit Travel Arrangement' : 'Book Field Travel'}
        subtitle={selectedTravel ? 'Modify travel itinerary details.' : 'Book a new travel arrangement.'}
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

          {!selectedTravel && (
            <SearchableDropdown
              label="Schedule Assignment"
              value={formData.scheduleId}
              onChange={(val) => setFormData({ ...formData, scheduleId: val })}
              options={schedulesList.map((sch) => ({
                value: sch.id,
                label: `${sch.engineerName} - ${sch.supportType} (${sch.fabSite || ''} - ${sch.country})`,
              }))}
              placeholder="Select a schedule assignment..."
              searchPlaceholder="Search engineer name, support type..."
              required
              error={formErrors.scheduleId}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Booking Date"
              value={formData.bookingDate}
              onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
            />
            <DatePicker
              label="Travel Date"
              value={formData.travelDate}
              onChange={(e) => setFormData({ ...formData, travelDate: e.target.value })}
              error={formErrors.travelDate}
            />
          </div>

          <TextInput
            label="Purpose"
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
          />

          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Comments / Notes
            </label>
            <textarea
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
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
              loading={createTravelMutation.isPending || updateTravelMutation.isPending}
            >
              {createTravelMutation.isPending || updateTravelMutation.isPending
                ? (selectedTravel ? 'Saving...' : 'Booking...')
                : (selectedTravel ? 'Save Changes' : 'Book Travel')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal for Travel */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setApiError(null);
        }}
        title="Delete Travel Arrangement"
        subtitle="Confirm deletion of travel itinerary."
      >
        <div className="space-y-4">
          {apiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {apiError}
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete this travel arrangement? This action cannot be undone.
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
              loading={deleteTravelMutation.isPending}
            >
              {deleteTravelMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
