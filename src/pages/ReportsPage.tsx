import React, { useState, useEffect } from 'react';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/axios';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Users,
  Calendar,
  Wrench,
  FileCheck,
  AlertTriangle,
  Filter,
  Globe,
  Award,
  Building2
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const isMainAdmin = user?.role === 'Main Admin' || user?.role === 'Global Admin';

  const [companyId, setCompanyId] = useState<string>(
    currentCompany.id === 'all-data' ? 'all-data' : (currentCompany.company_id || currentCompany.id)
  );
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'feedback' | 'escalations' | 'deployments' | 'workforce' | 'schedules' | 'skills' | 'visa'>('feedback');

  // Specific Report Data
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [companiesList, setCompaniesList] = useState<Array<{ company_id: string; company_name: string }>>([]);

  useEffect(() => {
    if (isMainAdmin) {
      api.get('/companies').then((res) => setCompaniesList(res.data)).catch(() => {});
    }
  }, [isMainAdmin]);

  const fetchCurrentReport = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (companyId && companyId !== 'all-data') params.company_id = companyId;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      let url = '/reports/feedback';
      if (activeTab === 'escalations') url = '/reports/escalations';
      else if (activeTab === 'deployments') url = '/reports/deployments-by-country';
      else if (activeTab === 'workforce') url = '/reports/category/workforce';
      else if (activeTab === 'schedules') url = '/reports/category/schedules';
      else if (activeTab === 'skills') url = '/reports/category/skills';
      else if (activeTab === 'visa') url = '/reports/category/visa';

      const res = await api.get(url, { params });
      setReportData(res.data);
    } catch (err) {
      console.error('Failed to load report:', err);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentReport();
  }, [activeTab, companyId, startDate, endDate]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <PageHeader
        title="Executive Reports & Global Analytics"
        subtitle="Multi-tenant performance, customer feedback, escalations timeline, and country deployments."
      />

      {/* Global Filter Bar */}
      <div className="bg-[var(--color-card)] p-5 rounded-2xl border border-[var(--color-border)] shadow-md shadow-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Company Filter */}
          {isMainAdmin ? (
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="font-semibold text-stone-700">Company Scope:</span>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-white text-stone-800 font-semibold focus:outline-none"
              >
                <option value="all-data">All Companies (Global)</option>
                {companiesList.map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="font-semibold text-stone-700">Company Scope:</span>
              <span className="px-3 py-1 bg-white rounded-xl font-bold text-stone-800 border border-[var(--color-border)]">
                {currentCompany.name}
              </span>
            </div>
          )}

          {/* Date Range Pickers */}
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-stone-700">Date From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-white text-stone-800 focus:outline-none"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-stone-700">Date To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-white text-stone-800 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={fetchCurrentReport}
          className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Apply Filters</span>
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center space-x-2 border-b border-[var(--color-border)] overflow-x-auto pb-1">
        {[
          { id: 'feedback', label: 'Feedback Report', icon: Award },
          { id: 'escalations', label: 'Escalation Report', icon: AlertTriangle },
          { id: 'deployments', label: 'Deployments by Country', icon: Globe },
          { id: 'workforce', label: 'Workforce Roster', icon: Users },
          { id: 'schedules', label: 'Schedules', icon: Calendar },
          { id: 'skills', label: 'Skills Matrix', icon: Wrench },
          { id: 'visa', label: 'Visas & Permits', icon: FileCheck },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* REPORT CONTENT DISPLAY */}
      {loading ? (
        <div className="p-12 text-center text-xs text-stone-400">Loading report analytics...</div>
      ) : !reportData ? (
        <div className="p-12 text-center text-xs text-stone-400">No report records found matching criteria.</div>
      ) : (
        <div className="space-y-6">
          {/* TAB: FEEDBACK REPORT */}
          {activeTab === 'feedback' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[var(--color-card)] p-4 rounded-2xl border border-[var(--color-border)] shadow-md shadow-black/20">
                  <span className="text-xs font-semibold text-stone-500">Total Feedback Items</span>
                  <p className="text-2xl font-bold text-stone-900 mt-1">{reportData.total_feedback ?? reportData.total_feedback_count ?? 0}</p>
                </div>
                <div className="bg-[var(--color-card)] p-4 rounded-2xl border border-[var(--color-border)] shadow-md shadow-black/20">
                  <span className="text-xs font-semibold text-stone-500">Positive Feedback</span>
                  <p className="text-2xl font-bold text-[var(--color-primary)] mt-1">{reportData.positive_feedback_count}</p>
                </div>
                <div className="bg-[var(--color-card)] p-4 rounded-2xl border border-[var(--color-border)] shadow-md shadow-black/20">
                  <span className="text-xs font-semibold text-stone-500">Negative Feedback</span>
                  <p className="text-2xl font-bold text-rose-600 mt-1">{reportData.negative_feedback_count}</p>
                </div>
                <div className="bg-[var(--color-card)] p-4 rounded-2xl border border-[var(--color-border)] shadow-md shadow-black/20">
                  <span className="text-xs font-semibold text-stone-500">Average Rating Score</span>
                  <p className="text-2xl font-bold text-[var(--color-primary)] mt-1">{reportData.average_score} / 5.0</p>
                </div>
              </div>

              <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-md shadow-black/20 overflow-hidden">
                <div className="p-4 border-b border-[var(--color-border)] font-bold text-stone-800 text-sm">
                  Customer & Manager Feedback Log
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">Engineer</th>
                      <th className="px-5 py-3.5">Company</th>
                      <th className="px-5 py-3.5">Score</th>
                      <th className="px-5 py-3.5">Reviewer</th>
                      <th className="px-5 py-3.5">Feedback Text</th>
                      <th className="px-5 py-3.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(reportData.items || []).map((fb: any) => (
                      <tr key={fb.id || fb.schedule_id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-4 font-bold text-slate-900">{fb.engineer_name}</td>
                        <td className="px-5 py-4 text-slate-600">{fb.company_name}</td>
                        <td className="px-5 py-4 font-bold text-amber-500">★ {fb.score || fb.rating}</td>
                        <td className="px-5 py-4 text-slate-600">{fb.reviewer || 'Customer'}</td>
                        <td className="px-5 py-4 max-w-sm truncate text-slate-600" title={fb.feedback}>
                          {fb.feedback}
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-400 text-[11px]">{fb.review_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: ESCALATIONS REPORT */}
          {activeTab === 'escalations' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-400">Total Escalation Incidents</span>
                  <p className="text-2xl font-bold text-rose-600 mt-1">{reportData.total_escalations || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-400">Engineers Escalated</span>
                  <p className="text-2xl font-bold text-amber-600 mt-1">{Object.keys(reportData.by_engineer || {}).length}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-400">Countries Impacted</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{Object.keys(reportData.by_country || {}).length}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-bold text-slate-800 text-sm">
                  Operational Escalation Timeline
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">Engineer</th>
                      <th className="px-5 py-3.5">Company</th>
                      <th className="px-5 py-3.5">Escalation Reason</th>
                      <th className="px-5 py-3.5">Reviewer</th>
                      <th className="px-5 py-3.5">Notes</th>
                      <th className="px-5 py-3.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(reportData.items || []).map((esc: any) => (
                      <tr key={esc.id || esc.schedule_id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-4 font-bold text-slate-900">{esc.engineer_name}</td>
                        <td className="px-5 py-4 text-slate-600">{esc.company_name}</td>
                        <td className="px-5 py-4 font-bold text-rose-700">{esc.escalation_reason}</td>
                        <td className="px-5 py-4 text-slate-600">{esc.reviewer}</td>
                        <td className="px-5 py-4 text-slate-600">{esc.notes}</td>
                        <td className="px-5 py-4 font-mono text-slate-400 text-[11px]">{esc.review_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: DEPLOYMENTS BY COUNTRY */}
          {activeTab === 'deployments' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-bold text-slate-800 text-sm">
                  Global Deployment Footprint by Country
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">Country</th>
                      <th className="px-5 py-3.5">Deployment Count</th>
                      <th className="px-5 py-3.5">Unique Engineers</th>
                      <th className="px-5 py-3.5">Active Deployments</th>
                      <th className="px-5 py-3.5">Upcoming Deployments</th>
                      <th className="px-5 py-3.5">Completed Deployments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(reportData.countries || reportData.items || []).map((c: any) => (
                      <tr key={c.country} className="hover:bg-slate-50/80">
                        <td className="px-5 py-4 font-bold text-slate-900">{c.country}</td>
                        <td className="px-5 py-4 font-bold text-indigo-600">{c.deployment_count ?? 0}</td>
                        <td className="px-5 py-4 font-semibold text-slate-800">{c.unique_engineers_count ?? 0}</td>
                        <td className="px-5 py-4 text-emerald-600 font-semibold">{c.current_deployments ?? c.active_deployments ?? 0}</td>
                        <td className="px-5 py-4 text-amber-600 font-semibold">{c.upcoming_deployments ?? 0}</td>
                        <td className="px-5 py-4 text-slate-500 font-semibold">{c.completed_deployments ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* OTHER CATEGORY TAB (WORKFORCE, SCHEDULES, SKILLS, VISA) */}
          {['workforce', 'schedules', 'skills', 'visa'].includes(activeTab) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 font-bold text-slate-800 text-sm capitalize">
                {activeTab} Report Records ({reportData.items?.length || 0})
              </div>
              <div className="p-4 text-xs text-slate-600">
                Total Records: <span className="font-bold text-slate-900">{reportData.total_count || reportData.items?.length || 0}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
