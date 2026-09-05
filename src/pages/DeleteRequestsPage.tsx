import React, { useState, useEffect } from 'react';
import { CheckSquare, CheckCircle2, XCircle, Clock, Search, AlertCircle } from 'lucide-react';
import api from '../services/axios';
import type { GeneralDeleteRequest } from '../types';

export const DeleteRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<GeneralDeleteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [search, setSearch] = useState('');
  const [rejectingReqId, setRejectingReqId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await api.get('/delete-requests', { params });
      const data = res.data?.items ?? (Array.isArray(res.data) ? res.data : []);
      setRequests(data);
    } catch (err: any) {
      console.error('Failed to load delete requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleApprove = async (requestId: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      await api.post(`/delete-requests/${requestId}/approve`);
      setMessage({ type: 'success', text: 'Delete request approved and record removed successfully.' });
      fetchRequests();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to approve request.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectingReqId) return;
    setActionLoading(true);
    setMessage(null);
    try {
      await api.post(`/delete-requests/${rejectingReqId}/reject`, {
        review_comment: rejectComment,
      });
      setMessage({ type: 'success', text: 'Delete request rejected successfully.' });
      setRejectingReqId(null);
      setRejectComment('');
      fetchRequests();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to reject request.' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const term = search.toLowerCase();
    return (
      (r.entity_name || '').toLowerCase().includes(term) ||
      (r.requested_by_name || '').toLowerCase().includes(term) ||
      (r.reason || '').toLowerCase().includes(term) ||
      r.entity_type.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-primary)] border border-[var(--color-border)]">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900">Delete Request Governance</h1>
              <p className="text-xs text-stone-500">Manager & Admin Deletion Request Approval Queue</p>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 bg-[var(--color-card)] p-1 rounded-xl border border-[var(--color-border)] shadow-xs">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-black/5'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border flex items-center space-x-2.5 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search requests by entity, requester, reason..."
          className="w-full pl-10 pr-4 py-2.5 text-xs bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] shadow-xs"
        />
      </div>

      {/* Requests Table */}
      <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-md shadow-black/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/50 text-stone-600 font-semibold border-b border-[var(--color-border)]">
              <tr>
                <th className="px-5 py-3.5">Entity / Record</th>
                <th className="px-5 py-3.5">Requester</th>
                <th className="px-5 py-3.5">Company</th>
                <th className="px-5 py-3.5">Reason</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Requested Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/60 text-stone-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-stone-400">
                    Loading delete requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-stone-400">
                    No delete requests found matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.request_id} className="hover:bg-white/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-stone-900">{req.entity_name}</div>
                      <div className="text-[10px] font-mono text-stone-400 uppercase mt-0.5">
                        {req.entity_type}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-medium text-stone-800">{req.requested_by_name}</td>
                    <td className="px-5 py-4 text-stone-600">{req.company_name}</td>
                    <td className="px-5 py-4 max-w-xs">
                      <p className="text-stone-600 truncate" title={req.reason}>
                        {req.reason}
                      </p>
                      {req.review_comment && (
                        <p className="text-[11px] text-rose-600 italic mt-0.5" title={req.review_comment}>
                          Comment: {req.review_comment}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status === 'APPROVED' ? (
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                        ) : req.status === 'REJECTED' ? (
                          <XCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <Clock className="w-3 h-3 mr-1" />
                        )}
                        {req.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-stone-500 font-mono text-[11px]">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleApprove(req.request_id)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-all shadow-2xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectingReqId(req.request_id)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-semibold text-xs transition-all border border-rose-200"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-stone-400 text-[11px] italic">
                          Reviewed by {req.reviewed_by_name || 'Admin'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectingReqId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-[var(--color-card)] rounded-2xl shadow-2xl max-w-md w-full border border-[var(--color-border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)] bg-rose-50/80 flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-800">Reject Delete Request</h3>
              <button
                onClick={() => setRejectingReqId(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Rejection Comment <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="Explain why this request is being rejected..."
                  rows={3}
                  className="w-full text-xs rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2 text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setRejectingReqId(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-black/5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
