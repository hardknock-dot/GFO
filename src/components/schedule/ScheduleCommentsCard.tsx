import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchedule, useMarkScheduleCommentAddressed } from '../../hooks/useSchedule';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Calendar, Building2, User, ArrowUpRight, Clock, Loader2, CheckCircle2, X } from 'lucide-react';
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
  const markAddressedMutation = useMarkScheduleCommentAddressed();

  // Toast notification state
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const handleMarkAddressed = (id: string, onDone?: () => void) => {
    markAddressedMutation.mutate(id, {
      onSuccess: () => {
        setToastMessage('Comment marked as addressed.');
        setTimeout(() => setToastMessage(null), 4000);
        if (onDone) onDone();
      },
    });
  };

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
    <div className="p-5 bg-[#FEFADC] border border-[#E8DEC8] rounded-2xl shadow-md shadow-black/20 space-y-4 relative">
      {toastMessage && (
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8DEC8]">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900 flex items-center space-x-2">
              <span>Pending Operational Remarks Requiring Addressal</span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full">
                {pendingComments.length}
              </span>
            </h3>
            <p className="text-xs text-stone-500">
              {engineerName
                ? `Pending operational comments requiring management review for ${engineerName}`
                : 'Field Engineer remarks requiring operational addressal (comment_adressal = FALSE)'}
            </p>
          </div>
        </div>

        {!hideShowMore && pendingComments.length > 0 && (
          <button
            onClick={handleNavigateToComments}
            className="text-xs font-bold text-amber-700 hover:underline flex items-center space-x-1"
          >
            <span>Show More</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {pendingComments.length === 0 ? (
        <div className="p-4 text-center text-xs text-stone-500 bg-white/70 rounded-xl border border-[#E8DEC8]">
          No pending engineer comments requiring addressal.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {displayedComments.map((sch) => {
            return (
              <div
                key={sch.id}
                onClick={() => setSelectedPendingComment(sch)}
                className="p-3.5 bg-white border border-[var(--color-border)] rounded-xl space-y-2 flex flex-col justify-between transition-all duration-150 hover:border-amber-500 cursor-pointer shadow-xs group"
                title="Click to view full comment addressal details"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 flex items-center space-x-1.5 group-hover:text-amber-700 transition-colors">
                      {sch.engineerName && (
                        <span className="text-[var(--color-primary)] font-bold flex items-center mr-1">
                          <User className="w-3 h-3 mr-1 inline" />
                          {sch.engineerName} ({sch.engineerOrbitId || sch.engineerId?.slice(0, 8)}) •
                        </span>
                      )}
                      <Building2 className="w-3.5 h-3.5 text-stone-400 inline" />
                      <span>{sch.supportType || 'Assignment'}</span>
                    </span>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border flex items-center space-x-1 bg-amber-100 text-amber-900 border-amber-300">
                      <Clock className="w-2.5 h-2.5 inline mr-1 text-amber-600" />
                      <span>Pending Addressal</span>
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#FEFADC]/50 rounded-lg border border-[#E8DEC8] text-stone-800 italic font-normal line-clamp-2">
                    "{sch.remarks}"
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] text-stone-500 border-t border-[#E8DEC8]">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{sch.startDate} - {sch.endDate || 'Ongoing'}</span>
                  </span>

                  <div className="flex items-center space-x-2">
                    {!isEngineerUser && canEdit && (
                      <button
                        type="button"
                        disabled={markAddressedMutation.isPending && markAddressedMutation.variables === sch.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAddressed(sch.id);
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded border border-emerald-300 transition-colors shadow-xs flex items-center space-x-1 disabled:opacity-50"
                      >
                        {markAddressedMutation.isPending && markAddressedMutation.variables === sch.id && (
                          <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" />
                        )}
                        <span>Mark Addressed</span>
                      </button>
                    )}

                    {!hideViewProfile && (
                      <span className="font-mono font-semibold text-amber-700 flex items-center space-x-0.5">
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
          <div className="bg-[#FEFADC] border border-[#E8DEC8] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DEC8]">
              <h3 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-amber-500" />
                <span>Pending Comment Details</span>
              </h3>
              <button
                onClick={() => setSelectedPendingComment(null)}
                className="text-stone-400 hover:text-stone-600 text-lg font-bold"
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
                    disabled={markAddressedMutation.isPending}
                    onClick={() => {
                      handleMarkAddressed(selectedPendingComment.id, () => setSelectedPendingComment(null));
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm flex items-center space-x-1 disabled:opacity-50"
                  >
                    {markAddressedMutation.isPending && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    )}
                    <span>Mark as Addressed</span>
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
