import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, X, ArrowRight, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ScheduleCommentNotification } from '../../utils/notifications';

export const NotificationToastContainer: React.FC = () => {
  const { canEdit } = useAuth();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<ScheduleCommentNotification[]>([]);

  useEffect(() => {
    const handleNewComment = (payload: ScheduleCommentNotification) => {
      // Only trigger popup for editor roles (canEdit)
      if (!canEdit) return;

      setToasts((prev) => [payload, ...prev]);

      // Auto dismiss after 10 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== payload.id));
      }, 10000);
    };

    // Custom event listener for same tab
    const eventHandler = (e: Event) => {
      const customEv = e as CustomEvent<ScheduleCommentNotification>;
      if (customEv.detail) {
        handleNewComment(customEv.detail);
      }
    };

    // Storage event listener for cross-tab notifications
    const storageHandler = (e: StorageEvent) => {
      if (e.key === 'ormp_schedule_comment_notif' && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          handleNewComment(payload);
        } catch (err) {
          console.error('Error parsing notification storage event:', err);
        }
      }
    };

    window.addEventListener('ormp_schedule_comment_added', eventHandler);
    window.addEventListener('storage', storageHandler);

    return () => {
      window.removeEventListener('ormp_schedule_comment_added', eventHandler);
      window.removeEventListener('storage', storageHandler);
    };
  }, [canEdit]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (!canEdit || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] space-y-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white dark:bg-slate-900 border-2 border-indigo-500 dark:border-indigo-600 rounded-xl p-4 shadow-2xl transition-all transform translate-x-0 animate-in slide-in-from-bottom-5 duration-300 flex items-start space-x-3.5 relative overflow-hidden"
        >
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 rounded-lg flex-shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>

          <div className="flex-1 space-y-1 pr-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center space-x-1">
                <Bell className="w-3 h-3 inline" />
                <span>New Schedule Comment</span>
              </span>
              <span className="text-[10px] text-slate-400">10s</span>
            </div>

            <p className="text-xs font-bold text-slate-900 dark:text-white">
              {toast.engineerName}
            </p>

            <p className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded border border-slate-200/60 dark:border-slate-800">
              "{toast.remarks}"
            </p>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-500 font-medium truncate max-w-[180px]">
                {toast.supportType || 'Assignment'} • {toast.fabSite || 'Customer Site'}
              </span>
              <button
                onClick={() => {
                  removeToast(toast.id);
                  navigate('/schedule');
                }}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-0.5"
              >
                <span>View Roster</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

