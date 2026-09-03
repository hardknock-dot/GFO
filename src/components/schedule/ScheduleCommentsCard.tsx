import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchedule, useUpdateScheduleCommentStatus } from '../../hooks/useSchedule';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Calendar, Building2, User, ArrowUpRight, Clock } from 'lucide-react';
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
  const { data: scheduleRes, isLoading } = useSchedule(
    engineerId ? { engineerId, commentAdressal: false, pageSize: 50 } : { companyId: 'all-data', commentAdressal: false, pageSize: 50 }
  );
  const updateCommentStatusMutation = useUpdateScheduleCommentStatus();

  // Filter schedules returned by commentAdressal=false query for valid non-empty remarks and matching engineerId if provided
  const pendingComments = (scheduleRes?.data || []).filter(
    (s) => s.remarks && 
           s.remarks.trim().length > 0 && 
           s.remarks !== 'None' && 
           (!engineerId || String(s.engineerId) === String(engineerId))
  );

  // Modal / Selected Comment State
  const [selectedPendingComment, setSelectedPendingComment] = React.useState<any | null>(null);

  // Calculate effective limit: default to 2 if preview mode (hideShowMore is false), or show all if hideShowMore is true unless explicitly passed
  const effectiveLimit = limit !== undefined ? limit : hideShowMore ? undefined : 2;
  const displayedComments = effectiveLimit ? pendingComments.slice(0, effectiveLimit) : pendingComments;

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
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Pending Operational Remarks Requiring Addressal</span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-full">
                {pendingComments.length}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {engineerName
                ? `Pending operational comments requiring management review for ${engineerName}`
                : 'Field Engineer remarks requiring operational addressal (comment_adressal = FALSE)'}
            </p>
          </div>
        </div>

        {!hideShowMore && pendingComments.length > 0 && (
          <button
            onClick={handleNavigateToComments}
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1"
          >
            <span>Show More</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {pendingComments.length === 0 ? (
        <div className="p-4 text-center text-xs text-slate-400 bg-slate-50/60 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
          No pending engineer comments requiring addressal.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {displayedComments.map((sch) => {
            return (
              <div
                key={sch.id}
                onClick={() => setSelectedPendingComment(sch)}
                className="p-3.5 bg-amber-50/40 dark:bg-slate-800/40 border border-amber-200/60 dark:border-slate-800 rounded-xl space-y-2 flex flex-col justify-between transition-all duration-150 hover:bg-white dark:hover:bg-slate-900 hover:border-amber-500 cursor-pointer shadow-none hover:shadow-sm group"
                title="Click to view full comment addressal details"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {sch.engineerName && (
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center mr-1">
                          <User className="w-3 h-3 mr-1 inline" />
                          {sch.engineerName} ({sch.engineerOrbitId || sch.engineerId?.slice(0, 8)}) •
                        </span>
                      )}
                      <Building2 className="w-3.5 h-3.5 text-slate-400 inline" />
                      <span>{sch.supportType || 'Assignment'}</span>
                    </span>
                    
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border flex items-center space-x-1 bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                      <Clock className="w-2.5 h-2.5 inline mr-1 text-amber-600" />
                      <span>Pending Addressal</span>
                    </span>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 italic font-normal line-clamp-2">
                    "{sch.remarks}"
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{sch.startDate} - {sch.endDate || 'Ongoing'}</span>
                  </span>

                  <div className="flex items-center space-x-2">
                    {!isEngineerUser && canEdit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCommentStatusMutation.mutate({ id: sch.id, commentAdressal: null });
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 rounded border border-emerald-300 transition-colors shadow-xs"
                      >
                        Mark Addressed
                      </button>
                    )}

                    {!hideViewProfile && (
                      <span className="font-mono font-semibold text-amber-600 dark:text-amber-400 flex items-center space-x-0.5">
                        <span>Details</span>
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

      {/* Pending Comment Details Modal */}
      {selectedPendingComment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-amber-500" />
                <span>Pending Comment Details</span>
              </h3>
              <button
                onClick={() => setSelectedPendingComment(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Engineer Information</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {selectedPendingComment.engineerName || 'Field Engineer'}
                </p>
                <p className="text-slate-500 font-mono">
                  Orbit / Staff ID: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{selectedPendingComment.engineerOrbitId || selectedPendingComment.engineerId}</span>
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Schedule Details</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedPendingComment.supportType} ({selectedPendingComment.fabSite || selectedPendingComment.country})
                </p>
                <p className="text-slate-500">
                  Assignment Dates: {selectedPendingComment.startDate} to {selectedPendingComment.endDate || 'Ongoing'}
                </p>
              </div>

              <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl space-y-1">
                <p className="text-amber-800 dark:text-amber-400 font-bold text-[10px] uppercase tracking-wider">Exact Engineer Remark</p>
                <p className="text-slate-800 dark:text-slate-200 italic font-medium text-xs leading-relaxed">
                  "{selectedPendingComment.remarks}"
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 text-slate-500">
                <span>Addressal Status:</span>
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Pending (comment_adressal = FALSE)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  if (selectedPendingComment.engineerId) {
                    navigate(`/engineers/${selectedPendingComment.engineerId}`);
                  }
                }}
                className="text-xs font-semibold text-indigo-600 hover:underline flex items-center space-x-1"
              >
                <span>View Engineer Profile</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex space-x-2">
                {!isEngineerUser && canEdit && (
                  <button
                    onClick={() => {
                      updateCommentStatusMutation.mutate(
                        { id: selectedPendingComment.id, commentAdressal: null },
                        {
                          onSuccess: () => setSelectedPendingComment(null),
                        }
                      );
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm"
                  >
                    Mark as Addressed
                  </button>
                )}
                <button
                  onClick={() => setSelectedPendingComment(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
