import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSchedule } from '../hooks/useSchedule';
import { PageHeader } from '../components/layout/PageHeader';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { TextInput } from '../components/forms/TextInput';
import {
  MessageSquare,
  Search,
  User,
  Building2,
  Calendar,
  ArrowRight,
  Filter,
} from 'lucide-react';

import type { Schedule } from '../types';

export const ScheduleCommentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const engineerIdFilter = searchParams.get('engineerId');

  const { data: scheduleRes, isLoading, isError, refetch } = useSchedule(
    engineerIdFilter ? { engineerId: engineerIdFilter } : undefined
  );

  const [searchTerm, setSearchTerm] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Schedule Comments & Roster Log"
          subtitle="Loading schedule comments and operational status updates..."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Schedule Comments & Roster Log"
          subtitle="All schedule operational remarks and status notes logged by field engineers."
        />
        <ErrorState
          title="Failed to Load Schedule Comments"
          message="Could not load schedule comments from the backend API."
          onRetry={refetch}
        />
      </div>
    );
  }

  // Filter schedules that have non-empty remarks/comments
  const allCommentedSchedules = (scheduleRes?.data || []).filter(
    (s: Schedule) => s.remarks && s.remarks.trim().length > 0
  );

  // Apply search filter
  const filteredComments = allCommentedSchedules.filter((sch: Schedule) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (sch.engineerName && sch.engineerName.toLowerCase().includes(q)) ||
      (sch.remarks && sch.remarks.toLowerCase().includes(q)) ||
      (sch.supportType && sch.supportType.toLowerCase().includes(q)) ||
      (sch.fabSite && sch.fabSite.toLowerCase().includes(q)) ||
      (sch.country && sch.country.toLowerCase().includes(q)) ||
      (sch.projectCode && sch.projectCode.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule Comments & Roster Log"
        subtitle="Operational status notes, transit updates, and customer site remarks submitted by engineers."
      />

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-96 relative">
          <TextInput
            placeholder="Search by engineer name, comment text, site, or project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
          <Filter className="w-4 h-4" />
          <span>Showing <strong className="text-slate-900 dark:text-white">{filteredComments.length}</strong> of {allCommentedSchedules.length} comment records</span>
        </div>
      </div>

      {/* Comments Cards Grid */}
      {filteredComments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl w-fit mx-auto">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Schedule Comments Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchTerm
              ? `No comments matched your search query "${searchTerm}". Try refining your keywords.`
              : 'No operational comments or remarks have been submitted for current schedules yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredComments.map((sch: Schedule) => (
            <div
              key={sch.id}
              onClick={() => {
                if (sch.engineerId) {
                  navigate(`/engineers/${sch.engineerId}`);
                }
              }}
              className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div className="space-y-3">
                {/* Header: Engineer Info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-105 transition-transform">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center space-x-1">
                        <span>{sch.engineerName || 'N/A'}</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 flex items-center space-x-1">
                        <Building2 className="w-3 h-3 inline" />
                        <span>{sch.customerName || 'Customer Site'}</span>
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {sch.scheduleStatus || 'Active'}
                  </span>
                </div>

                {/* Comment Text Card */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center space-x-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>Operational Remark</span>
                  </span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 italic font-medium leading-relaxed">
                    "{sch.remarks}"
                  </p>
                </div>

                {/* Support Type & Location details */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {sch.supportType || 'Support Assignment'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium truncate max-w-[140px]">
                    {sch.siteLocation || sch.fabSite || sch.country || 'Location'}
                  </span>
                </div>
              </div>

              {/* Footer: Date & Profile Navigation CTA */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 flex items-center space-x-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{sch.startDate} - {sch.endDate || 'Ongoing'}</span>
                </span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform flex items-center space-x-1">
                  <span>View Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
