import React, { useState } from 'react';
import { AlertTriangle, Send, X } from 'lucide-react';
import api from '../../services/axios';

interface DeleteRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
  entityName: string;
  onSuccess?: () => void;
}

export const DeleteRequestModal: React.FC<DeleteRequestModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for the deletion request.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post('/delete-requests', {
        entity_type: entityType,
        entity_id: entityId,
        reason: reason.trim(),
      });
      setLoading(false);
      setReason('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.detail || 'Failed to submit delete request.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Submit Delete Request</h3>
              <p className="text-xs text-slate-500">Ops Executive Deletion Workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <p className="font-medium text-slate-700">Target Record:</p>
            <p className="text-slate-900 font-bold text-sm mt-0.5">{entityName}</p>
            <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
              {entityType} &bull; {entityId.slice(0, 8)}...
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Direct deletion is restricted for Ops Executives. Your request will be routed to your Manager for review and approval.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reason for Deletion <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide detailed justification for requesting this deletion..."
              rows={3}
              className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            />
          </div>

          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-600/20 disabled:opacity-50 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Submitting...' : 'Submit Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
