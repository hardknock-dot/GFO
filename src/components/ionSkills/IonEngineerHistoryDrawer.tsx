import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, History, Wrench, MapPin, Calendar, Sparkles, Filter, Trash2, AlertTriangle } from 'lucide-react';
import type { IonSkillTool, IonSkillHistoryItem } from '../../types';
import { useEngineerIonHistory, useDeleteIonAssessment } from '../../hooks/useIonSkills';
import { IonSkillLevelBadge } from './IonSkillLevelBadge';
import { getIonSkillLevelConfig } from '../../config/ionSkillLevels';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../forms/Button';
import { DeleteRequestModal } from '../common/DeleteRequestModal';

interface IonEngineerHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  engineerId?: string;
  engineerName?: string;
  orbitId?: string;
  tools: IonSkillTool[];
  initialToolId?: string;
}

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return 'Not Specified';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const IonEngineerHistoryDrawer: React.FC<IonEngineerHistoryDrawerProps> = ({
  isOpen,
  onClose,
  engineerId,
  engineerName,
  orbitId,
  tools,
  initialToolId,
}) => {
  const { canEdit, user } = useAuth();
  const isOpsExecutive = user?.role === 'Ops Executive';
  const isEngineerUser = user?.role === 'Field Engineer' || user?.role === 'Engineer';
  const canDeleteRow = canEdit && !isEngineerUser;

  const [selectedToolId, setSelectedToolId] = useState<string>(initialToolId || '');
  const [assessmentToDelete, setAssessmentToDelete] = useState<IonSkillHistoryItem | null>(null);

  const deleteAssessmentMutation = useDeleteIonAssessment();

  React.useEffect(() => {
    if (isOpen) {
      setSelectedToolId(initialToolId || '');
      setAssessmentToDelete(null);
    }
  }, [isOpen, initialToolId]);

  const { data: history = [], isLoading } = useEngineerIonHistory(
    engineerId,
    selectedToolId || undefined
  );

  if (!isOpen || !engineerId) return null;

  const handleDeleteAssessment = async () => {
    if (!assessmentToDelete) return;
    try {
      await deleteAssessmentMutation.mutateAsync(assessmentToDelete.assessment_id);
      setAssessmentToDelete(null);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete assessment row.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end transition-opacity">
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-xl h-screen bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[var(--color-primary)] text-white font-bold flex items-center justify-center shadow-xs shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  {engineerName || 'ION Engineer'}
                </h2>
                {orbitId && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {orbitId}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Historical Tool Competency Progression Timeline
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Filter Tool:</span>
          </div>

          <select
            value={selectedToolId}
            onChange={(e) => setSelectedToolId(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--color-primary)] outline-hidden"
          >
            <option value="">All ION Tools</option>
            {tools.map((t) => (
              <option key={t.tool_id} value={t.tool_id}>
                {t.tool_name}
              </option>
            ))}
          </select>
        </div>

        {/* Timeline body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">Loading skill progression history...</div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
              No historical assessments found for the selected criteria.
            </div>
          ) : (
            <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
              {history.map((item, index) => {
                const levelDef = getIonSkillLevelConfig(item.skill_level);
                const startDate = formatDate(item.start_date);
                const endDate = formatDate(item.end_date);
                const period = startDate && endDate ? `${startDate} — ${endDate}` : startDate || endDate || 'Historical';

                return (
                  <div key={item.assessment_id || index} className="relative group">
                    {/* Timeline Node */}
                    <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-[var(--color-primary)] flex items-center justify-center shadow-xs">
                      <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                    </div>

                    <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/90 dark:border-slate-700 rounded-xl space-y-2.5 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                      {/* Tool & Level & Actions */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {item.tool_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <IonSkillLevelBadge level={item.skill_level} size="sm" />
                          {canDeleteRow && (
                            <button
                              type="button"
                              onClick={() => setAssessmentToDelete(item)}
                              title="Delete this skill assessment row"
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Location & Period */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          {item.where_location}
                        </span>
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" />
                          {period}
                        </span>
                      </div>

                      {/* Level meaning */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                        "{levelDef.description}"
                      </p>

                      {/* Comment */}
                      {item.assessment_comment && (
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-medium">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            Assessment Comment
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200">{item.assessment_comment}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>

      {/* Delete Single Assessment Confirmation Modal / Delete Request Modal */}
      {assessmentToDelete && isOpsExecutive ? (
        <DeleteRequestModal
          isOpen={!!assessmentToDelete}
          onClose={() => setAssessmentToDelete(null)}
          entityType="IonSkillAssessment"
          entityId={assessmentToDelete.assessment_id}
          entityName={`ION Assessment: ${assessmentToDelete.tool_name} (Level ${assessmentToDelete.skill_level}) - ${assessmentToDelete.where_location}`}
          onSuccess={() => {
            setAssessmentToDelete(null);
          }}
        />
      ) : assessmentToDelete && (
        <div className="fixed inset-0 z-60 overflow-hidden flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity"
            onClick={() => setAssessmentToDelete(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 z-10 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Skill Assessment Row?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete this historical <strong>Level {assessmentToDelete.skill_level}</strong> assessment on <strong>{assessmentToDelete.tool_name}</strong> at <strong>{assessmentToDelete.where_location}</strong>? This action will recalculate the engineer's current skill levels.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAssessmentToDelete(null)}
                disabled={deleteAssessmentMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDeleteAssessment}
                loading={deleteAssessmentMutation.isPending}
                icon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Delete Row
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
