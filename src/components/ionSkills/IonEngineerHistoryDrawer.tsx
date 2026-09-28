import React, { useState } from 'react';
import { X, History, Wrench, MapPin, Calendar, Sparkles, Filter } from 'lucide-react';
import type { IonSkillTool } from '../../types';
import { useEngineerIonHistory } from '../../hooks/useIonSkills';
import { IonSkillLevelBadge } from './IonSkillLevelBadge';
import { getIonSkillLevelConfig } from '../../config/ionSkillLevels';

interface IonEngineerHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  engineerId?: string;
  engineerName?: string;
  orbitId?: string;
  tools: IonSkillTool[];
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
}) => {
  const [selectedToolId, setSelectedToolId] = useState<string>('');

  const { data: history = [], isLoading } = useEngineerIonHistory(
    engineerId,
    selectedToolId || undefined
  );

  if (!isOpen || !engineerId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-lg flex items-center justify-center shadow-xs">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {engineerName || 'ION Engineer'}
                </h2>
                {orbitId && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono">
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
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <Filter className="w-3.5 h-3.5 text-indigo-500" />
            <span>Filter Tool:</span>
          </div>

          <select
            value={selectedToolId}
            onChange={(e) => setSelectedToolId(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
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
            <div className="py-12 text-center text-xs text-slate-400">Loading skill progression history...</div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No historical assessments found for the selected criteria.
            </div>
          ) : (
            <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-200 dark:before:bg-indigo-900">
              {history.map((item, index) => {
                const levelDef = getIonSkillLevelConfig(item.skill_level);
                const startDate = formatDate(item.start_date);
                const endDate = formatDate(item.end_date);
                const period = startDate && endDate ? `${startDate} — ${endDate}` : startDate || endDate || 'Historical';

                return (
                  <div key={item.assessment_id || index} className="relative group">
                    {/* Timeline Node */}
                    <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 flex items-center justify-center shadow-xs">
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-2xl space-y-2.5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                      {/* Tool & Level */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-indigo-500" />
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {item.tool_name}
                          </span>
                        </div>
                        <IonSkillLevelBadge level={item.skill_level} size="sm" />
                      </div>

                      {/* Location & Period */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          {item.where_location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" />
                          {period}
                        </span>
                      </div>

                      {/* Level meaning */}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                        "{levelDef.description}"
                      </p>

                      {/* Comment */}
                      {item.assessment_comment && (
                        <div className="p-2.5 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                            <Sparkles className="w-3 h-3" />
                            Assessment Comment
                          </div>
                          <p className="whitespace-pre-wrap">{item.assessment_comment}</p>
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
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
