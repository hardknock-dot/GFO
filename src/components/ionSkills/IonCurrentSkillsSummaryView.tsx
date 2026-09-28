import React from 'react';
import { User, History, Wrench, AlertCircle } from 'lucide-react';
import type { IonEngineerSkillSummary } from '../../types';
import { IonSkillLevelBadge } from './IonSkillLevelBadge';

interface IonCurrentSkillsSummaryViewProps {
  summaries: IonEngineerSkillSummary[];
  isLoading: boolean;
  onViewHistory: (summary: IonEngineerSkillSummary) => void;
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

export const IonCurrentSkillsSummaryView: React.FC<IonCurrentSkillsSummaryViewProps> = ({
  summaries,
  isLoading,
  onViewHistory,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 animate-pulse"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
              </div>
            </div>
            <div className="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (!summaries || summaries.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-xs">
        <AlertCircle className="w-10 h-10 mx-auto text-slate-400 mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          No Engineer Skill Assessments Found
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
          No current skill assessments match the selected search or filter criteria. Add experiences to populate the derived skills matrix.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {summaries.map((summary) => {
        const skillsCount = summary.current_skills?.length || 0;

        return (
          <div
            key={summary.engineer_id}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            {/* Engineer Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-3 min-w-0">
                  {summary.avatar_url ? (
                    <img
                      src={summary.avatar_url}
                      alt={summary.engineer_name}
                      className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-slate-200 dark:border-slate-700 flex-shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                      {summary.engineer_name}
                    </h3>
                    <p className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                      {summary.orbit_id}
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">
                  {skillsCount} {skillsCount === 1 ? 'Tool' : 'Tools'}
                </span>
              </div>

              {/* Current Derived Skills List */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Current ION Skills</span>
                </div>

                {skillsCount > 0 ? (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {summary.current_skills.map((skill) => {
                      const latestDate = formatDateShort(skill.end_date || skill.start_date || skill.assessed_at);
                      const assessmentContext = skill.where_location
                        ? `${skill.where_location}${latestDate ? ` — ${latestDate}` : ''}`
                        : latestDate;

                      return (
                        <div
                          key={skill.tool_id}
                          className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {skill.tool_name}
                            </span>
                            <IonSkillLevelBadge level={skill.skill_level} size="sm" />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="truncate">
                              Latest: {assessmentContext || 'Historical'}
                            </span>
                          </div>

                          {skill.assessment_comment && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 italic line-clamp-1">
                              "{skill.assessment_comment}"
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400 dark:text-slate-500 py-3 text-center">
                    No tool assessments logged for this engineer yet.
                  </p>
                )}
              </div>
            </div>

            {/* Footer Action: View Progression History */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => onViewHistory(summary)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-3 py-1.5 rounded-xl transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                <span>Skill History</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
