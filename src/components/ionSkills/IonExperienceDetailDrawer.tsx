import React from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Calendar, FileText, Wrench, Edit3, Trash2, User, Sparkles } from 'lucide-react';
import type { IonSkillExperience } from '../../types';
import { getIonSkillLevelConfig } from '../../config/ionSkillLevels';
import { IonSkillLevelBadge } from './IonSkillLevelBadge';
import { Button } from '../forms/Button';

interface IonExperienceDetailDrawerProps {
  experience: IonSkillExperience | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (experience: IonSkillExperience) => void;
  onDelete?: (experience: IonSkillExperience) => void;
  canEdit?: boolean;
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

export const IonExperienceDetailDrawer: React.FC<IonExperienceDetailDrawerProps> = ({
  experience,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  canEdit,
}) => {
  if (!isOpen || !experience) return null;

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end transition-opacity">
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-2xl h-screen bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center space-x-3.5">
            {experience.avatar_url ? (
              <img
                src={experience.avatar_url}
                alt={experience.engineer_name || 'Engineer'}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold border border-sky-200 dark:border-sky-800/60 shadow-xs">
                <User className="w-6 h-6 text-sky-600 dark:text-sky-400" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {experience.engineer_name || 'ION Engineer'}
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono uppercase">
                  {experience.orbit_id || 'ION-EMP'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Axcelis Technologies (ION) Historical Experience Record
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                Where / Location
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {experience.where_location}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Start Date
              </span>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {formatDate(experience.start_date)}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                End Date
              </span>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {formatDate(experience.end_date)}
              </p>
            </div>
          </div>

          {/* Experience Notes */}
          {experience.notes && (
            <div className="space-y-2 p-4 bg-blue-50/40 dark:bg-blue-950/20 rounded-xl border border-blue-200/60 dark:border-blue-900/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Experience Overview & Notes
              </h4>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
                {experience.notes}
              </p>
            </div>
          )}

          {/* Tool Assessments Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tool Assessments
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Specific tools operated and evaluated during this experience period
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300">
                {experience.assessments?.length || 0} Tools
              </span>
            </div>

            {experience.assessments && experience.assessments.length > 0 ? (
              <div className="space-y-3">
                {experience.assessments.map((ass, index) => {
                  const levelDef = getIonSkillLevelConfig(ass.skill_level);

                  return (
                    <div
                      key={ass.assessment_id || `${ass.tool_id}-${index}`}
                      className="p-4 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3"
                    >
                      {/* Tool Name & Level Badge */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-400">#{index + 1}</span>
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                            {ass.tool_name || 'ION Tool'}
                          </h4>
                        </div>
                        <IonSkillLevelBadge level={ass.skill_level} size="md" />
                      </div>

                      {/* Standard Level Meaning */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Level Definition
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed">
                          "{levelDef.description}"
                        </p>
                      </div>

                      {/* Engineer Assessment Comment */}
                      {ass.assessment_comment ? (
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            Engineer Assessment Comment
                          </span>
                          <p className="text-xs text-slate-900 dark:text-slate-100 leading-relaxed font-medium whitespace-pre-wrap pt-0.5">
                            "{ass.assessment_comment}"
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic p-1">
                          No specific assessment comment provided.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6">
                <Wrench className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  No Tool Assessments Recorded
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  This historical experience does not have any specific tool assessments logged.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        {canEdit && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3">
            {onDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => onDelete(experience)}
                icon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Delete Experience
              </Button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>
              {onEdit && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onEdit(experience)}
                  icon={<Edit3 className="w-3.5 h-3.5" />}
                >
                  Edit Experience
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
