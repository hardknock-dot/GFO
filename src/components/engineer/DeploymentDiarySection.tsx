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
  Clock,
  Sparkles
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

/**
 * Compulsory Palette Constants for Field Engineer Dashboard:
 * 1. Primary Dark Sage Green: #6B9080
 * 2. Medium Sage Green:       #A4C3B2
 * 3. Soft Mint / Border:      #CCE3DE
 * 4. Light Card Background:   #EAF4F4
 * 5. Page Tint / Subcard:     #F6FFF8
 */
const C_PRIMARY = '#6B9080';
const C_PRIMARY_HOVER = '#527364';
const C_MEDIUM_SAGE = '#A4C3B2';
const C_BORDER = '#CCE3DE';
const C_CARD_BG = '#EAF4F4';
const C_SUBCARD_BG = '#F6FFF8';
const C_TEXT_MAIN = '#253830';

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
          <BookOpen className="w-6 h-6" style={{ color: C_PRIMARY }} />
          <h2 className="text-xl font-bold" style={{ color: C_TEXT_MAIN }}>Deployment Diary</h2>
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-6 h-6" style={{ color: C_PRIMARY }} />
          <h2 className="text-xl font-bold" style={{ color: C_TEXT_MAIN }}>Deployment Diary</h2>
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
      {/* Header Banner - Compulsory Theme (#6B9080) */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl shadow-md border relative overflow-hidden transition-all text-white"
        style={{
          backgroundColor: C_PRIMARY,
          borderColor: C_BORDER
        }}
      >
        <div
          className="absolute top-0 right-0 -mt-6 -mr-6 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: C_MEDIUM_SAGE }}
        />

        <div className="flex items-center space-x-4 z-10">
          <div
            className="p-3 rounded-xl border backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: '#FFFFFF'
            }}
          >
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold tracking-tight text-white">
                Deployment Diary
              </h2>
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-semibold border backdrop-blur-md"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                  color: '#FFFFFF'
                }}
              >
                Operational Notes
              </span>
            </div>
            <p className="text-xs opacity-90 mt-1 max-w-xl text-white">
              Record daily work notes, customer requested checks, and field updates in under a minute.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenAddModal(todayStr)}
          className="z-10 inline-flex items-center justify-center space-x-2 px-4 py-2.5 font-bold text-xs rounded-xl shadow-md transition-all duration-200 active:scale-95"
          style={{
            backgroundColor: C_MEDIUM_SAGE,
            color: C_TEXT_MAIN,
            borderColor: C_BORDER
          }}
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Entry</span>
        </button>
      </div>

      {/* Current Active Deployment Card (#EAF4F4) */}
      <div
        className="p-6 rounded-2xl border shadow-xs space-y-4"
        style={{
          backgroundColor: C_CARD_BG,
          borderColor: C_BORDER,
          color: C_TEXT_MAIN
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: C_BORDER }}>
          <span className="text-xs uppercase tracking-wider font-bold flex items-center gap-2" style={{ color: C_PRIMARY }}>
            <Building2 className="w-4 h-4" />
            Current Deployment
          </span>
          {activeSchedules.length > 1 && (
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full border"
              style={{
                backgroundColor: C_BORDER,
                color: C_PRIMARY,
                borderColor: C_MEDIUM_SAGE
              }}
            >
              {activeSchedules.length} Active Deployments
            </span>
          )}
        </div>

        {activeSchedules.length > 0 ? (
          <div
            className="grid grid-cols-1 md:grid-cols-4 gap-5 p-4 rounded-xl border shadow-2xs"
            style={{
              backgroundColor: C_SUBCARD_BG,
              borderColor: C_BORDER
            }}
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: C_PRIMARY }}>Fab / Site</p>
              <p className="text-sm font-bold mt-1 flex items-center gap-1.5" style={{ color: C_TEXT_MAIN }}>
                {primaryActiveSchedule.fabSite || primaryActiveSchedule.fabCity || 'Active Fab'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: C_PRIMARY }}>Country</p>
              <p className="text-sm font-bold mt-1 flex items-center gap-1.5" style={{ color: C_TEXT_MAIN }}>
                <MapPin className="w-3.5 h-3.5 text-rose-500 inline" />
                {primaryActiveSchedule.country || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: C_PRIMARY }}>Support Type</p>
              <p className="text-sm font-extrabold mt-1" style={{ color: C_PRIMARY }}>
                {primaryActiveSchedule.supportType || 'Deployment'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: C_PRIMARY }}>Period</p>
              <p className="text-sm font-semibold mt-1 flex items-center gap-1.5" style={{ color: C_TEXT_MAIN }}>
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {formatDate(primaryActiveSchedule.startDate)} - {primaryActiveSchedule.endDate ? formatDate(primaryActiveSchedule.endDate) : 'Ongoing'}
              </p>
            </div>
          </div>
        ) : (
          <div
            className="p-4 rounded-xl border text-center"
            style={{
              backgroundColor: C_SUBCARD_BG,
              borderColor: C_BORDER
            }}
          >
            <p className="text-sm font-medium flex items-center justify-center gap-2" style={{ color: C_PRIMARY }}>
              <AlertCircle className="w-4 h-4" />
              No active deployment found.
            </p>
            <p className="text-xs opacity-80 mt-1" style={{ color: C_TEXT_MAIN }}>
              You can still record notes and view previous diary entries.
            </p>
          </div>
        )}
      </div>

      {/* Today's Entry Section (#EAF4F4) */}
      <div
        className="p-6 rounded-2xl border shadow-xs space-y-4"
        style={{
          backgroundColor: C_CARD_BG,
          borderColor: C_BORDER,
          color: C_TEXT_MAIN
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: C_BORDER }}>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold" style={{ color: C_TEXT_MAIN }}>Today's Entry</h3>
            <span className="text-xs opacity-75 font-medium">({formatDate(todayStr)})</span>
          </div>
          {hasTodayEntry && (
            <button
              onClick={() => handleOpenAddModal(todayStr)}
              className="text-xs font-bold hover:underline flex items-center gap-1"
              style={{ color: C_PRIMARY }}
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
                className="p-4 rounded-xl border shadow-2xs"
                style={{
                  backgroundColor: C_SUBCARD_BG,
                  borderColor: C_BORDER
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-semibold px-2.5 py-0.5 rounded border"
                        style={{
                          backgroundColor: C_BORDER,
                          color: C_PRIMARY,
                          borderColor: C_MEDIUM_SAGE
                        }}
                      >
                        {entry.fab_site || entry.fab_city || primaryActiveSchedule?.fabSite || 'Deployment Note'}
                      </span>
                      {entry.country && (
                        <span className="text-xs flex items-center gap-1" style={{ color: C_TEXT_MAIN }}>
                          <MapPin className="w-3 h-3 text-rose-500" />
                          {entry.country}
                        </span>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap pt-1 leading-relaxed" style={{ color: C_TEXT_MAIN }}>
                      {entry.entry}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(entry)}
                      className="p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
                      style={{ color: C_PRIMARY }}
                      title="Edit Today's Entry"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(entry)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
          <div
            className="p-6 rounded-xl border border-dashed text-center space-y-3"
            style={{
              backgroundColor: C_SUBCARD_BG,
              borderColor: C_MEDIUM_SAGE
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: C_BORDER, color: C_PRIMARY }}
            >
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: C_TEXT_MAIN }}>No entry recorded for today yet</p>
              <p className="text-xs mt-1 max-w-md mx-auto opacity-80" style={{ color: C_TEXT_MAIN }}>
                Quickly record what you worked on today (e.g. chamber qualification, PM check, customer request).
              </p>
            </div>
            <button
              onClick={() => handleOpenAddModal(todayStr)}
              className="inline-flex items-center space-x-2 px-4 py-2 font-bold text-xs rounded-xl shadow-sm transition-all"
              style={{
                backgroundColor: C_PRIMARY,
                color: '#FFFFFF'
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Today's Entry</span>
            </button>
          </div>
        )}
      </div>

      {/* Previous Entries Section (#EAF4F4) */}
      <div
        className="p-6 rounded-2xl border shadow-xs space-y-4"
        style={{
          backgroundColor: C_CARD_BG,
          borderColor: C_BORDER,
          color: C_TEXT_MAIN
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: C_BORDER }}>
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: C_TEXT_MAIN }}>
            <Clock className="w-4 h-4" style={{ color: C_PRIMARY }} />
            Previous Entries
          </h3>
          <span className="text-xs font-semibold opacity-80">Total: {diaryEntries.length} entries</span>
        </div>

        {diaryEntries.length > 0 ? (
          <div className="space-y-3">
            {diaryEntries.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border transition-colors shadow-2xs"
                style={{
                  backgroundColor: C_SUBCARD_BG,
                  borderColor: C_BORDER
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center flex-wrap gap-2 text-xs">
                      <span className="font-bold flex items-center gap-1" style={{ color: C_PRIMARY }}>
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(item.entry_date)}
                      </span>
                      <span className="opacity-40">•</span>
                      <span className="font-semibold" style={{ color: C_TEXT_MAIN }}>
                        {item.fab_site || item.fab_city || 'Deployment Note'}
                      </span>
                      {item.country && (
                        <>
                          <span className="opacity-40">•</span>
                          <span className="opacity-80" style={{ color: C_TEXT_MAIN }}>{item.country}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: C_TEXT_MAIN }}>
                      {item.entry}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
                      style={{ color: C_PRIMARY }}
                      title="Edit Entry"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(item)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
          <div
            className="p-8 rounded-xl border text-center space-y-2"
            style={{
              backgroundColor: C_SUBCARD_BG,
              borderColor: C_BORDER
            }}
          >
            <BookOpen className="w-8 h-8 opacity-40 mx-auto" style={{ color: C_PRIMARY }} />
            <p className="text-sm font-medium" style={{ color: C_TEXT_MAIN }}>No diary entries yet.</p>
            <p className="text-xs opacity-75" style={{ color: C_TEXT_MAIN }}>Add your first deployment note for today using the button above.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Entry Modal (#EAF4F4) */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingEntry ? 'Edit Deployment Diary Entry' : 'Add Deployment Diary Entry'}
        >
          <div className="space-y-4" style={{ backgroundColor: C_CARD_BG, color: C_TEXT_MAIN }}>
            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: C_TEXT_MAIN }}>
                Entry Date
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm shadow-2xs focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: C_SUBCARD_BG,
                  borderColor: C_BORDER,
                  color: C_TEXT_MAIN
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: C_TEXT_MAIN }}>
                Deployment / Schedule
              </label>
              {activeSchedules.length > 0 ? (
                <select
                  value={selectedScheduleId}
                  onChange={(e) => setSelectedScheduleId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm shadow-2xs focus:outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: C_SUBCARD_BG,
                    borderColor: C_BORDER,
                    color: C_TEXT_MAIN
                  }}
                >
                  <option value="" style={{ backgroundColor: C_SUBCARD_BG, color: C_TEXT_MAIN }}>-- Select Deployment --</option>
                  {activeSchedules.map((sch) => (
                    <option key={sch.id} value={sch.id} style={{ backgroundColor: C_SUBCARD_BG, color: C_TEXT_MAIN }}>
                      {sch.fabSite || sch.fabCity || 'Fab'} ({sch.country || 'N/A'}) - {sch.supportType || 'Support'}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 rounded-xl border text-xs opacity-80" style={{ backgroundColor: C_SUBCARD_BG, borderColor: C_BORDER }}>
                  No active deployment linked (optional entry without schedule)
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: C_TEXT_MAIN }}>
                Diary Entry <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={entryText}
                onChange={(e) => setEntryText(e.target.value)}
                placeholder="Write a short note about today's work (e.g. Completed PM on Chamber 2, performed qualification)..."
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm shadow-2xs focus:outline-none focus:ring-2 placeholder:text-slate-400 transition-all"
                style={{
                  backgroundColor: C_SUBCARD_BG,
                  borderColor: C_BORDER,
                  color: C_TEXT_MAIN
                }}
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t" style={{ borderColor: C_BORDER }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border transition-all"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: C_BORDER,
                  color: C_TEXT_MAIN
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEntry}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 text-xs font-bold rounded-xl text-white shadow-md transition-all disabled:opacity-50"
                style={{
                  backgroundColor: C_PRIMARY,
                }}
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Entry'}
              </button>
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
          <div className="space-y-4" style={{ backgroundColor: C_CARD_BG, color: C_TEXT_MAIN }}>
            <p className="text-sm">
              Are you sure you want to delete this diary entry from{' '}
              <span className="font-bold">{formatDate(entryToDelete.entry_date)}</span>?
            </p>
            <div className="p-3 rounded-xl border text-xs italic" style={{ backgroundColor: C_SUBCARD_BG, borderColor: C_BORDER }}>
              "{entryToDelete.entry}"
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2 border-t" style={{ borderColor: C_BORDER }}>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border transition-all"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: C_BORDER,
                  color: C_TEXT_MAIN
                }}
              >
                Cancel
              </button>
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
