import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Calendar,
  MapPin,
  Building2,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import type { Schedule, DeploymentDiary } from '../../types';
import {
  useDeploymentDiaries,
  useCreateDeploymentDiary,
  useUpdateDeploymentDiary,
  useDeleteDeploymentDiary
} from '../../hooks/useDeploymentDiary';
import { Modal } from '../forms/Modal';
import { Button } from '../forms/Button';
import { CardSkeleton } from '../common/LoadingSkeleton';
import { ErrorState } from '../common/ErrorState';

interface DeploymentDiarySectionProps {
  schedules?: Schedule[];
  currentSchedule?: Schedule | null;
  engineerId?: string;
}

export const DeploymentDiarySection: React.FC<DeploymentDiarySectionProps> = ({
  schedules = [],
  currentSchedule = null,
  engineerId
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Fetch deployment diaries
  const {
    data: diaryResponse,
    isLoading,
    isError,
    refetch
  } = useDeploymentDiaries({
    engineer_id: engineerId,
    page: 1,
    page_size: 100
  });

  const createMutation = useCreateDeploymentDiary();
  const updateMutation = useUpdateDeploymentDiary();
  const deleteMutation = useDeleteDeploymentDiary();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DeploymentDiary | null>(null);

  // Form State
  const [entryDate, setEntryDate] = useState<string>(todayStr);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [entryText, setEntryText] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<DeploymentDiary | null>(null);

  // Active schedules resolution (start_date <= today AND (end_date >= today OR end_date is null))
  const activeSchedules = useMemo(() => {
    if (!schedules || schedules.length === 0) {
      return currentSchedule ? [currentSchedule] : [];
    }
    const filtered = schedules.filter((s) => {
      if (!s.startDate) return false;
      const isStarted = s.startDate <= todayStr;
      const isNotEnded = !s.endDate || s.endDate >= todayStr;
      const isNotCompleted = s.scheduleStatus !== 'Completed' && s.status !== 'Completed';
      return isStarted && isNotEnded && isNotCompleted;
    });

    if (filtered.length === 0 && currentSchedule) {
      return [currentSchedule];
    }
    return filtered;
  }, [schedules, currentSchedule, todayStr]);

  const primaryActiveSchedule = activeSchedules[0] || null;

  const diaryEntries = diaryResponse?.items || [];

  // Today's entry (or entries)
  const todayEntries = useMemo(() => {
    return diaryEntries.filter((item) => item.entry_date === todayStr);
  }, [diaryEntries, todayStr]);

  const hasTodayEntry = todayEntries.length > 0;

  // Handlers
  const handleOpenAddModal = (defaultDate: string = todayStr) => {
    setEditingEntry(null);
    setEntryDate(defaultDate);
    setSelectedScheduleId(primaryActiveSchedule?.id || '');
    setEntryText('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (entry: DeploymentDiary) => {
    setEditingEntry(entry);
    setEntryDate(entry.entry_date || todayStr);
    setSelectedScheduleId(entry.schedule_id || '');
    setEntryText(entry.entry || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenDeleteModal = (entry: DeploymentDiary) => {
    setEntryToDelete(entry);
    setDeleteModalOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!entryText.trim()) {
      setFormError('Please enter a diary note about today\'s work.');
      return;
    }

    try {
      setFormError(null);
      if (editingEntry) {
        await updateMutation.mutateAsync({
          id: editingEntry.id,
          data: {
            entry_date: entryDate,
            schedule_id: selectedScheduleId || null,
            entry: entryText.trim()
          }
        });
      } else {
        await createMutation.mutateAsync({
          entry_date: entryDate,
          schedule_id: selectedScheduleId || null,
          entry: entryText.trim()
        });
      }
      setModalOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to save diary entry. Please try again.';
      setFormError(msg);
    }
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    try {
      await deleteMutation.mutateAsync(entryToDelete.id);
      setDeleteModalOpen(false);
      setEntryToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete diary entry:', err);
    }
  };

  // Helper date formatter
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-6 h-6 text-emerald-500" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Deployment Diary</h2>
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-6 h-6 text-emerald-500" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Deployment Diary</h2>
        </div>
        <ErrorState
          title="Failed to load Deployment Diary"
          message="Could not retrieve your deployment diary entries. Please check your connectivity and try again."
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-900/40 via-slate-900 to-slate-900 border border-emerald-500/20 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center space-x-3.5 z-10">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Deployment Diary
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                Operational Notes
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Record daily work notes, customer requested checks, and field updates in under a minute.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenAddModal(todayStr)}
          className="z-10 inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-900/30 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Entry</span>
        </button>
      </div>

      {/* Current Active Deployment Card */}
      <div className="p-5 rounded-2xl bg-slate-800/80 dark:bg-slate-900/90 border border-slate-700/60 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-emerald-400" />
            Current Deployment
          </span>
          {activeSchedules.length > 1 && (
            <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              {activeSchedules.length} Active Deployments
            </span>
          )}
        </div>

        {activeSchedules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-700/40">
            <div>
              <p className="text-xs text-slate-400">Fab / Site</p>
              <p className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
                {primaryActiveSchedule.fabSite || primaryActiveSchedule.fabCity || 'Active Fab'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Country</p>
              <p className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400 inline" />
                {primaryActiveSchedule.country || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Support Type</p>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">
                {primaryActiveSchedule.supportType || 'Deployment'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Period</p>
              <p className="text-sm font-semibold text-slate-200 mt-0.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formatDate(primaryActiveSchedule.startDate)} - {primaryActiveSchedule.endDate ? formatDate(primaryActiveSchedule.endDate) : 'Ongoing'}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
            <p className="text-sm font-medium text-amber-400/90 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              No active deployment found.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              You can still record notes and view previous diary entries.
            </p>
          </div>
        )}
      </div>

      {/* Today's Entry Section */}
      <div className="p-5 rounded-2xl bg-slate-800/80 dark:bg-slate-900/90 border border-slate-700/60 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Today's Entry</h3>
            <span className="text-xs text-slate-400">({formatDate(todayStr)})</span>
          </div>
          {hasTodayEntry && (
            <button
              onClick={() => handleOpenAddModal(todayStr)}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Another Entry
            </button>
          )}
        </div>

        {hasTodayEntry ? (
          <div className="space-y-3">
            {todayEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/30 to-slate-900/80 border border-emerald-500/30 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {entry.fab_site || entry.fab_city || primaryActiveSchedule?.fabSite || 'Deployment Note'}
                      </span>
                      {entry.country && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {entry.country}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-100 whitespace-pre-wrap pt-1.5 leading-relaxed">
                      {entry.entry}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(entry)}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit Today's Entry"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(entry)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-slate-900/50 border border-dashed border-slate-700/80 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">No entry recorded for today yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Quickly record what you worked on today (e.g. chamber qualification, PM check, customer request).
              </p>
            </div>
            <button
              onClick={() => handleOpenAddModal(todayStr)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Today's Entry</span>
            </button>
          </div>
        )}
      </div>

      {/* Previous Entries Section */}
      <div className="p-5 rounded-2xl bg-slate-800/80 dark:bg-slate-900/90 border border-slate-700/60 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            Previous Entries
          </h3>
          <span className="text-xs text-slate-400">Total: {diaryEntries.length} entries</span>
        </div>

        {diaryEntries.length > 0 ? (
          <div className="space-y-3">
            {diaryEntries.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center flex-wrap gap-2 text-xs">
                      <span className="font-semibold text-emerald-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(item.entry_date)}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="font-medium text-slate-300">
                        {item.fab_site || item.fab_city || 'Deployment Note'}
                      </span>
                      {item.country && (
                        <>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">{item.country}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {item.entry}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit Entry"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(item)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-300">No diary entries yet.</p>
            <p className="text-xs text-slate-400">Add your first deployment note for today using the form above.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Entry Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingEntry ? 'Edit Deployment Diary Entry' : 'Add Deployment Diary Entry'}
        >
          <div className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Entry Date
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Deployment / Schedule
              </label>
              {activeSchedules.length > 0 ? (
                <select
                  value={selectedScheduleId}
                  onChange={(e) => setSelectedScheduleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Deployment --</option>
                  {activeSchedules.map((sch) => (
                    <option key={sch.id} value={sch.id}>
                      {sch.fabSite || sch.fabCity || 'Fab'} ({sch.country || 'N/A'}) - {sch.supportType || 'Support'}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                  No active deployment linked (optional entry without schedule)
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Diary Entry <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={4}
                value={entryText}
                onChange={(e) => setEntryText(e.target.value)}
                placeholder="Write a short note about today's work (e.g. Completed PM on Chamber 2, performed qualification)..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveEntry}
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                Save Entry
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && entryToDelete && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Confirm Delete Entry"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Are you sure you want to delete this diary entry from{' '}
              <span className="font-bold text-white">{formatDate(entryToDelete.entry_date)}</span>?
            </p>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 italic">
              "{entryToDelete.entry}"
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                isLoading={deleteMutation.isPending}
              >
                Delete Entry
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
