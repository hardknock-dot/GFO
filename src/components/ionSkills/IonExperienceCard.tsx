import React from 'react';
import { MapPin, Calendar, Wrench, Eye, Edit2, User, ChevronRight } from 'lucide-react';
import type { IonSkillExperience } from '../../types';
import { IonSkillLevelBadge } from './IonSkillLevelBadge';

interface IonExperienceCardProps {
  experience: IonSkillExperience;
  onView: (experience: IonSkillExperience) => void;
  onEdit?: (experience: IonSkillExperience) => void;
  canEdit?: boolean;
}

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const IonExperienceCard: React.FC<IonExperienceCardProps> = ({
  experience,
  onView,
  onEdit,
  canEdit,
}) => {
  const startDate = formatDate(experience.start_date);
  const endDate = formatDate(experience.end_date);
  const dateRangeText = startDate && endDate
    ? `${startDate} — ${endDate}`
    : startDate
      ? `From ${startDate}`
      : endDate
        ? `Until ${endDate}`
        : 'Historical Period';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      {/* Header: Engineer & Location */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            {experience.avatar_url ? (
              <img
                src={experience.avatar_url}
                alt={experience.engineer_name || 'Engineer'}
                className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 flex-shrink-0">
                <User className="w-5 h-5 opacity-70" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {experience.engineer_name || 'ION Engineer'}
              </h3>
              <p className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                {experience.orbit_id || 'ION-EMP'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(experience);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Edit Experience"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onView(experience)}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Details</span>
            </button>
          </div>
        </div>

        {/* Location & Dates Bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-1 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
            <span className="uppercase tracking-wide">{experience.where_location}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{dateRangeText}</span>
          </div>
        </div>

        {/* Tool Assessments Chips */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <Wrench className="w-3 h-3" />
              Tool Assessments ({experience.assessments?.length || 0})
            </span>
          </div>

          {experience.assessments && experience.assessments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {experience.assessments.map((ass) => (
                <div
                  key={ass.assessment_id || ass.tool_id}
                  className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl"
                >
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={ass.tool_name}>
                    {ass.tool_name || 'ION Tool'}
                  </span>
                  <IonSkillLevelBadge level={ass.skill_level} size="sm" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs italic text-slate-400 dark:text-slate-500 py-1">
              No specific tool assessments recorded for this period.
            </p>
          )}

          {experience.notes && (
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 italic pt-1">
              "{experience.notes}"
            </p>
          )}
        </div>
      </div>

      {/* Footer view action */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <span className="text-[11px] text-slate-400">
          Historical record
        </span>
        <button
          type="button"
          onClick={() => onView(experience)}
          className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
        >
          <span>View Experience</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
