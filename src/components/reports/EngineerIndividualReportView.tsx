import React, { useState, useEffect } from 'react';
import { Filter, Award, AlertTriangle, Globe, DollarSign } from 'lucide-react';
import api from '../../services/axios';

interface EngineerIndividualReportViewProps {
  engineerId: string;
}

export const EngineerIndividualReportView: React.FC<EngineerIndividualReportViewProps> = ({ engineerId }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await api.get(`/engineers/${engineerId}/report`, { params });
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch engineer report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (engineerId) {
      fetchReport();
    }
  }, [engineerId]);

  return (
    <div className="space-y-6">
      {/* Date Filter Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">Individual Historical Performance Report</h3>
          <p className="text-xs text-slate-500">Filter performance, escalations, feedback, and deployments by timeframe</p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-600">Date From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-600">Date To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button
            onClick={fetchReport}
            className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-xs"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Apply</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading historical engineer report...</div>
      ) : !data ? (
        <div className="p-8 text-center text-xs text-slate-400">No report data available for this engineer.</div>
      ) : (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-400">Performance Score</span>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{data.performance_score}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-400">Total Deployments</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data.total_deployments}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-400">Escalations</span>
              <p className="text-2xl font-bold text-rose-600 mt-1">{data.escalations_count}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-400">Praises / Positive Feedback</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{data.praises_count}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Escalations Section */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Escalations Timeline ({data.escalations_count})</span>
              </h4>
              {data.escalations && data.escalations.length > 0 ? (
                <div className="space-y-2.5">
                  {data.escalations.map((esc: any, idx: number) => (
                    <div key={idx} className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-rose-900">
                        <span>{esc.escalation_reason}</span>
                        <span className="text-[10px] text-slate-400">{esc.date}</span>
                      </div>
                      {esc.feedback && <p className="text-slate-600 italic">{esc.feedback}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4">No escalations recorded in this period.</p>
              )}
            </div>

            {/* Praises / Feedback Section */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <Award className="w-4 h-4 text-emerald-500" />
                <span>Praises & Positive Feedback ({data.praises_count})</span>
              </h4>
              {data.praises && data.praises.length > 0 ? (
                <div className="space-y-2.5">
                  {data.praises.map((p: any, idx: number) => (
                    <div key={idx} className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-emerald-900">
                        <span>Feedback Score: {p.score ? `${p.score}/5` : 'Positive'}</span>
                        <span className="text-[10px] text-slate-400">{p.date}</span>
                      </div>
                      <p className="text-slate-700">{p.feedback}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4">No positive feedback entries recorded in this period.</p>
              )}
            </div>
          </div>

          {/* Deployments Section */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <Globe className="w-4 h-4 text-indigo-500" />
              <span>Deployments & Site Roster ({data.total_deployments})</span>
            </h4>
            {data.deployments && data.deployments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Country</th>
                      <th className="px-4 py-2.5">FAB City</th>
                      <th className="px-4 py-2.5">FAB Site</th>
                      <th className="px-4 py-2.5">Support Type</th>
                      <th className="px-4 py-2.5">Start Date</th>
                      <th className="px-4 py-2.5">End Date</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {data.deployments.map((d: any) => (
                      <tr key={d.schedule_id}>
                        <td className="px-4 py-3 font-bold text-slate-800">{d.country}</td>
                        <td className="px-4 py-3">{d.fab_city}</td>
                        <td className="px-4 py-3">{d.fab_site}</td>
                        <td className="px-4 py-3">{d.support_type}</td>
                        <td className="px-4 py-3">{d.start_date}</td>
                        <td className="px-4 py-3">{d.end_date || 'Ongoing'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4">No deployments recorded in this date range.</p>
            )}
          </div>

          {/* Raises Section (TODO / Proposal) */}
          <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200/80 space-y-2">
            <h4 className="text-sm font-bold text-amber-900 flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-amber-600" />
              <span>Raise & Compensation History</span>
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              {data.raises_note}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
