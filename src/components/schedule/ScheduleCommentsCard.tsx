import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchedule, useUpdateScheduleCommentStatus } from '../../hooks/useSchedule';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Calendar, Building2, User, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import { CardSkeleton } from '../common/LoadingSkeleton';

interface ScheduleCommentsCardProps {
  engineerId?: string;
  engineerName?: string;
  hideShowMore?: boolean;
  hideViewProfile?: boolean;
  limit?: number;
}

export const ScheduleCommentsCard: React.FC<ScheduleCommentsCardProps> = ({
  engineerId,
  engineerName,
  hideShowMore = false,
  hideViewProfile = false,
  limit,
}) => {
  const navigate = useNavigate();
  const { user, canEdit } = useAuth();
  const isEngineerUser = user?.role === 'Field Engineer' || user?.role === 'Engineer';
  const { data: scheduleRes, isLoading } = useSchedule(engineerId ? { engineerId } : undefined);
  const updateCommentStatusMutation = useUpdateScheduleCommentStatus();

  // Filter schedules that have non-empty remarks/comments
  const commentedSchedules = (scheduleRes?.data || []).filter(
    (s) => s.remarks && s.remarks.trim().length > 0
  );

  // Calculate effective limit: default to 2 if preview mode (hideShowMore is false), or show all if hideShowMore is true unless explicitly passed
  const effectiveLimit = limit !== undefined ? limit : hideShowMore ? undefined : 2;
  const displayedComments = effectiveLimit ? commentedSchedules.slice(0, effectiveLimit) : commentedSchedules;

  if (isLoading) {
    return <CardSkeleton />;
  }

  const handleNavigateToComments = () => {
    if (engineerId) {
      navigate(`/schedule-comments?engineerId=${engineerId}`);
    } else {
      navigate('/schedule-comments');
    }
  };

  return (
    <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Schedule Operational Remarks</span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/60 rounded-full">
                {commentedSchedules.length}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {engineerName
                ? `Schedule operational remarks and status updates for ${engineerName}`
                : 'Schedule comments and operational status updates logged by Field Engineers'}
            </p>
          </div>
        </div>

        {!hideShowMore && commentedSchedules.length > 0 && (
          <button
            onClick={handleNavigateToComments}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
          >
            <span>Show More</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {commentedSchedules.length === 0 ? (
        <div className="p-4 text-center text-xs text-slate-400 bg-slate-50/60 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
          No schedule comments or operational remarks logged yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {displayedComments.map((sch) => {
            const isAddressed = (sch.commentStatus || 'UNADDRESSED').toUpperCase() === 'ADDRESSED';
            return (
              <div
                key={sch.id}
                onClick={() => {
                  if (!hideViewProfile && sch.engineerId) {
                    navigate(`/engineers/${sch.engineerId}`);
                  }
                }}
                className={`p-3.5 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-xl space-y-2 flex flex-col justify-between transition-all duration-150 ${
                  !hideViewProfile ? 'hover:bg-white dark:hover:bg-slate-900 hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer shadow-none hover:shadow-sm group' : ''
                }`}
                title={!hideViewProfile ? 'Click to view engineer profile' : undefined}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 ${!hideViewProfile ? 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors' : ''}`}>
                      {!engineerId && sch.engineerName && (
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center mr-1">
                          <User className="w-3 h-3 mr-1 inline" />
                          {sch.engineerName} •
                        </span>
                      )}
                      <Building2 className="w-3.5 h-3.5 text-slate-400 inline" />
                      <span>{sch.supportType || 'Assignment'}</span>
                    </span>
                    
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center space-x-1 ${
                        isAddressed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {isAddressed ? <CheckCircle2 className="w-2.5 h-2.5 inline mr-1 text-emerald-600" /> : <Clock className="w-2.5 h-2.5 inline mr-1 text-amber-600" />}
                      <span>{isAddressed ? 'ADDRESSED' : 'UNADDRESSED'}</span>
                    </span>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 italic font-normal">
                    "{sch.remarks}"
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{sch.startDate} - {sch.endDate || 'Ongoing'}</span>
                  </span>

                  <div className="flex items-center space-x-2">
                    {!isEngineerUser && canEdit && !isAddressed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCommentStatusMutation.mutate({ id: sch.id, commentStatus: 'ADDRESSED' });
                        }}
                        className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 rounded border border-emerald-300 transition-colors"
                      >
                        Mark Addressed
                      </button>
                    )}

                    {!hideViewProfile && (
                      <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 flex items-center space-x-0.5">
                        <span>View Profile</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

