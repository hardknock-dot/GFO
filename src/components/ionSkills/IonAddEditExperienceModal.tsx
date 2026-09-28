import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, MapPin, Calendar, Wrench, AlertCircle, Save, User, Sparkles } from 'lucide-react';
import type {
  IonSkillExperience,
  IonSkillTool,
  IonSkillExperienceCreatePayload,
  IonSkillExperienceUpdatePayload,
} from '../../types';
import { useEngineers } from '../../hooks/useEngineers';
import { ION_COMPANY_ID, ION_SKILL_LEVELS, getIonSkillLevelConfig } from '../../config/ionSkillLevels';

interface IonAddEditExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  experience?: IonSkillExperience | null;
  tools: IonSkillTool[];
  onSave: (payload: IonSkillExperienceCreatePayload | { id: string; payload: IonSkillExperienceUpdatePayload }) => Promise<void>;
  isSaving: boolean;
}

interface AssessmentDraft {
  assessment_id?: string;
  tool_id: string;
  skill_level: number;
  assessment_comment: string;
}

export const IonAddEditExperienceModal: React.FC<IonAddEditExperienceModalProps> = ({
  isOpen,
  onClose,
  experience,
  tools,
  onSave,
  isSaving,
}) => {
  const isEditing = Boolean(experience);
  const { data: engineersRes } = useEngineers({ company_id: ION_COMPANY_ID, pageSize: 1000 });
  const engineers = engineersRes?.data || [];

  const [engineerId, setEngineerId] = useState<string>('');
  const [whereLocation, setWhereLocation] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [assessments, setAssessments] = useState<AssessmentDraft[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (experience) {
        setEngineerId(experience.engineer_id);
        setWhereLocation(experience.where_location || '');
        setStartDate(experience.start_date ? experience.start_date.substring(0, 10) : '');
        setEndDate(experience.end_date ? experience.end_date.substring(0, 10) : '');
        setNotes(experience.notes || '');
        setAssessments(
          experience.assessments?.map((a) => ({
            assessment_id: a.assessment_id,
            tool_id: a.tool_id,
            skill_level: a.skill_level || 1,
            assessment_comment: a.assessment_comment || '',
          })) || []
        );
      } else {
        setEngineerId(engineers[0]?.id || '');
        setWhereLocation('');
        setStartDate('');
        setEndDate('');
        setNotes('');
        setAssessments([]);
      }
      setErrorMessage('');
    }
  }, [isOpen, experience, engineers.length]);

  if (!isOpen) return null;

  const handleAddAssessmentRow = () => {
    const selectedToolIds = new Set(assessments.map((a) => a.tool_id));
    const availableTool = tools.find((t) => !selectedToolIds.has(t.tool_id));
    if (!availableTool) {
      setErrorMessage('All available tools have already been added to this experience.');
      return;
    }
    setAssessments((prev) => [
      ...prev,
      {
        tool_id: availableTool.tool_id,
        skill_level: 2,
        assessment_comment: '',
      },
    ]);
    setErrorMessage('');
  };

  const handleRemoveAssessmentRow = (index: number) => {
    setAssessments((prev) => prev.filter((_, i) => i !== index));
    setErrorMessage('');
  };

  const handleAssessmentChange = (index: number, field: keyof AssessmentDraft, value: any) => {
    setAssessments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!engineerId && !isEditing) {
      setErrorMessage('Please select an engineer.');
      return;
    }

    if (!whereLocation.trim()) {
      setErrorMessage('Please provide the location / site of this experience.');
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      setErrorMessage('End date cannot be earlier than start date.');
      return;
    }

    // Check for duplicate tools
    const toolIdSet = new Set<string>();
    for (const a of assessments) {
      if (!a.tool_id) {
        setErrorMessage('Please select a valid tool for each assessment row.');
        return;
      }
      if (toolIdSet.has(a.tool_id)) {
        setErrorMessage('Duplicate tool assessments detected. Each tool can only be assessed once per experience.');
        return;
      }
      toolIdSet.add(a.tool_id);

      if (a.skill_level < 1 || a.skill_level > 4) {
        setErrorMessage('Skill levels must be between 1 and 4.');
        return;
      }
    }

    try {
      if (isEditing && experience) {
        const payload: IonSkillExperienceUpdatePayload = {
          where_location: whereLocation.trim(),
          start_date: startDate || null,
          end_date: endDate || null,
          notes: notes.trim() || null,
          assessments: assessments.map((a) => ({
            assessment_id: a.assessment_id,
            tool_id: a.tool_id,
            skill_level: a.skill_level,
            assessment_comment: a.assessment_comment?.trim() || null,
          })),
        };
        await onSave({ id: experience.experience_id, payload });
      } else {
        const payload: IonSkillExperienceCreatePayload = {
          engineer_id: engineerId,
          where_location: whereLocation.trim(),
          start_date: startDate || null,
          end_date: endDate || null,
          notes: notes.trim() || null,
          assessments: assessments.map((a) => ({
            tool_id: a.tool_id,
            skill_level: a.skill_level,
            assessment_comment: a.assessment_comment?.trim() || null,
          })),
        };
        await onSave(payload);
      }
      onClose();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Failed to save experience record.';
      setErrorMessage(typeof detail === 'string' ? detail : JSON.stringify(detail));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isEditing ? 'Edit ION Skill Experience' : 'Add New ION Skill Experience'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Axcelis Technologies (ION) — Engineer Historical Tool Competency Record
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {errorMessage && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Engineer Picker / Display */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-500" />
              Engineer <span className="text-rose-500">*</span>
            </label>

            {isEditing ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {experience?.engineer_name}
                  </span>
                  <span className="text-xs font-mono text-slate-500 ml-2">
                    ({experience?.orbit_id})
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-medium">Locked for historical integrity</span>
              </div>
            ) : (
              <select
                value={engineerId}
                onChange={(e) => setEngineerId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-hidden"
                required
              >
                <option value="">Select an ION engineer...</option>
                {engineers.map((eng) => (
                  <option key={eng.id} value={eng.id}>
                    {eng.name} — {eng.orbitId} ({eng.primaryTool || 'ION'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Location / Where */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              Where / Location <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={whereLocation}
              onChange={(e) => setWhereLocation(e.target.value)}
              placeholder="e.g. South Korea, Taiwan, Japan, Singapore, Albany NY..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-hidden"
              required
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-hidden"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              General Experience Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context about fab conditions, project scope, key milestones..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-hidden resize-none"
            />
          </div>

          {/* Dynamic Tool Assessments Builder */}
          <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-indigo-500" />
                  Tool Assessments
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add assessments only for tools actually operated or assessed during this period
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddAssessmentRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tool</span>
              </button>
            </div>

            {assessments.length === 0 ? (
              <div className="text-center py-6 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/80 p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  No tool assessments added yet. Click <span className="font-bold text-indigo-500">+ Add Tool</span> to record specific tool competencies for this experience.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {assessments.map((assDraft, idx) => {
                  const levelDef = getIonSkillLevelConfig(assDraft.skill_level);
                  const selectedToolIds = new Set(
                    assessments.filter((_, i) => i !== idx).map((a) => a.tool_id)
                  );

                  return (
                    <div
                      key={assDraft.assessment_id || idx}
                      className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3 relative group"
                    >
                      {/* Top Row: Tool selector & remove */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xs font-mono font-bold text-slate-400">
                            #{idx + 1}
                          </span>
                          <select
                            value={assDraft.tool_id}
                            onChange={(e) => handleAssessmentChange(idx, 'tool_id', e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-hidden"
                            required
                          >
                            <option value="">Select an ION tool...</option>
                            {tools.map((t) => (
                              <option
                                key={t.tool_id}
                                value={t.tool_id}
                                disabled={selectedToolIds.has(t.tool_id)}
                              >
                                {t.tool_name} {selectedToolIds.has(t.tool_id) ? '(Already Added)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveAssessmentRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors flex-shrink-0"
                          title="Remove Tool Assessment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Skill Level Selector (Interactive Buttons) */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Skill Level:
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {[1, 2, 3, 4].map((lvl) => {
                            const lvlConfig = ION_SKILL_LEVELS[lvl];
                            const isSelected = assDraft.skill_level === lvl;

                            return (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => handleAssessmentChange(idx, 'skill_level', lvl)}
                                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 border ${
                                  isSelected
                                    ? `${lvlConfig.badgeClass} ring-2 ring-offset-1 dark:ring-offset-slate-900 ring-[var(--color-primary)] font-black shadow-xs scale-[1.02]`
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <span className="flex items-center gap-1">
                                  <span>{lvlConfig.iconSymbol}</span>
                                  <span>L{lvl}</span>
                                </span>
                                <span className="text-[9px] opacity-75 font-normal truncate max-w-full px-1">
                                  {lvl === 4 ? 'Independent' : lvl === 3 ? 'Supported' : lvl === 2 ? 'Basic' : 'Novice'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic px-1">
                          "{levelDef.description}"
                        </p>
                      </div>

                      {/* Assessment Comment */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          Engineer Assessment Comment (Distinct from level definition)
                        </label>
                        <textarea
                          rows={2}
                          value={assDraft.assessment_comment}
                          onChange={(e) =>
                            handleAssessmentChange(idx, 'assessment_comment', e.target.value)
                          }
                          placeholder="e.g. Hands-on experience in alignment, chamber preventive maintenance, recipe verification..."
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-hidden resize-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : isEditing ? 'Update Experience' : 'Save Experience'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
