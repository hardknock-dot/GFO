import React, { useState } from 'react';
import {
  Plus,
  Search,
  Wrench,
  Layers,
  Sparkles,
  MapPin,
  Calendar,
  AlertCircle,
  LayoutGrid,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { PageHeader } from '../components/layout/PageHeader';
import {
  useIonTools,
  useIonExperiences,
  useIonCompanySummary,
  useCreateIonExperience,
  useUpdateIonExperience,
  useDeleteIonExperience,
} from '../hooks/useIonSkills';
import type {
  IonSkillExperience,
  IonEngineerSkillSummary,
  IonSkillExperienceCreatePayload,
  IonSkillExperienceUpdatePayload,
} from '../types';
import { ION_COMPANY_ID } from '../config/ionSkillLevels';
import { IonExperienceCard } from '../components/ionSkills/IonExperienceCard';
import { IonExperienceDetailDrawer } from '../components/ionSkills/IonExperienceDetailDrawer';
import { IonAddEditExperienceModal } from '../components/ionSkills/IonAddEditExperienceModal';
import { IonEngineerHistoryDrawer } from '../components/ionSkills/IonEngineerHistoryDrawer';
import { IonCurrentSkillsSummaryView } from '../components/ionSkills/IonCurrentSkillsSummaryView';
import { DeleteRequestModal } from '../components/common/DeleteRequestModal';

export const IonSkillsPage: React.FC = () => {
  const { canEdit, user } = useAuth();
  const isOpsExecutive = user?.role === 'Ops Executive';
  const { currentCompany } = useCompany();

  // Tenant Verification Check
  const activeCompanyId = currentCompany?.company_id || currentCompany?.id;
  const isIonCompany = activeCompanyId === ION_COMPANY_ID;

  // View state
  const [viewMode, setViewMode] = useState<'timeline' | 'summary'>('timeline');

  // Filter states
  const [search, setSearch] = useState<string>('');
  const [selectedToolId, setSelectedToolId] = useState<string>('');
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string>('');
  const [whereLocationFilter, setWhereLocationFilter] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Modals & Drawers state
  const [viewingExperience, setViewingExperience] = useState<IonSkillExperience | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState<boolean>(false);

  const [editingExperience, setEditingExperience] = useState<IonSkillExperience | null>(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);

  const [historyEngineer, setHistoryEngineer] = useState<{ id: string; name: string; orbitId: string } | null>(null);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);

  const [deletingExperience, setDeletingExperience] = useState<IonSkillExperience | null>(null);

  // Queries
  const { data: tools = [] } = useIonTools();

  const minLevel = selectedSkillLevel === '3+' ? 3 : undefined;
  const exactLevel = ['1', '2', '3', '4'].includes(selectedSkillLevel) ? Number(selectedSkillLevel) : undefined;

  const {
    data: experiencesRes,
    isLoading: isLoadingExperiences,
    isError: isExperiencesError,
    refetch: refetchExperiences,
  } = useIonExperiences({
    search: search || undefined,
    tool_id: selectedToolId || undefined,
    skill_level: exactLevel,
    min_skill_level: minLevel,
    where_location: whereLocationFilter || undefined,
    start_date: startDateFilter || undefined,
    end_date: endDateFilter || undefined,
    page,
    page_size: 18,
  });

  const {
    data: summaries = [],
    isLoading: isLoadingSummaries,
  } = useIonCompanySummary({
    search: search || undefined,
    tool_id: selectedToolId || undefined,
    min_level: exactLevel || minLevel,
  });

  // Mutations
  const createMutation = useCreateIonExperience();
  const updateMutation = useUpdateIonExperience();
  const deleteMutation = useDeleteIonExperience();

  if (!isIonCompany) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mt-8">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Company Context Mismatch
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The <strong className="text-slate-800 dark:text-slate-200">ION Skill & Experience</strong> module is dedicated exclusively to{' '}
          <strong>Axcelis Technologies (ION)</strong>. Please select Axcelis Technologies from the company switcher to access this module.
        </p>
      </div>
    );
  }

  const handleOpenAdd = () => {
    setEditingExperience(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (exp: IonSkillExperience) => {
    setEditingExperience(exp);
    setIsAddEditModalOpen(true);
  };

  const handleOpenDetail = (exp: IonSkillExperience) => {
    setViewingExperience(exp);
    setIsDetailDrawerOpen(true);
  };

  const handleOpenHistory = (summary: IonEngineerSkillSummary) => {
    setHistoryEngineer({
      id: summary.engineer_id,
      name: summary.engineer_name,
      orbitId: summary.orbit_id,
    });
    setIsHistoryDrawerOpen(true);
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

  const experiences = experiencesRes?.data || (experiencesRes as any)?.items || [];
  const totalPages = experiencesRes?.totalPages || (experiencesRes as any)?.total_pages || 1;
  const totalRecords = experiencesRes?.total ?? ((experiencesRes as any)?.items?.length || 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Axcelis ION Skill & Experience"
        subtitle="Tracks engineer historical tool experience records, competency milestones, and technical skill assessments."
        actions={
          <div className="flex items-center gap-3">
            {canEdit && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Experience</span>
              </button>
            )}
          </div>
        }
      />

      {/* Control Bar: View Switcher & Search & Filters */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search engineer name, Orbit ID, location, or assessment comments..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
            />
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex-shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Experience Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('summary')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'summary'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Latest Skill Summary</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Tool Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Wrench className="w-3 h-3" />
              Tool Model
            </label>
            <select
              value={selectedToolId}
              onChange={(e) => setSelectedToolId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              <option value="">All ION Tools</option>
              {tools.map((t) => (
                <option key={t.tool_id} value={t.tool_id}>
                  {t.tool_name}
                </option>
              ))}
            </select>
          </div>

          {/* Skill Level Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Skill Level
            </label>
            <select
              value={selectedSkillLevel}
              onChange={(e) => setSelectedSkillLevel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              <option value="">All Skill Levels</option>
              <option value="4">🟩 Level 4 Only (Independent Specialist)</option>
              <option value="3+">🟨 Level 3+ (Supported & Independent)</option>
              <option value="3">🟨 Level 3 (Supported Practitioner)</option>
              <option value="2">🟧 Level 2 (Basic Knowledge)</option>
              <option value="1">🟥 Level 1 (Novice / Observational)</option>
            </select>
          </div>

          {/* Location Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Location
            </label>
            <input
              type="text"
              value={whereLocationFilter}
              onChange={(e) => setWhereLocationFilter(e.target.value)}
              placeholder="e.g. South Korea..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          {/* Start Date Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Start After
            </label>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          {/* End Date Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              End Before
            </label>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Main Content View */}
      {viewMode === 'timeline' ? (
        <div className="space-y-6">
          {isLoadingExperiences ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 animate-pulse p-5 space-y-3"
                >
                  <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
                  <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
                  <div className="h-28 bg-slate-100 dark:bg-slate-800/40 rounded-xl mt-4" />
                </div>
              ))}
            </div>
          ) : isExperiencesError ? (
            <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900 space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-sm font-bold text-rose-800 dark:text-rose-300">
                Failed to load ION skill experiences.
              </p>
              <button
                type="button"
                onClick={() => refetchExperiences()}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : experiences.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No Experience Records Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                No historical ION experiences matched your search criteria. Click{' '}
                <strong className="text-blue-600 dark:text-blue-400">+ Add Experience</strong> to log a new record.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  Showing <strong className="text-slate-800 dark:text-slate-200">{experiences.length}</strong> of{' '}
                  <strong className="text-slate-800 dark:text-slate-200">{totalRecords}</strong> experience records
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {experiences.map((exp) => (
                  <IonExperienceCard
                    key={exp.experience_id}
                    experience={exp}
                    onView={handleOpenDetail}
                    onEdit={handleOpenEdit}
                    canEdit={canEdit}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-medium text-slate-500 px-3">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <IonCurrentSkillsSummaryView
            summaries={summaries}
            isLoading={isLoadingSummaries}
            onViewHistory={handleOpenHistory}
          />
        </div>
      )}

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
          handleOpenEdit(exp);
        }}
        onDelete={(exp) => setDeletingExperience(exp)}
        canEdit={canEdit}
      />

      {/* Add / Edit Experience Modal */}
      <IonAddEditExperienceModal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setEditingExperience(null);
        }}
        experience={editingExperience}
        tools={tools}
        onSave={handleSaveExperience}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      {/* Engineer Skill History Drawer */}
      <IonEngineerHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => {
          setIsHistoryDrawerOpen(false);
          setHistoryEngineer(null);
        }}
        engineerId={historyEngineer?.id}
        engineerName={historyEngineer?.name}
        orbitId={historyEngineer?.orbitId}
        tools={tools}
      />

      {/* Delete Confirmation Modal / Deletion Request Modal */}
      {deletingExperience && isOpsExecutive ? (
        <DeleteRequestModal
          isOpen={!!deletingExperience}
          onClose={() => setDeletingExperience(null)}
          entityType="IonSkillExperience"
          entityId={deletingExperience.experience_id}
          entityName={`ION Experience: ${deletingExperience.where_location}${deletingExperience.engineer_name ? ` (${deletingExperience.engineer_name})` : ''}`}
          onSuccess={() => {
            setDeletingExperience(null);
            setIsDetailDrawerOpen(false);
            refetchExperiences();
          }}
        />
      ) : deletingExperience && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Historical Experience Record?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to delete the experience in{' '}
                <strong>{deletingExperience.where_location}</strong> for{' '}
                <strong>{deletingExperience.engineer_name}</strong>? All associated tool assessments will also be removed. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingExperience(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default IonSkillsPage;
