import React, { useState, useMemo } from 'react';
import {
  Wrench,
  History,
  Plus,
  Layers,
  Sparkles,
  ArrowRight,
  AlertCircle,
  MapPin,
  Award,
} from 'lucide-react';
import type {
  Engineer,
  IonSkillExperience,
  IonSkillExperienceCreatePayload,
  IonSkillExperienceUpdatePayload,
} from '../../types';
import {
  useIonTools,
  useEngineerIonCurrentSummary,
  useEngineerIonHistory,
  useIonExperiences,
  useCreateIonExperience,
  useUpdateIonExperience,
  useDeleteIonExperience,
} from '../../hooks/useIonSkills';
import { getIonSkillLevelConfig } from '../../config/ionSkillLevels';
import { IonSkillLevelBadge } from './IonSkillLevelBadge';
import { IonExperienceCard } from './IonExperienceCard';
import { IonExperienceDetailDrawer } from './IonExperienceDetailDrawer';
import { IonAddEditExperienceModal } from './IonAddEditExperienceModal';
import { IonEngineerHistoryDrawer } from './IonEngineerHistoryDrawer';
import { Button } from '../forms/Button';
import { useAuth } from '../../context/AuthContext';

interface EngineerIonSkillMatrixTabProps {
  engineer: Engineer;
}

const formatDateShort = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const EngineerIonSkillMatrixTab: React.FC<EngineerIonSkillMatrixTabProps> = ({ engineer }) => {
  const { canEdit, user } = useAuth();
  const isEngineerUser = user?.role === 'Field Engineer' || user?.role === 'Engineer';
  const canModify = canEdit || (isEngineerUser && user?.engineer_id === engineer.id);

  // Drawers / Modals State
  const [selectedToolForHistory, setSelectedToolForHistory] = useState<string | undefined>(undefined);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  const [selectedToolForNewExperience, setSelectedToolForNewExperience] = useState<string | undefined>(undefined);

  const [viewingExperience, setViewingExperience] = useState<IonSkillExperience | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  const [editingExperience, setEditingExperience] = useState<IonSkillExperience | null>(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);

  const [deletingExperience, setDeletingExperience] = useState<IonSkillExperience | null>(null);

  // Data Queries
  const { data: tools = [], isLoading: isLoadingTools } = useIonTools();
  const {
    data: currentSummary,
    isLoading: isLoadingSummary,
    isError: isSummaryError,
  } = useEngineerIonCurrentSummary(engineer.id);
  const { data: fullHistory = [] } = useEngineerIonHistory(engineer.id);
  const {
    data: experiencesRes,
    isError: isExperiencesError,
  } = useIonExperiences({
    engineer_id: engineer.id,
    page_size: 100,
  });

  // Mutations
  const createMutation = useCreateIonExperience();
  const updateMutation = useUpdateIonExperience();
  const deleteMutation = useDeleteIonExperience();

  const currentSkills = currentSummary?.current_skills || [];
  const currentSkillsMap = useMemo(() => {
    const map = new Map<string, (typeof currentSkills)[0]>();
    currentSkills.forEach((s) => map.set(s.tool_id, s));
    return map;
  }, [currentSkills]);

  // Counts of assessments per tool in full history
  const toolAssessmentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    fullHistory.forEach((h) => {
      counts.set(h.tool_id, (counts.get(h.tool_id) || 0) + 1);
    });
    return counts;
  }, [fullHistory]);

  // Counts by level for the summary
  const levelCounts = useMemo(() => {
    const counts = { 4: 0, 3: 0, 2: 0, 1: 0 };
    currentSkills.forEach((s) => {
      if (s.skill_level in counts) {
        counts[s.skill_level as 1 | 2 | 3 | 4] += 1;
      }
    });
    return counts;
  }, [currentSkills]);

  const experiences = experiencesRes?.data || [];

  const handleOpenToolHistory = (toolId?: string) => {
    setSelectedToolForHistory(toolId);
    setIsHistoryDrawerOpen(true);
  };

  const handleOpenAddExperience = (preselectedToolId?: string) => {
    setEditingExperience(null);
    setSelectedToolForNewExperience(preselectedToolId);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditExperience = (exp: IonSkillExperience) => {
    setEditingExperience(exp);
    setSelectedToolForNewExperience(undefined);
    setIsAddEditModalOpen(true);
  };

  const handleOpenDetailExperience = (exp: IonSkillExperience) => {
    setViewingExperience(exp);
    setIsDetailDrawerOpen(true);
  };

  const handleSaveExperience = async (
    payloadOrEdit: IonSkillExperienceCreatePayload | { id: string; payload: IonSkillExperienceUpdatePayload }
  ) => {
    if ('id' in payloadOrEdit) {
      await updateMutation.mutateAsync(payloadOrEdit);
      if (viewingExperience && viewingExperience.experience_id === payloadOrEdit.id) {
        setIsDetailDrawerOpen(false);
      }
    } else {
      await createMutation.mutateAsync(payloadOrEdit);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingExperience) return;
    try {
      await deleteMutation.mutateAsync(deletingExperience.experience_id);
      setDeletingExperience(null);
      setIsDetailDrawerOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete experience.');
    }
  };

  if (isLoadingTools || isLoadingSummary) {
    return (
      <div className="space-y-6 py-4">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 animate-pulse space-y-4 shadow-sm">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isSummaryError || isExperiencesError) {
    return (
      <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900 space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300">
          Failed to load ION Skill Matrix data for {engineer.name}.
        </h3>
        <p className="text-xs text-rose-600 dark:text-rose-400">
          Please verify backend connectivity and tenant authorization.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner & Skill Level Summary Card */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                Axcelis Technologies (ION)
              </span>
              <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                {engineer.orbitId}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 mt-1">
              <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>ION Skill Matrix — {engineer.name}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tracks current tool capability milestones, historical evaluations, and independent field experience records.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            icon={<History className="w-3.5 h-3.5 text-indigo-500" />}
            onClick={() => handleOpenToolHistory(undefined)}
          >
            Progression History
          </Button>
        </div>

        {/* Level Distribution KPI Cards */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>Current Tool Capability Summary</span>
            <span>
              <strong className="text-slate-900 dark:text-white font-bold">{currentSkills.length}</strong> of{' '}
              <strong className="text-slate-900 dark:text-white font-bold">{tools.length}</strong> Tools Assessed
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* Level 4 - Green */}
            <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/80 dark:border-emerald-800/50 flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <span>🟩</span>
                  <span>Level 4</span>
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                  {levelCounts[4]} {levelCounts[4] === 1 ? 'Tool' : 'Tools'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium line-clamp-1">
                Independent Specialist
              </p>
            </div>

            {/* Level 3 - Yellow */}
            <div className="p-3.5 bg-yellow-50/60 dark:bg-yellow-950/20 rounded-xl border border-yellow-200/80 dark:border-yellow-800/50 flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-yellow-800 dark:text-yellow-300 flex items-center gap-1.5">
                  <span>🟨</span>
                  <span>Level 3</span>
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-200">
                  {levelCounts[3]} {levelCounts[3] === 1 ? 'Tool' : 'Tools'}
                </span>
              </div>
              <p className="text-[11px] text-yellow-700 dark:text-yellow-400 font-medium line-clamp-1">
                Supported Practitioner
              </p>
            </div>

            {/* Level 2 - Light Red */}
            <div className="p-3.5 bg-rose-50/40 dark:bg-rose-950/15 rounded-xl border border-rose-200/70 dark:border-rose-900/40 flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-rose-500 dark:text-rose-300 flex items-center gap-1.5">
                  <span>🟥</span>
                  <span>Level 2</span>
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100/70 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300">
                  {levelCounts[2]} {levelCounts[2] === 1 ? 'Tool' : 'Tools'}
                </span>
              </div>
              <p className="text-[11px] text-rose-500/90 dark:text-rose-400 font-medium line-clamp-1">
                Basic Knowledge
              </p>
            </div>

            {/* Level 1 - Red */}
            <div className="p-3.5 bg-red-100/60 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800/60 flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-red-900 dark:text-red-200 flex items-center gap-1.5">
                  <span>🟥</span>
                  <span>Level 1</span>
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-200/80 dark:bg-red-900/60 text-red-900 dark:text-red-100">
                  {levelCounts[1]} {levelCounts[1] === 1 ? 'Tool' : 'Tools'}
                </span>
              </div>
              <p className="text-[11px] text-red-800 dark:text-red-300 font-medium line-clamp-1">
                Novice / Observational
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: CURRENT TOOL CAPABILITY */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
            <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Current Tool Capability</span>
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
            Latest derived competency level per semiconductor tool
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tools.map((tool) => {
            const skill = currentSkillsMap.get(tool.tool_id);
            const totalAssCount = toolAssessmentCounts.get(tool.tool_id) || 0;
            const isAssessed = Boolean(skill);
            const levelDef = isAssessed ? getIonSkillLevelConfig(skill!.skill_level) : null;
            const latestDate = isAssessed
              ? formatDateShort(skill?.end_date || skill?.start_date || skill?.assessed_at)
              : '';
            const locationContext = skill?.where_location
              ? `${skill.where_location}${latestDate ? ` · ${latestDate}` : ''}`
              : latestDate;

            return (
              <div
                key={tool.tool_id}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs hover:shadow-md transition-all duration-150 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-3">
                  {/* Tool Header & Badge */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={tool.tool_name}>
                      {tool.tool_name}
                    </h4>
                    {isAssessed ? (
                      <IonSkillLevelBadge level={skill!.skill_level} size="sm" />
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        Not Assessed
                      </span>
                    )}
                  </div>

                  {/* Assessment Info */}
                  {isAssessed ? (
                    <div className="space-y-2.5">
                      {/* Location & Date */}
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <span>Latest Assessment</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                          <span className="truncate">{locationContext || 'Recorded'}</span>
                        </div>
                        {levelDef && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-0.5 leading-snug">
                            "{levelDef.description}"
                          </p>
                        )}
                      </div>

                      {/* Assessment Comment */}
                      {skill?.assessment_comment && (
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 text-[10px] uppercase tracking-wider">
                            <Sparkles className="w-3 h-3 text-amber-500" /> Assessment Comment:
                          </span>
                          <p className="text-xs text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap leading-relaxed">
                            "{skill.assessment_comment}"
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-4 text-center space-y-2.5 bg-slate-50/60 dark:bg-slate-800/20 rounded-lg border border-dashed border-slate-200 dark:border-slate-700/60 p-3">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        No skill assessments recorded for this tool yet.
                      </p>
                      {canModify && (
                        <button
                          type="button"
                          onClick={() => handleOpenAddExperience(tool.tool_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Assess Tool</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Count & View History Link */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">
                    {totalAssCount} {totalAssCount === 1 ? 'assessment' : 'assessments'}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleOpenToolHistory(tool.tool_id)}
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    <span>View History</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: EXPERIENCE HISTORY */}
      <div className="space-y-4 pt-2">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Experience History</span>
          </h3>

          {canModify && (
            <Button
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => handleOpenAddExperience(undefined)}
            >
              Log ION Experience
            </Button>
          )}
        </div>

        {experiences.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              No ION Skill Experience Records
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              No historical field experience records have been logged for this engineer yet.
            </p>
            {canModify && (
              <Button
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => handleOpenAddExperience(undefined)}
              >
                Add First Experience
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {experiences.map((exp) => (
              <IonExperienceCard
                key={exp.experience_id}
                experience={exp}
                onView={handleOpenDetailExperience}
                onEdit={handleOpenEditExperience}
                canEdit={canModify}
              />
            ))}
          </div>
        )}
      </div>

      {/* Experience Detail Drawer */}
      <IonExperienceDetailDrawer
        isOpen={isDetailDrawerOpen}
        experience={viewingExperience}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setViewingExperience(null);
        }}
        onEdit={(exp) => {
          setIsDetailDrawerOpen(false);
          handleOpenEditExperience(exp);
        }}
        onDelete={(exp) => setDeletingExperience(exp)}
        canEdit={canModify}
      />

      {/* Add / Edit Experience Modal */}
      <IonAddEditExperienceModal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setEditingExperience(null);
          setSelectedToolForNewExperience(undefined);
        }}
        experience={editingExperience}
        tools={tools}
        onSave={handleSaveExperience}
        isSaving={createMutation.isPending || updateMutation.isPending}
        initialEngineerId={engineer.id}
        initialToolId={selectedToolForNewExperience}
      />

      {/* Tool / Engineer Progression History Drawer */}
      <IonEngineerHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => {
          setIsHistoryDrawerOpen(false);
          setSelectedToolForHistory(undefined);
        }}
        engineerId={engineer.id}
        engineerName={engineer.name}
        orbitId={engineer.orbitId}
        tools={tools}
        initialToolId={selectedToolForHistory}
      />

      {/* Delete Confirmation Modal */}
      {deletingExperience && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Historical Experience Record?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Are you sure you want to delete the experience in{' '}
                <strong>{deletingExperience.where_location}</strong>? All associated tool assessments will also be removed.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingExperience(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteConfirm}
                loading={deleteMutation.isPending}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default EngineerIonSkillMatrixTab;
