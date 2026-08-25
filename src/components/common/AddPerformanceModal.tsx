import React, { useState, useEffect } from 'react';
import { Modal } from '../forms/Modal';
import { Button } from '../forms/Button';
import { TextInput } from '../forms/TextInput';
import { DatePicker } from '../forms/DatePicker';
import { SearchableDropdown } from '../forms/SearchableDropdown';
import type { Schedule, Performance } from '../../types';
import { useCreatePerformance } from '../../hooks/usePerformance';
import { Star, AlertTriangle, Info } from 'lucide-react';

interface AddPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule?: Schedule | null;
  schedulesList?: Schedule[];
  engineerName?: string;
  orbitId?: string;
  onSuccess?: () => void;
  onEditExisting?: (perfId?: string) => void;
}

export const AddPerformanceModal: React.FC<AddPerformanceModalProps> = ({
  isOpen,
  onClose,
  schedule,
  schedulesList,
  engineerName,
  orbitId,
  onSuccess,
  onEditExisting,
}) => {
  const createPerfMutation = useCreatePerformance();

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);

  const [formData, setFormData] = useState({
    actualStartDate: '',
    actualEndDate: '',
    escalation: false,
    escalationReason: '',
    feedback: '',
    score: '5.0',
    attachment: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isDuplicateError, setIsDuplicateError] = useState(false);
  const [existingPerfId, setExistingPerfId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize selected schedule and pre-fill form when modal opens or schedule prop changes
  useEffect(() => {
    if (!isOpen) return;

    setFormErrors({});
    setApiError(null);
    setIsDuplicateError(false);
    setExistingPerfId(null);
    setSuccessMessage(null);

    let initialSch: Schedule | null = null;
    if (schedule) {
      initialSch = schedule;
    } else if (schedulesList && schedulesList.length > 0) {
      initialSch = schedulesList[0];
    }

    if (initialSch) {
      setSelectedScheduleId(initialSch.id);
      setActiveSchedule(initialSch);
      setFormData({
        actualStartDate: initialSch.startDate || '',
        actualEndDate: initialSch.endDate || '',
        escalation: false,
        escalationReason: '',
        feedback: '',
        score: '5.0',
        attachment: '',
      });
    } else {
      setSelectedScheduleId('');
      setActiveSchedule(null);
      setFormData({
        actualStartDate: '',
        actualEndDate: '',
        escalation: false,
        escalationReason: '',
        feedback: '',
        score: '5.0',
        attachment: '',
      });
    }
  }, [isOpen, schedule, schedulesList]);

  const handleSelectSchedule = (schId: string) => {
    setSelectedScheduleId(schId);
    const found = schedulesList?.find((s) => s.id === schId) || null;
    setActiveSchedule(found);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        actualStartDate: found.startDate || prev.actualStartDate,
        actualEndDate: found.endDate || prev.actualEndDate,
      }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!selectedScheduleId) {
      errors.scheduleId = 'Schedule selection is required.';
    }

    if (!formData.actualStartDate) {
      errors.actualStartDate = 'Actual Start Date is required.';
    }

    if (formData.actualStartDate && formData.actualEndDate) {
      if (new Date(formData.actualEndDate) < new Date(formData.actualStartDate)) {
        errors.actualEndDate = 'Actual End Date cannot be earlier than Actual Start Date';
      }
    }

    if (formData.escalation && !formData.escalationReason.trim()) {
      errors.escalationReason = 'Escalation reason is required when escalation is enabled.';
    }

    const valScore = Number(formData.score);
    if (isNaN(valScore) || valScore < 1.0 || valScore > 5.0) {
      errors.score = 'Performance rating score must be between 1.0 and 5.0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setIsDuplicateError(false);
    setExistingPerfId(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    const payload: Partial<Performance> = {
      actualStartDate: formData.actualStartDate || undefined,
      actualEndDate: formData.actualEndDate || undefined,
      escalation: formData.escalation,
      escalationReason: formData.escalation ? formData.escalationReason : null,
      feedback: formData.feedback || undefined,
      score: Number(formData.score),
      attachment: formData.attachment || undefined,
    };

    createPerfMutation.mutate(
      { scheduleId: selectedScheduleId, data: payload },
      {
        onSuccess: () => {
          setSuccessMessage('Performance record created successfully.');
          if (onSuccess) onSuccess();
          setTimeout(() => {
            onClose();
            setSuccessMessage(null);
          }, 1000);
        },
        onError: (err: any) => {
          const detail = err.response?.data?.detail || err.details?.detail || err.message || '';
          if (err.response?.status === 409 || detail.includes('already exists')) {
            setIsDuplicateError(true);
            setApiError('A Performance record already exists for this schedule and start date.');
            const headerPerfId = err.response?.headers?.['x-existing-performance-id'];
            if (headerPerfId) {
              setExistingPerfId(headerPerfId);
            }
          } else {
            setApiError(detail || 'Failed to create performance record.');
          }
        },
      }
    );
  };

  // Case when no schedules exist for engineer
  const hasNoSchedules = schedulesList !== undefined && schedulesList.length === 0 && !schedule;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Performance Evaluation" maxWidth="2xl">
      {hasNoSchedules ? (
        <div className="py-6 px-4 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Info className="w-6 h-6" />
          </div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">
            No schedules are available for this engineer. Create a schedule before adding a Performance record.
          </p>
          <div className="pt-2 flex justify-center">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Notifications / Banners */}
          {apiError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300 space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                {apiError}
              </div>
              {isDuplicateError && onEditExisting && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEditExisting(existingPerfId || undefined);
                    }}
                    className="text-xs font-semibold text-rose-800 hover:text-rose-900 underline dark:text-rose-200"
                  >
                    View / Edit Existing Performance Record &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <Star className="w-4 h-4 text-emerald-500" />
              {successMessage}
            </div>
          )}

          {/* Schedule Selection or Read-Only Schedule Info Header */}
          {schedule ? (
            /* Locked / Read-Only Schedule Header */
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Associated Schedule (Locked)
                </span>
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded dark:bg-blue-900/40 dark:text-blue-300">
                  ID: {schedule.id}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Engineer: </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {schedule.engineerName || engineerName} ({schedule.engineerOrbitId || orbitId || 'N/A'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Location: </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {schedule.fabSite || schedule.siteLocation || schedule.country || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Support Type: </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{schedule.supportType || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Schedule Dates: </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {schedule.startDate || 'N/A'} to {schedule.endDate || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Schedule Dropdown Selector */
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Select Schedule <span className="text-rose-500">*</span>
              </label>
              <SearchableDropdown
                options={(schedulesList || []).map((s) => ({
                  value: s.id,
                  label: `Schedule #${s.id.slice(0, 8)}... | ${s.fabSite || s.country || 'Site'} (${s.startDate || 'N/A'} - ${s.endDate || 'N/A'})`,
                }))}
                value={selectedScheduleId}
                onChange={handleSelectSchedule}
                placeholder="Search and select schedule..."
              />
              {formErrors.scheduleId && (
                <p className="text-xs text-rose-500 mt-1">{formErrors.scheduleId}</p>
              )}

              {activeSchedule && (
                <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300">
                    <span>
                      Engineer: {activeSchedule.engineerName || engineerName} ({activeSchedule.engineerOrbitId || orbitId || 'N/A'})
                    </span>
                    <span>Status: {activeSchedule.scheduleStatus}</span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {activeSchedule.fabSite || activeSchedule.country} • {activeSchedule.supportType} ({activeSchedule.startDate} to {activeSchedule.endDate})
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actual Dates */}
          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Actual Start Date"
              value={formData.actualStartDate}
              onChange={(e) => setFormData({ ...formData, actualStartDate: e.target.value })}
              error={formErrors.actualStartDate}
              required
            />
            <DatePicker
              label="Actual End Date"
              value={formData.actualEndDate}
              onChange={(e) => setFormData({ ...formData, actualEndDate: e.target.value })}
              error={formErrors.actualEndDate}
            />
          </div>

          {/* Rating Score */}
          <div>
            <TextInput
              label="Performance Rating Score (1.0 – 5.0)"
              type="number"
              step="0.1"
              min="1.0"
              max="5.0"
              value={formData.score}
              onChange={(e) => setFormData({ ...formData, score: e.target.value })}
              placeholder="e.g. 4.8"
              error={formErrors.score}
              required
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Enter a numerical rating score from 1.0 (lowest) to 5.0 (highest).
            </p>
          </div>

          {/* Escalation Toggle & Escalation Reason */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Escalation Occurred?
              </label>
              <input
                type="checkbox"
                checked={formData.escalation}
                onChange={(e) => setFormData({ ...formData, escalation: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600"
              />
            </div>

            {formData.escalation && (
              <TextInput
                label="Escalation Reason"
                value={formData.escalationReason}
                onChange={(e) => setFormData({ ...formData, escalationReason: e.target.value })}
                placeholder="Provide mandatory escalation reason..."
                error={formErrors.escalationReason}
                required
              />
            )}
          </div>

          {/* Feedback / Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Feedback / Manager Comments
            </label>
            <textarea
              rows={3}
              value={formData.feedback}
              onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
              placeholder="Enter operational feedback, technical remarks, or performance notes..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>

          {/* Attachment */}
          <TextInput
            label="Attachment (Optional Link / Filename)"
            value={formData.attachment}
            onChange={(e) => setFormData({ ...formData, attachment: e.target.value })}
            placeholder="e.g. evaluation_report.pdf or document URL"
          />

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createPerfMutation.isPending}>
              Create Performance Evaluation
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
