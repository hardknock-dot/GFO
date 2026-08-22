import React, { useState } from 'react';
import { notifyScheduleCommentAdded } from '../utils/notifications';
import {

  useEngineerMe,
  useEngineerMeNextSchedule,
  useEngineerMeSkills,
  useEngineerMeVisa,
  useEngineerMePerformance,
  useUpdateEngineerMeScheduleComments,
  useCreateEngineerMeSkill,
  useUpdateEngineerMeSkill,
  useDeleteEngineerMeSkill,
  useUpdateEngineerMeVisaComments,
  useCreateEngineerMeLeave,
} from '../hooks/useEngineerSelfService';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { Modal } from '../components/forms/Modal';
import { TextInput } from '../components/forms/TextInput';
import { Dropdown } from '../components/forms/Dropdown';
import { Button } from '../components/forms/Button';
import type { Skill, Visa, Schedule } from '../types';
import {
  Calendar,
  Clock,
  AlertTriangle,
  FileCheck,
  Wrench,
  TrendingUp,
  MessageSquare,
  Edit,
  CheckCircle2,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react';


export const EngineerDashboardPage: React.FC = () => {
  const { data: engineer, isLoading: isEngineerLoading, isError: isEngineerError, refetch: refetchEngineer } = useEngineerMe();

  const { data: nextSchedule, isLoading: isNextScheduleLoading } = useEngineerMeNextSchedule();
  const { data: skills = [], isLoading: isSkillsLoading } = useEngineerMeSkills();
  const { data: visas = [], isLoading: isVisasLoading } = useEngineerMeVisa();
  const { data: performances = [], isLoading: isPerfLoading } = useEngineerMePerformance();

  const updateScheduleCommentsMutation = useUpdateEngineerMeScheduleComments();
  const createSkillMutation = useCreateEngineerMeSkill();
  const updateSkillMutation = useUpdateEngineerMeSkill();
  const deleteSkillMutation = useDeleteEngineerMeSkill();
  const updateVisaCommentsMutation = useUpdateEngineerMeVisaComments();
  const createPtoMutation = useCreateEngineerMeLeave();

  // Modals state
  const [ptoModalOpen, setPtoModalOpen] = useState(false);
  const [ptoFormData, setPtoFormData] = useState({
    leave_type: 'Annual PTO',
    requested_date: '',
    comments: '',
  });


  // Modals state
  const [scheduleCommentModalOpen, setScheduleCommentModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [scheduleRemarksInput, setScheduleRemarksInput] = useState('');

  const [visaCommentModalOpen, setVisaCommentModalOpen] = useState(false);
  const [selectedVisa, setSelectedVisa] = useState<Visa | null>(null);
  const [visaCommentInput, setVisaCommentInput] = useState('');

  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [skillFormData, setSkillFormData] = useState({
    country: '',
    fab: '',
    waferSize: '',
    toolType: '',
    role: 'Primary',
    numberOfTools: 1,
    startDate: '',
    endDate: '',
    readyForPrimaryRole: false,
    comments: '',
  });

  const [deleteSkillModalOpen, setDeleteSkillModalOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null);


  if (isEngineerLoading || isNextScheduleLoading || isSkillsLoading || isVisasLoading || isPerfLoading) {
    return (
      <div className="p-6 space-y-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (isEngineerError || !engineer) {
    return (
      <div className="p-6">
        <ErrorState
          title="Profile Load Failed"
          message="Could not load your field engineer profile. Please check system connectivity or contact your Resource Manager."
          onRetry={refetchEngineer}
        />
      </div>
    );
  }

  // Calculate Days Until Next Schedule & Alert Logic
  let daysUntilNext: number | null = null;
  let isWithin30Days = false;

  if (nextSchedule && nextSchedule.startDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(nextSchedule.startDate);
    start.setHours(0, 0, 0, 0);
    const diffTime = start.getTime() - today.getTime();
    daysUntilNext = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysUntilNext >= 0 && daysUntilNext <= 30) {
      isWithin30Days = true;
    }
  }

  // Handlers for Schedule Comment


  const handleOpenScheduleCommentModal = (sch: Schedule) => {
    setSelectedSchedule(sch);
    setScheduleRemarksInput(sch.remarks || '');
    setScheduleCommentModalOpen(true);
  };

  const handleSaveScheduleComment = async () => {
    if (!selectedSchedule) return;
    try {
      await updateScheduleCommentsMutation.mutateAsync({
        scheduleId: selectedSchedule.id,
        remarks: scheduleRemarksInput,
      });
      setScheduleCommentModalOpen(false);

      notifyScheduleCommentAdded({
        engineerName: engineer?.name || 'Field Engineer',
        scheduleId: selectedSchedule.id,
        supportType: selectedSchedule.supportType,
        fabSite: selectedSchedule.fabSite || selectedSchedule.country,
        remarks: scheduleRemarksInput,
      });
    } catch (err) {
      console.error('Failed to update schedule comment:', err);
    }
  };


  // Handlers for Visa Comment
  const handleOpenVisaCommentModal = (visa: Visa) => {
    setSelectedVisa(visa);
    setVisaCommentInput(visa.comments || '');
    setVisaCommentModalOpen(true);
  };

  const handleSaveVisaComment = async () => {
    if (!selectedVisa) return;
    try {
      await updateVisaCommentsMutation.mutateAsync({
        visaId: selectedVisa.id,
        comments: visaCommentInput,
      });
      setVisaCommentModalOpen(false);
    } catch (err) {
      console.error('Failed to update visa comment:', err);
    }
  };

  // Handlers for Skill Add, Edit, Delete
  const handleOpenAddSkillModal = () => {
    setSelectedSkill(null);
    setSkillFormData({
      country: 'Taiwan',
      fab: 'Fab 18',
      waferSize: '300mm',
      toolType: 'Etch System',
      role: 'Primary',
      numberOfTools: 1,
      startDate: '',
      endDate: '',
      readyForPrimaryRole: false,
      comments: '',
    });
    setSkillModalOpen(true);
  };

  const handleOpenEditSkillModal = (sk: Skill) => {
    setSelectedSkill(sk);
    setSkillFormData({
      country: sk.country || '',
      fab: sk.fab || '',
      waferSize: sk.waferSize || '',
      toolType: sk.toolType || sk.toolModel || '',
      role: sk.role || 'Primary',
      numberOfTools: sk.numberOfTools || 1,
      startDate: sk.startDate || '',
      endDate: sk.endDate || '',
      readyForPrimaryRole: sk.readyForPrimaryRole || false,
      comments: sk.comments || '',
    });
    setSkillModalOpen(true);
  };

  const handleOpenDeleteSkillModal = (sk: Skill) => {
    setSkillToDelete(sk);
    setDeleteSkillModalOpen(true);
  };

  const handleSaveSkill = async () => {
    try {
      if (selectedSkill) {
        await updateSkillMutation.mutateAsync({
          skillId: selectedSkill.id,
          data: skillFormData,
        });
      } else {
        await createSkillMutation.mutateAsync(skillFormData);
      }
      setSkillModalOpen(false);
    } catch (err) {
      console.error('Failed to save skill:', err);
    }
  };

  const handleConfirmDeleteSkill = async () => {
    if (!skillToDelete) return;
    try {
      await deleteSkillMutation.mutateAsync(skillToDelete.id);
      setDeleteSkillModalOpen(false);
      setSkillToDelete(null);
    } catch (err) {
      console.error('Failed to delete skill:', err);
    }
  };


  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <img
              src={engineer.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300'}
              alt={engineer.name}
              className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/10 shadow-lg"
            />
            <div>
              <span className="text-xs font-mono tracking-widest text-indigo-400 uppercase font-semibold">
                Field Engineer Self-Service
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight mt-1 text-white">
                WELCOME, {engineer.name.toUpperCase()}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-300">
                <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 font-mono">
                  ORBIT ID: {engineer.orbitId}
                </span>
                <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                  Level: {engineer.level}
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-semibold">
                  {engineer.status}
                </span>
              </div>
            </div>
          </div>


          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setPtoModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center space-x-2 border border-indigo-400/30"
            >
              <Calendar className="w-4 h-4" />
              <span>Request PTO</span>
            </Button>
          </div>
        </div>
      </div>


      {/* 30-Day Alert Banner */}
      {isWithin30Days && daysUntilNext !== null && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600/60 rounded-2xl p-5 shadow-lg flex items-center space-x-4 animate-pulse">
          <div className="p-3 bg-amber-500 text-slate-950 rounded-xl flex-shrink-0 font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
              UPCOMING SCHEDULE ALERT
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
              Your next schedule starts in <span className="font-extrabold text-amber-950 dark:text-amber-100">{daysUntilNext} days</span>. Please review your travel arrangements and visa requirements.
            </p>
          </div>
        </div>
      )}

      {/* Next Schedule Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Next Schedule</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Nearest upcoming customer assignment</p>
            </div>
          </div>
        </div>

        {nextSchedule ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200/60 dark:border-slate-800">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Destination</span>
              <div className="flex items-center space-x-2 mt-1 font-semibold text-slate-900 dark:text-white">
                <MapPin className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span>{nextSchedule.fabCity || nextSchedule.country} / {nextSchedule.fabSite || 'Customer Fab'}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Support Type</span>
              <div className="font-semibold text-slate-900 dark:text-white mt-1">
                {nextSchedule.supportType || 'Field Support'}
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Start Date</span>
              <div className="font-semibold text-slate-900 dark:text-white mt-1">
                {nextSchedule.startDate}
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Days Until</span>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                  {daysUntilNext !== null ? `${daysUntilNext} Days` : 'N/A'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">
                  {nextSchedule.scheduleStatus || 'Upcoming'}
                </span>
              </div>
            </div>

            {nextSchedule.remarks && (
              <div className="md:col-span-4 mt-2 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">My Remarks: </span>
                  {nextSchedule.remarks}
                </div>
                <button
                  onClick={() => handleOpenScheduleCommentModal(nextSchedule)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center space-x-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Comment</span>
                </button>
              </div>
            )}
            {!nextSchedule.remarks && (
              <div className="md:col-span-4 mt-2 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                <button
                  onClick={() => handleOpenScheduleCommentModal(nextSchedule)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center space-x-1"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Add Comment</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No upcoming schedules.</p>
          </div>
        )}
      </div>

      {/* MY VISA Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Visa Details</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Authorized country immigration records</p>
            </div>
          </div>
        </div>

        {visas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-mono font-semibold">
                <tr>
                  <th className="p-3">Country</th>
                  <th className="p-3">Visa Type</th>
                  <th className="p-3">Applied On</th>
                  <th className="p-3">Visa Start</th>
                  <th className="p-3">Visa End</th>
                  <th className="p-3">Comments</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visas.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{v.country}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{v.visaType || 'N/A'}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{v.appliedOn || 'N/A'}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{v.visaStartDate || v.issueDate || 'N/A'}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{v.visaEndDate || v.expiryDate || 'N/A'}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">{v.comments || '—'}</td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenVisaCommentModal(v)}
                        icon={<MessageSquare className="w-3 h-3" />}
                      >
                        Add/Edit Comment
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-4 text-center">No visa records found.</p>
        )}
      </div>

      {/* MY SKILLS Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Skills Matrix</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Technical tool competency self-service</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleOpenAddSkillModal}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add New Skill
          </Button>
        </div>

        {skills.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-mono font-semibold">
                <tr>
                  <th className="p-3">Country</th>
                  <th className="p-3">Fab</th>
                  <th className="p-3">Wafer Size</th>
                  <th className="p-3">Tool Type</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Tools</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">End Date</th>
                  <th className="p-3">Primary Ready</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {skills.map((sk) => (
                  <tr key={sk.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{sk.country || 'Taiwan'}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{sk.fab || 'Fab 18'}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{sk.waferSize || '300mm'}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{sk.toolType || sk.toolModel}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{sk.role || 'Primary'}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{sk.numberOfTools || 1}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{sk.startDate || '—'}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{sk.endDate || '—'}</td>
                    <td className="p-3">
                      {sk.readyForPrimaryRole ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Yes
                        </span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenEditSkillModal(sk)}
                          icon={<Edit className="w-3 h-3 text-blue-500" />}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDeleteSkillModal(sk)}
                          icon={<Trash2 className="w-3 h-3 text-rose-500" />}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-4 text-center">No skill matrix records found.</p>
        )}
      </div>


      {/* MY PERFORMANCE Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Performance Records</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Customer feedback and schedule execution evaluation</p>
            </div>
          </div>
        </div>

        {performances.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-mono font-semibold">
                <tr>
                  <th className="p-3">Score</th>
                  <th className="p-3">Actual Start</th>
                  <th className="p-3">Actual End</th>
                  <th className="p-3">Escalation</th>
                  <th className="p-3">Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {performances.map((perf) => (
                  <tr key={perf.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-extrabold text-slate-900 dark:text-white">
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 rounded-md font-mono">
                        {perf.score ? `${perf.score}%` : `${perf.customerFeedbackScore}%`}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{perf.actualStartDate || 'N/A'}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{perf.actualEndDate || 'N/A'}</td>
                    <td className="p-3">
                      {perf.escalation ? (
                        <span className="text-rose-600 font-bold flex items-center">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1" /> {perf.escalationReason || 'Yes'}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">None</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 max-w-sm">{perf.feedback || perf.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-4 text-center">No performance records logged yet.</p>
        )}
      </div>

      {/* Schedule Remarks Modal */}
      {scheduleCommentModalOpen && (
        <Modal
          isOpen={scheduleCommentModalOpen}
          onClose={() => setScheduleCommentModalOpen(false)}
          title="Update Schedule Comment / Remarks"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Add or update your personal remarks for this schedule assignment. Business schedule parameters cannot be altered.
            </p>
            <TextInput
              label="Remarks / Comments"
              value={scheduleRemarksInput}
              onChange={(e) => setScheduleRemarksInput(e.target.value)}
              placeholder="e.g. Travel tickets confirmed, visa documentation ready."
            />
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="secondary" onClick={() => setScheduleCommentModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveScheduleComment} loading={updateScheduleCommentsMutation.isPending}>
                Save Comment
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Visa Comment Modal */}
      {visaCommentModalOpen && (
        <Modal
          isOpen={visaCommentModalOpen}
          onClose={() => setVisaCommentModalOpen(false)}
          title="Update Visa Comments"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Add or update remarks for this visa record. Official visa parameters cannot be altered.
            </p>
            <TextInput
              label="Visa Comments"
              value={visaCommentInput}
              onChange={(e) => setVisaCommentInput(e.target.value)}
              placeholder="e.g. Renewal submitted to embassy on 2026-08-01."
            />
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="secondary" onClick={() => setVisaCommentModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveVisaComment} loading={updateVisaCommentsMutation.isPending}>
                Save Comment
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Skill Modal */}
      {skillModalOpen && (
        <Modal
          isOpen={skillModalOpen}
          onClose={() => setSkillModalOpen(false)}
          title={selectedSkill ? 'Edit Skill Matrix Record' : 'Add New Skill Matrix Record'}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Country"
                value={skillFormData.country}
                onChange={(e) => setSkillFormData({ ...skillFormData, country: e.target.value })}
                placeholder="e.g. Taiwan"
              />
              <TextInput
                label="Fab"
                value={skillFormData.fab}
                onChange={(e) => setSkillFormData({ ...skillFormData, fab: e.target.value })}
                placeholder="e.g. Fab 18"
              />
              <TextInput
                label="Wafer Size"
                value={skillFormData.waferSize}
                onChange={(e) => setSkillFormData({ ...skillFormData, waferSize: e.target.value })}
                placeholder="e.g. 300mm"
              />
              <TextInput
                label="Tool Type"
                value={skillFormData.toolType}
                onChange={(e) => setSkillFormData({ ...skillFormData, toolType: e.target.value })}
                placeholder="e.g. Lam Kiyo Etch"
              />
              <TextInput
                label="Role"
                value={skillFormData.role}
                onChange={(e) => setSkillFormData({ ...skillFormData, role: e.target.value })}
                placeholder="e.g. Primary"
              />
              <TextInput
                label="Number of Tools"
                type="number"
                value={String(skillFormData.numberOfTools)}
                onChange={(e) => setSkillFormData({ ...skillFormData, numberOfTools: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="readyForPrimary"
                checked={skillFormData.readyForPrimaryRole}
                onChange={(e) => setSkillFormData({ ...skillFormData, readyForPrimaryRole: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="readyForPrimary" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ready for Primary Role
              </label>
            </div>
            <TextInput
              label="Comments"
              value={skillFormData.comments}
              onChange={(e) => setSkillFormData({ ...skillFormData, comments: e.target.value })}
              placeholder="e.g. Certified on 300mm dual chamber setup"
            />
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setSkillModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSkill} loading={createSkillMutation.isPending || updateSkillMutation.isPending}>
                {selectedSkill ? 'Save Changes' : 'Create Skill Record'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Skill Modal */}
      {deleteSkillModalOpen && (
        <Modal
          isOpen={deleteSkillModalOpen}
          onClose={() => setDeleteSkillModalOpen(false)}
          title="Delete Skill Record"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to delete the skill record <strong>{skillToDelete?.toolType || skillToDelete?.toolModel}</strong> ({skillToDelete?.country} - {skillToDelete?.fab})? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setDeleteSkillModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDeleteSkill}
                className="bg-rose-600 hover:bg-rose-700 text-white"
                loading={deleteSkillMutation.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Request PTO Modal */}
      {ptoModalOpen && (
        <Modal
          isOpen={ptoModalOpen}
          onClose={() => setPtoModalOpen(false)}
          title="Request Field Engineer PTO"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!ptoFormData.requested_date) return;
              try {
                await createPtoMutation.mutateAsync({
                  leave_type: ptoFormData.leave_type,
                  requested_date: ptoFormData.requested_date,
                  comments: ptoFormData.comments,
                });
                setPtoModalOpen(false);
                setPtoFormData({ leave_type: 'Annual PTO', requested_date: '', comments: '' });
              } catch (err) {
                console.error('Failed to submit PTO request:', err);
              }
            }}
            className="space-y-4"
          >
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Submit a PTO leave request for review by your Resource Manager.
            </p>
            <Dropdown
              label="Leave Type"
              value={ptoFormData.leave_type}
              onChange={(e) => setPtoFormData({ ...ptoFormData, leave_type: e.target.value })}
              options={['Annual PTO', 'Sick Leave', 'Personal Leave', 'Emergency Leave', 'Compensatory Off']}
            />
            <TextInput
              label="Requested Date *"
              type="date"
              value={ptoFormData.requested_date}
              onChange={(e) => setPtoFormData({ ...ptoFormData, requested_date: e.target.value })}
              required
            />
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Optional Reason / Comment
              </label>
              <textarea
                rows={3}
                value={ptoFormData.comments}
                onChange={(e) => setPtoFormData({ ...ptoFormData, comments: e.target.value })}
                placeholder="Specify purpose or coverage details..."
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={() => setPtoModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createPtoMutation.isPending}>
                {createPtoMutation.isPending ? 'Submitting...' : 'Submit PTO Request'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
