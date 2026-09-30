import React from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Calendar, FileText, Wrench, Edit3, Trash2, User, Sparkles } from 'lucide-react';
import type { IonSkillExperience } from '../../types';
import { getIonSkillLevelConfig } from '../../config/ionSkillLevels';
import { IonSkillLevelBadge } from './IonSkillLevelBadge';
import { Button } from '../forms/Button';
import { useCompany } from '../../context/CompanyContext';
import { getCompanyTheme } from '../../config/companyThemes';

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
  const { currentCompany } = useCompany();
  const themeKey = currentCompany.theme_key || currentCompany.company_id || currentCompany.id || currentCompany.code;
  const theme = getCompanyTheme(themeKey);

  const primaryColor = currentCompany.primaryColor || theme.primary || 'var(--color-primary)';
  const cardColor = currentCompany.cardColor || 'var(--color-card)';
  const borderColor = currentCompany.borderColor || 'var(--color-border)';
  const textColor = currentCompany.textColor || 'var(--color-text-primary)';
  const textMutedColor = currentCompany.textMutedColor || 'var(--color-text-secondary)';
  const accentSoft = theme.accentSoft || 'var(--color-accent-soft)';

  if (!isOpen || !experience) return null;

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end transition-opacity">
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div 
        style={{
          backgroundColor: cardColor,
          borderColor: borderColor,
        }}
        className="relative w-full max-w-2xl h-screen shadow-2xl border-l flex flex-col z-10 animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div 
          style={{
            borderColor: borderColor,
            backgroundColor: cardColor,
          }}
          className="p-6 border-b flex items-start justify-between gap-4"
        >
          <div className="flex items-center space-x-3.5">
            {experience.avatar_url ? (
              <img
                src={experience.avatar_url}
                alt={experience.engineer_name || 'Engineer'}
                style={{ borderColor: borderColor }}
                className="w-12 h-12 rounded-xl object-cover border shadow-xs"
              />
            ) : (
              <div 
                style={{
                  backgroundColor: `${primaryColor}15`,
                  borderColor: `${primaryColor}30`,
                  color: primaryColor,
                }}
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold border shadow-xs"
              >
                <User className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 style={{ color: textColor }} className="text-lg font-bold">
                  {experience.engineer_name || 'ION Engineer'}
                </h2>
                <span 
                  style={{
                    backgroundColor: accentSoft,
                    borderColor: borderColor,
                    color: textColor,
                  }}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold border font-mono uppercase"
                >
                  {experience.orbit_id || 'ION-EMP'}
                </span>
              </div>
              <p style={{ color: textMutedColor }} className="text-xs mt-0.5">
                Axcelis Technologies (ION) Historical Experience Record
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ color: textMutedColor }}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div 
          style={{
            backgroundColor: 'var(--color-bg, #F4F7FC)',
          }}
          className="p-6 overflow-y-auto flex-1 space-y-6"
        >
          {/* Metadata Grid */}
          <div 
            style={{
              backgroundColor: cardColor,
              borderColor: borderColor,
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border shadow-xs"
          >
            <div className="space-y-1">
              <span style={{ color: textMutedColor }} className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                Where / Location
              </span>
              <p style={{ color: textColor }} className="text-sm font-bold">
                {experience.where_location}
              </p>
            </div>

            <div className="space-y-1">
              <span style={{ color: textMutedColor }} className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                Start Date
              </span>
              <p style={{ color: textColor }} className="text-sm font-semibold">
                {formatDate(experience.start_date)}
              </p>
            </div>

            <div className="space-y-1">
              <span style={{ color: textMutedColor }} className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                End Date
              </span>
              <p style={{ color: textColor }} className="text-sm font-semibold">
                {formatDate(experience.end_date)}
              </p>
            </div>
          </div>

          {/* Experience Notes */}
          {experience.notes && (
            <div 
              style={{
                backgroundColor: accentSoft,
                borderColor: `${primaryColor}30`,
              }}
              className="space-y-2 p-4 rounded-xl border shadow-xs"
            >
              <h4 
                style={{ color: primaryColor }}
                className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                Experience Overview & Notes
              </h4>
              <p 
                style={{ color: textColor }}
                className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium"
              >
                {experience.notes}
              </p>
            </div>
          )}

          {/* Tool Assessments Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  style={{
                    backgroundColor: `${primaryColor}15`,
                    color: primaryColor,
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                >
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 style={{ color: textColor }} className="text-sm font-bold">
                    Tool Assessments
                  </h3>
                  <p style={{ color: textMutedColor }} className="text-xs">
                    Specific tools operated and evaluated during this experience period
                  </p>
                </div>
              </div>
              <span 
                style={{
                  backgroundColor: accentSoft,
                  borderColor: borderColor,
                  color: textColor,
                }}
                className="px-2.5 py-1 rounded-full text-xs font-bold border"
              >
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
                      style={{
                        backgroundColor: cardColor,
                        borderColor: borderColor,
                      }}
                      className="p-4 rounded-xl border shadow-xs space-y-3"
                    >
                      {/* Tool Name & Level Badge */}
                      <div 
                        style={{ borderColor: borderColor }}
                        className="flex items-center justify-between gap-2 border-b pb-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <span 
                            style={{ color: textMutedColor }}
                            className="text-xs font-mono font-bold"
                          >
                            #{index + 1}
                          </span>
                          <h4 style={{ color: textColor }} className="text-sm sm:text-base font-bold">
                            {ass.tool_name || 'ION Tool'}
                          </h4>
                        </div>
                        <IonSkillLevelBadge level={ass.skill_level} size="md" />
                      </div>

                      {/* Standard Level Meaning */}
                      <div 
                        style={{
                          backgroundColor: 'var(--color-bg, rgba(0,0,0,0.03))',
                          borderColor: borderColor,
                        }}
                        className="p-3 rounded-lg border space-y-1"
                      >
                        <span 
                          style={{ color: textMutedColor }}
                          className="text-[10px] font-bold uppercase tracking-wider"
                        >
                          Level Definition
                        </span>
                        <p 
                          style={{ color: textColor }}
                          className="text-xs italic leading-relaxed"
                        >
                          "{levelDef.description}"
                        </p>
                      </div>

                      {/* Engineer Assessment Comment */}
                      {ass.assessment_comment ? (
                        <div 
                          style={{
                            backgroundColor: `${primaryColor}08`,
                            borderColor: `${primaryColor}25`,
                          }}
                          className="p-3 rounded-lg border space-y-1"
                        >
                          <span 
                            style={{ color: textColor }}
                            className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            Engineer Assessment Comment
                          </span>
                          <p 
                            style={{ color: textColor }}
                            className="text-xs leading-relaxed font-medium whitespace-pre-wrap pt-0.5"
                          >
                            "{ass.assessment_comment}"
                          </p>
                        </div>
                      ) : (
                        <p 
                          style={{ color: textMutedColor }}
                          className="text-xs italic p-1"
                        >
                          No specific assessment comment provided.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div 
                style={{
                  backgroundColor: 'var(--color-bg, rgba(0,0,0,0.02))',
                  borderColor: borderColor,
                }}
                className="text-center py-8 rounded-xl border border-dashed p-6"
              >
                <Wrench style={{ color: textMutedColor }} className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p style={{ color: textColor }} className="text-xs font-semibold">
                  No Tool Assessments Recorded
                </p>
                <p style={{ color: textMutedColor }} className="text-[11px] mt-1">
                  This historical experience does not have any specific tool assessments logged.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div 
          style={{
            borderColor: borderColor,
            backgroundColor: cardColor,
          }}
          className="p-4 border-t flex items-center justify-between gap-3 mt-auto shrink-0"
        >
          {canEdit && onDelete ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(experience)}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete Experience
            </Button>
          ) : <div />}

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
            {canEdit && onEdit && (
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
      </div>
    </div>,
    document.body
  );
};
