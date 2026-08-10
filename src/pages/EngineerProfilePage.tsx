import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEngineerDetail } from '../hooks/useEngineers';
import { useEngineerSkills } from '../hooks/useSkills';
import { useSchedule } from '../hooks/useSchedule';
import { useTravel } from '../hooks/useTravel';
import { useVisa } from '../hooks/useVisa';
import { usePerformance } from '../hooks/usePerformance';
import { Button } from '../components/forms/Button';
import { Table } from '../components/common/Table';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import {
  User,
  Wrench,
  Calendar,
  Plane,
  FileCheck,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  Award,
  ArrowLeft,
  CheckCircle2,
  Briefcase,
} from 'lucide-react';

export const EngineerProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'skills' | 'schedule' | 'travel' | 'visa' | 'performance'>('profile');

  const engineerId = id || 'eng-101';
  const { data: engineer, isLoading, isError, refetch } = useEngineerDetail(engineerId);

  const { data: skills } = useEngineerSkills(engineerId);
  const { data: schedulesRes } = useSchedule({ engineerId });
  const { data: travelRes } = useTravel({ engineerId });
  const { data: visaRes } = useVisa({ engineerId });
  const { data: perfRes } = usePerformance({ engineerId });

  if (isLoading) return <CardSkeleton />;
  if (isError || !engineer) return <ErrorState onRetry={refetch} message="Engineer profile could not be retrieved." />;

  const tabs = [
    { id: 'profile', label: 'Profile Details', icon: User },
    { id: 'skills', label: 'Skills & Tools', icon: Wrench },
    { id: 'schedule', label: 'Schedule & Fabs', icon: Calendar },
    { id: 'travel', label: 'Travel Itineraries', icon: Plane },
    { id: 'visa', label: 'Visas & Permits', icon: FileCheck },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header Back Navigation */}
      <div className="flex items-center space-x-3">
        <Button size="sm" variant="outline" onClick={() => navigate('/engineers')} icon={<ArrowLeft className="w-4 h-4" />}>
          Back to Directory
        </Button>
        <span className="text-xs text-slate-400 font-mono">Profile Record: {engineer.orbitId}</span>
      </div>

      {/* Reusable Profile Banner Header */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center space-x-4">
            <img
              src={engineer.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={engineer.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-slate-100 dark:ring-slate-800 shadow-md"
            />
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{engineer.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {engineer.status}
                </span>
              </div>
              <p className="text-xs font-mono text-[var(--color-secondary)] font-medium">
                {engineer.orbitId} • {engineer.customerId}
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{engineer.city}, {engineer.country}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{engineer.email}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{engineer.phone}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 text-xs">
            <div>
              <p className="text-slate-400">Competency Level</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{engineer.level}</p>
            </div>
            <div>
              <p className="text-slate-400">Primary Chamber</p>
              <p className="font-semibold text-[var(--color-secondary)] mt-0.5 truncate">{engineer.primaryTool}</p>
            </div>
            <div>
              <p className="text-slate-400">Experience</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{engineer.yearsExperience} Years</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-0.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all duration-150 whitespace-nowrap ${
                isActive
                  ? 'border-[var(--color-secondary)] text-[var(--color-secondary)] bg-white/60 dark:bg-slate-900/60 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      <div className="space-y-6">
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-[var(--color-secondary)]" />
                <span>Assignment & Site Allocation</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Assigned Fab Site</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{engineer.assignedSite || 'TSMC Fab 18'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Join Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{engineer.joinDate}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Active Projects</span>
                  <span className="font-semibold text-emerald-600">{engineer.activeProjectsCount} Projects</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Certifications Count</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{engineer.certificationsCount} Valid Certs</span>
                </div>
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                <Award className="w-4 h-4 text-slate-400 dark:text-slate-300" />
                <span>Certifications & Compliance Status</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200">Semiconductor Cleanroom Class 1 Certified</span>
                  </div>
                  <span className="text-[10px] text-emerald-700">Valid</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span className="font-semibold text-slate-900 dark:text-slate-200">High Voltage & Vacuum Safety Permit</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Valid</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <Table
            columns={[
              { key: 'toolModel', header: 'Tool Model / Chamber', sortable: true },
              { key: 'category', header: 'Process Category', sortable: true },
              { key: 'competencyLevel', header: 'Competency Level', sortable: true },
              {
                key: 'certified',
                header: 'Certified',
                render: (s) => (
                  <span className="inline-flex items-center text-xs text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {s.certified ? 'Certified' : 'Pending Audit'}
                  </span>
                ),
              },
              { key: 'lastAssessedDate', header: 'Last Assessed' },
            ]}
            data={skills || []}
            emptyTitle="No Specific Skills Logged"
          />
        )}

        {activeTab === 'schedule' && (
          <Table
            columns={[
              { key: 'projectCode', header: 'Project Code', sortable: true },
              { key: 'customerName', header: 'Customer Fab', sortable: true },
              { key: 'siteLocation', header: 'Site Location', sortable: true },
              { key: 'shiftType', header: 'Shift Type' },
              { key: 'startDate', header: 'Start Date' },
              { key: 'endDate', header: 'End Date' },
              { key: 'status', header: 'Status' },
            ]}
            data={schedulesRes?.data || []}
            emptyTitle="No Schedule Assignments"
          />
        )}

        {activeTab === 'travel' && (
          <Table
            columns={[
              { key: 'originCountry', header: 'Origin' },
              { key: 'destinationCountry', header: 'Destination' },
              { key: 'departureDate', header: 'Departure Date' },
              { key: 'returnDate', header: 'Return Date' },
              { key: 'flightNumber', header: 'Flight Info' },
              { key: 'status', header: 'Travel Status' },
            ]}
            data={travelRes?.data || []}
            emptyTitle="No Travel Records"
          />
        )}

        {activeTab === 'visa' && (
          <Table
            columns={[
              { key: 'country', header: 'Country' },
              { key: 'visaType', header: 'Visa / Permit Class' },
              { key: 'passportNumber', header: 'Passport No.' },
              { key: 'expiryDate', header: 'Expiry Date' },
              {
                key: 'status',
                header: 'Status',
                render: (v) => (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                      v.status === 'Expiring Soon'
                        ? 'bg-amber-100 text-amber-800'
                        : v.status === 'Expired'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {v.status}
                  </span>
                ),
              },
            ]}
            data={visaRes?.data || []}
            emptyTitle="No Visa Records Logged"
          />
        )}

        {activeTab === 'performance' && (
          <div className="space-y-4">
            <Table
              columns={[
                { key: 'rating', header: 'Rating Score (1-5)', render: (p) => <span className="font-bold text-amber-500">★ {p.rating}</span> },
                { key: 'projectsCompleted', header: 'Completed Fabs' },
                { key: 'customerFeedbackScore', header: 'Customer Satisfaction', render: (p) => `${p.customerFeedbackScore}%` },
                { key: 'onTimeArrivalRate', header: 'On-Time Rate', render: (p) => `${p.onTimeArrivalRate}%` },
                { key: 'reviewer', header: 'Reviewer' },
                { key: 'reviewDate', header: 'Review Date' },
              ]}
              data={perfRes?.data || []}
              emptyTitle="No Performance Evaluations Logged"
            />
          </div>
        )}
      </div>
    </div>
  );
};
