import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useEngineerDetail, useUpdateEngineer } from '../hooks/useEngineers';
import { useEngineerMe, useUpdateEngineerMeScheduleComments } from '../hooks/useEngineerSelfService';
import { notifyScheduleCommentAdded } from '../utils/notifications';
import { useEngineerOperationalAlerts } from '../hooks/useOperationalAlerts';
import {
  useEngineerSkills,
  useCreateSkill,
  useUpdateSkill,
  useDeleteSkill,
} from '../hooks/useSkills';
import {
  useSchedule,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
} from '../hooks/useSchedule';
import { useMissedSchedules } from '../hooks/useMissedSchedules';
import {
  useVisa,
  useCreateVisa,
  useUpdateVisa,
  useDeleteVisa,
} from '../hooks/useVisa';
import { useTravel, useCreateTravel, useUpdateTravel, useDeleteTravel } from '../hooks/useTravel';
import { usePerformance, useCreatePerformance, useUpdatePerformance, useDeletePerformance } from '../hooks/usePerformance';
import { useLeaves, useCreateLeave, useUpdateLeave, useDeleteLeave } from '../hooks/useLeaves';
import { Button } from '../components/forms/Button';
import { Table } from '../components/common/Table';
import type { Column } from '../components/common/Table';
import { TextInput } from '../components/forms/TextInput';
import { Dropdown } from '../components/forms/Dropdown';
import { DatePicker } from '../components/forms/DatePicker';
import { Modal } from '../components/forms/Modal';
import { SearchableDropdown } from '../components/forms/SearchableDropdown';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { ScheduleCommentsCard } from '../components/schedule/ScheduleCommentsCard';
import { useAuth } from '../context/AuthContext';

import type { Skill, Schedule, Visa, Travel, Performance, Leave } from '../types';
import { EngineerIndividualReportView } from '../components/reports/EngineerIndividualReportView';
import { AddPerformanceModal } from '../components/common/AddPerformanceModal';
import { EngineerPhotoUploadModal } from '../components/common/EngineerPhotoUploadModal';
import {
  User,
  Wrench,
  Calendar,
  Plane,
  FileCheck,
  TrendingUp,
  Clock,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  Briefcase,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  BarChart3,
  MessageSquare,
  Camera,
} from 'lucide-react';



export const EngineerProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, canEdit } = useAuth();

  const isEngineerUser = user?.role === 'Field Engineer' || user?.role === 'Engineer';
  const tabParam = searchParams.get('tab') as any;
  const initialTab = tabParam && ['profile', 'skills', 'schedule', 'travel', 'visa', 'performance', 'leaves', 'reports'].includes(tabParam)
    ? tabParam
    : 'profile';

  const [activeTab, setActiveTab] = useState<'profile' | 'skills' | 'schedule' | 'travel' | 'visa' | 'performance' | 'leaves' | 'reports'>(initialTab);

  const { data: meEngineer } = useEngineerMe();

  const engineerId = isEngineerUser && meEngineer ? meEngineer.id : (id || 'eng-101');
  const { data: engineerData, isLoading, isError, refetch } = useEngineerDetail(engineerId);

  const engineer = isEngineerUser && meEngineer ? meEngineer : engineerData;
  const targetReportEngineerId = engineer?.id || engineerId;



  // Engineer Profile Mutation & Edit Modal State
  const updateEngineerMutation = useUpdateEngineer();
  const [isEditEngineerModalOpen, setIsEditEngineerModalOpen] = useState(false);
  const [engineerFormData, setEngineerFormData] = useState({
    name: '',
    goesBy: '',
    customerId: '',
    orbitId: '',
    level: 'L2 Specialist',
    joinDate: '',
    primaryTool: 'Etch',
    customerExperience: '',
    yearsExperience: '',
    status: 'Active',
    email: '',
    phoneNumber: '',
    country: '',
    city: '',
  });
  const [engineerFormErrors, setEngineerFormErrors] = useState<Record<string, string>>({});
  const [engineerApiError, setEngineerApiError] = useState<string | null>(null);
  const [engineerSuccessMessage, setEngineerSuccessMessage] = useState<string | null>(null);

  const handleOpenEditEngineerModal = () => {
    if (!engineer) return;
    setEngineerFormData({
      name: engineer.name || '',
      goesBy: engineer.goesBy || '',
      customerId: engineer.customerId || '',
      orbitId: engineer.orbitId || '',
      level: engineer.level || 'L2 Specialist',
      joinDate: engineer.joinDate || '',
      primaryTool: engineer.primaryTool || 'Etch',
      customerExperience: engineer.customerExperience !== undefined ? String(engineer.customerExperience) : '',
      yearsExperience: engineer.yearsExperience !== undefined ? String(engineer.yearsExperience) : '',
      status: engineer.status || 'Active',
      email: engineer.email || '',
      phoneNumber: engineer.phoneNumber || '',
      country: engineer.country || '',
      city: engineer.city || '',
    });
    setEngineerFormErrors({});
    setEngineerApiError(null);
    setEngineerSuccessMessage(null);
    setIsEditEngineerModalOpen(true);
  };

  const handleUpdateEngineerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!engineer) return;
    setEngineerApiError(null);
    setEngineerSuccessMessage(null);

    const errors: Record<string, string> = {};
    if (!engineerFormData.name.trim()) errors.name = 'Engineer Name is required';
    if (!engineerFormData.orbitId.trim()) errors.orbitId = 'Orbit ID is required';
    if (engineerFormData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(engineerFormData.email.trim())) {
      errors.email = 'Invalid email format';
    }
    if (engineerFormData.phoneNumber && !/^[+\d\s().-]{3,30}$/.test(engineerFormData.phoneNumber.trim())) {
      errors.phoneNumber = 'Phone number is invalid or too long (max 30 chars)';
    }

    if (Object.keys(errors).length > 0) {
      setEngineerFormErrors(errors);
      return;
    }

    const payload: Partial<any> = {
      name: engineerFormData.name,
      goesBy: engineerFormData.goesBy,
      customerId: engineerFormData.customerId,
      orbitId: engineerFormData.orbitId,
      level: engineerFormData.level,
      joinDate: engineerFormData.joinDate,
      primaryTool: engineerFormData.primaryTool,
      customerExperience: engineerFormData.customerExperience ? Number(engineerFormData.customerExperience) : undefined,
      yearsExperience: engineerFormData.yearsExperience ? Number(engineerFormData.yearsExperience) : undefined,
      status: engineerFormData.status,
      email: engineerFormData.email,
      phoneNumber: engineerFormData.phoneNumber,
      country: engineerFormData.country,
      city: engineerFormData.city,
    };

    updateEngineerMutation.mutate(
      { id: engineer.id, data: payload },
      {
        onSuccess: () => {
          setEngineerSuccessMessage('Engineer profile updated successfully.');
          refetch();
          setTimeout(() => {
            setIsEditEngineerModalOpen(false);
            setEngineerSuccessMessage(null);
          }, 1000);
        },
        onError: (err: any) => {
          const msg = err.message || err.details?.detail || 'Failed to update engineer profile.';
          setEngineerApiError(msg);
        },
      }
    );
  };

  // Certifications & Compliance State and Handlers
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [certFormData, setCertFormData] = useState<{
    certificationsCount: number;
    cert1Name: string;
    cert1Status: string;
    cert2Name: string;
    cert2Status: string;
    cert3Name: string;
    cert3Status: string;
  }>({
    certificationsCount: 2,
    cert1Name: 'Semiconductor Cleanroom Class 1 Certified',
    cert1Status: 'Valid',
    cert2Name: 'High Voltage & Vacuum Safety Permit',
    cert2Status: 'Valid',
    cert3Name: 'Chemical & Gas Hazard Safety Clearance',
    cert3Status: 'Valid',
  });



  const handleUpdateCertificationsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!engineer) return;

    updateEngineerMutation.mutate(
      {
        id: engineer.id,
        data: {
          certificationsCount: Number(certFormData.certificationsCount),
        },
      },
      {
        onSuccess: () => {
          refetch();
          setIsCertModalOpen(false);
        },
      }
    );
  };

  const targetEngineerId = engineer?.id || (isEngineerUser && meEngineer ? meEngineer.id : id);
  const { data: engAlerts } = useEngineerOperationalAlerts(targetEngineerId);
  const { data: skills } = useEngineerSkills(targetEngineerId);
  const { data: schedulesRes } = useSchedule({ engineerId: targetEngineerId, pageSize: 1000 });
  const engineerSchedulesList = (schedulesRes?.data || []).filter((s) => {
    const isPTO = s.supportType?.toUpperCase().includes('PTO') || s.supportType === 'Time Off' || s.supportType === 'Leave';
    const isMatch = !targetEngineerId || s.engineerId === targetEngineerId || (engineer?.name && s.engineerName === engineer.name);
    return isMatch && !isPTO;
  });
  const { data: travelRes } = useTravel({ engineerId });
  const { data: visaRes } = useVisa({ engineerId });
  const { data: perfRes } = usePerformance({ engineerId });
  const { data: leavesRes } = useLeaves({ engineerId });
  const { data: missedSchedulesRes } = useMissedSchedules({ engineerId });
  const missedScheduleIds = new Set(missedSchedulesRes?.data?.map(ms => ms.scheduleId).filter(Boolean) || []);

  const currentActiveSchedule = schedulesRes?.data?.find(s => s.scheduleStatus === 'Active' || s.scheduleStatus === 'Ongoing') || schedulesRes?.data?.[0];
  const currentScheduleSite = currentActiveSchedule
    ? `${currentActiveSchedule.fabSite || currentActiveSchedule.siteLocation || currentActiveSchedule.country || 'Customer Site'} (${currentActiveSchedule.supportType || 'Assignment'})`
    : (engineer?.assignedSite || 'Unassigned');


  // Skills Mutations
  const createSkillMutation = useCreateSkill();
  const updateSkillMutation = useUpdateSkill();
  const deleteSkillMutation = useDeleteSkill();

  // Schedule Mutations
  const createScheduleMutation = useCreateSchedule();
  const updateScheduleMutation = useUpdateSchedule();
  const deleteScheduleMutation = useDeleteSchedule();
  const updateScheduleCommentsMutation = useUpdateEngineerMeScheduleComments();

  // Schedule Comment Modal State
  const [isScheduleCommentModalOpen, setIsScheduleCommentModalOpen] = useState(false);
  const [selectedScheduleForComment, setSelectedScheduleForComment] = useState<Schedule | null>(null);
  const [scheduleRemarksInput, setScheduleRemarksInput] = useState('');

  const handleOpenScheduleCommentModal = (sch: Schedule) => {
    setSelectedScheduleForComment(sch);
    setScheduleRemarksInput(sch.remarks || '');
    setIsScheduleCommentModalOpen(true);
  };

  const handleSaveScheduleComment = async () => {
    if (!selectedScheduleForComment) return;
    try {
      if (isEngineerUser) {
        await updateScheduleCommentsMutation.mutateAsync({
          scheduleId: selectedScheduleForComment.id,
          remarks: scheduleRemarksInput,
        });
      } else {
        await updateScheduleMutation.mutateAsync({
          id: selectedScheduleForComment.id,
          data: { remarks: scheduleRemarksInput } as any,
        });
      }
      setIsScheduleCommentModalOpen(false);

      notifyScheduleCommentAdded({
        engineerName: engineer?.name || user?.name || user?.email || 'Field Engineer',
        scheduleId: selectedScheduleForComment.id,
        supportType: selectedScheduleForComment.supportType,
        fabSite: selectedScheduleForComment.fabSite || selectedScheduleForComment.country,
        remarks: scheduleRemarksInput,
      });

    } catch (err) {
      console.error('Failed to update schedule comment:', err);
    }
  };


  // Visa Mutations
  const createVisaMutation = useCreateVisa();
  const updateVisaMutation = useUpdateVisa();
  const deleteVisaMutation = useDeleteVisa();

  // Travel Mutations
  const createTravelMutation = useCreateTravel();
  const updateTravelMutation = useUpdateTravel();
  const deleteTravelMutation = useDeleteTravel();

  // Travel Modals state
  const [isTravelModalOpen, setIsTravelModalOpen] = useState(false);
  const [isTravelDeleteModalOpen, setIsTravelDeleteModalOpen] = useState(false);
  const [selectedTravel, setSelectedTravel] = useState<Travel | null>(null);

  // Travel Form state
  const [travelFormData, setTravelFormData] = useState({
    scheduleId: '',
    bookingDate: '',
    travelDate: '',
    purpose: 'Customer Support',
    comments: '',
  });

  const [travelFormErrors, setTravelFormErrors] = useState<Record<string, string>>({});
  const [travelApiError, setTravelApiError] = useState<string | null>(null);
  const [travelSuccessMessage, setTravelSuccessMessage] = useState<string | null>(null);

  // Performance Mutations
  const createPerfMutation = useCreatePerformance();
  const updatePerfMutation = useUpdatePerformance();
  const deletePerfMutation = useDeletePerformance();

  // Performance Modals state
  const [isPerfModalOpen, setIsPerfModalOpen] = useState(false);
  const [isPerfDeleteModalOpen, setIsPerfDeleteModalOpen] = useState(false);
  const [selectedPerf, setSelectedPerf] = useState<Performance | null>(null);

  // Performance Form state
  const [perfFormData, setPerfFormData] = useState({
    scheduleId: '',
    actualStartDate: '',
    actualEndDate: '',
    escalation: false,
    escalationReason: '',
    feedback: '',
    score: '5.0',
    attachment: '',
  });

  const [perfFormErrors, setPerfFormErrors] = useState<Record<string, string>>({});
  const [perfApiError, setPerfApiError] = useState<string | null>(null);
  const [perfSuccessMessage, setPerfSuccessMessage] = useState<string | null>(null);
  const [isAddPerfModalOpen, setIsAddPerfModalOpen] = useState(false);

  // Leave Mutations
  const createLeaveMutation = useCreateLeave();
  const updateLeaveMutation = useUpdateLeave();
  const deleteLeaveMutation = useDeleteLeave();

  // Leave Modals state
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isLeaveDeleteModalOpen, setIsLeaveDeleteModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);

  // Leave Form state
  const [leaveFormData, setLeaveFormData] = useState({
    leaveType: 'Annual Leave',
    requestedDate: '',
    requestedOn: new Date().toISOString().split('T')[0],
    approvalStatus: 'Pending',
  });

  const [leaveFormErrors, setLeaveFormErrors] = useState<Record<string, string>>({});
  const [leaveApiError, setLeaveApiError] = useState<string | null>(null);
  const [leaveSuccessMessage, setLeaveSuccessMessage] = useState<string | null>(null);

  // Skill Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  // Skill Form state
  const [formData, setFormData] = useState({
    country: '',
    fab: '',
    waferSize: '300mm',
    toolType: 'Etch',
    startDate: '',
    endDate: '',
    numberOfTools: '',
    role: 'Primary Engineer',
    previousProcessStartup: false,
    previousCmPm: false,
    readyForPrimaryRole: false,
    comments: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Schedule Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isScheduleDeleteModalOpen, setIsScheduleDeleteModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Schedule Form state
  const [scheduleFormData, setScheduleFormData] = useState({
    supportType: 'Customer Support',
    country: 'Taiwan',
    fabCity: 'Hsinchu',
    fabSite: 'TSMC Fab 12',
    startDate: '',
    endDate: '',
    scheduleStatus: 'Upcoming',
    remarks: '',
  });

  const [scheduleFormErrors, setScheduleFormErrors] = useState<Record<string, string>>({});
  const [scheduleApiError, setScheduleApiError] = useState<string | null>(null);
  const [scheduleSuccessMessage, setScheduleSuccessMessage] = useState<string | null>(null);

  // Visa Modals state
  const [isVisaModalOpen, setIsVisaModalOpen] = useState(false);
  const [isVisaDeleteModalOpen, setIsVisaDeleteModalOpen] = useState(false);
  const [selectedVisa, setSelectedVisa] = useState<Visa | null>(null);

  // Visa Form state
  const [visaFormData, setVisaFormData] = useState({
    country: 'United States',
    visaType: 'B1/B2',
    appliedOn: '',
    issueDate: '',
    expiryDate: '',
  });

  const [visaFormErrors, setVisaFormErrors] = useState<Record<string, string>>({});
  const [visaApiError, setVisaApiError] = useState<string | null>(null);
  const [visaSuccessMessage, setVisaSuccessMessage] = useState<string | null>(null);

  // Photo Upload Modal state
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  if (isLoading) return <CardSkeleton />;
  if (isError || !engineer) return <ErrorState onRetry={refetch} message="Engineer profile could not be retrieved." />;

  // Skill logic functions
  const handleOpenAddModal = () => {
    setSelectedSkill(null);
    setFormData({
      country: 'Taiwan',
      fab: 'TSMC Fab 18',
      waferSize: '300mm',
      toolType: 'Etch',
      startDate: '',
      endDate: '',
      numberOfTools: '',
      role: 'Primary Engineer',
      previousProcessStartup: false,
      previousCmPm: false,
      readyForPrimaryRole: false,
      comments: '',
    });
    setFormErrors({});
    setApiError(null);
    setSuccessMessage(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (skill: Skill) => {
    setSelectedSkill(skill);
    setFormData({
      country: skill.country || '',
      fab: skill.fab || '',
      waferSize: skill.waferSize || '300mm',
      toolType: skill.toolType || 'Etch',
      startDate: skill.startDate || '',
      endDate: skill.endDate || '',
      numberOfTools: skill.numberOfTools !== undefined ? String(skill.numberOfTools) : '',
      role: skill.role || '',
      previousProcessStartup: !!skill.previousProcessStartup,
      previousCmPm: !!skill.previousCmPm,
      readyForPrimaryRole: !!skill.readyForPrimaryRole,
      comments: skill.comments || '',
    });
    setFormErrors({});
    setApiError(null);
    setSuccessMessage(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenDeleteModal = (skill: Skill) => {
    setSelectedSkill(skill);
    setApiError(null);
    setIsDeleteModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        errors.endDate = 'End Date cannot be earlier than Start Date';
      }
    }

    const toolCount = Number(formData.numberOfTools);
    if (formData.numberOfTools && (isNaN(toolCount) || toolCount < 0)) {
      errors.numberOfTools = 'Number of Tools cannot be negative';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    const payload: Partial<Skill> = {
      country: formData.country,
      fab: formData.fab,
      waferSize: formData.waferSize,
      toolType: formData.toolType,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      numberOfTools: formData.numberOfTools ? Number(formData.numberOfTools) : undefined,
      role: formData.role,
      previousProcessStartup: formData.previousProcessStartup,
      previousCmPm: formData.previousCmPm,
      readyForPrimaryRole: formData.readyForPrimaryRole,
      comments: formData.comments,
    };

    if (selectedSkill) {
      updateSkillMutation.mutate(
        { id: selectedSkill.id, data: payload },
        {
          onSuccess: () => {
            setSuccessMessage('Skill updated successfully.');
            setTimeout(() => {
              setIsAddEditModalOpen(false);
              setSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to update skill.';
            setApiError(msg);
          },
        }
      );
    } else {
      createSkillMutation.mutate(
        { engineerId, data: payload },
        {
          onSuccess: () => {
            setSuccessMessage('Skill created successfully.');
            setTimeout(() => {
              setIsAddEditModalOpen(false);
              setSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to create skill.';
            setApiError(msg);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!selectedSkill) return;
    setApiError(null);
    deleteSkillMutation.mutate(selectedSkill.id, {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        setSelectedSkill(null);
        alert('Skill deleted successfully.');
      },
      onError: (err: any) => {
        const msg = err.message || err.details?.detail || 'Failed to delete skill.';
        setApiError(msg);
      },
    });
  };

  // Schedule logic functions
  const handleOpenAddScheduleModal = () => {
    setSelectedSchedule(null);
    setScheduleFormData({
      supportType: 'Customer Support',
      country: 'Taiwan',
      fabCity: 'Hsinchu',
      fabSite: 'TSMC Fab 12',
      startDate: '',
      endDate: '',
      scheduleStatus: 'Upcoming',
      remarks: '',
    });
    setScheduleFormErrors({});
    setScheduleApiError(null);
    setScheduleSuccessMessage(null);
    setIsScheduleModalOpen(true);
  };

  const handleOpenEditScheduleModal = (sch: Schedule) => {
    setSelectedSchedule(sch);
    setScheduleFormData({
      supportType: sch.supportType || 'Customer Support',
      country: sch.country || '',
      fabCity: sch.fabCity || '',
      fabSite: sch.fabSite || '',
      startDate: sch.startDate || '',
      endDate: sch.endDate || '',
      scheduleStatus: sch.scheduleStatus || 'Upcoming',
      remarks: sch.remarks || '',
    });
    setScheduleFormErrors({});
    setScheduleApiError(null);
    setScheduleSuccessMessage(null);
    setIsScheduleModalOpen(true);
  };

  const handleOpenDeleteScheduleModal = (sch: Schedule) => {
    setSelectedSchedule(sch);
    setScheduleApiError(null);
    setIsScheduleDeleteModalOpen(true);
  };

  const validateScheduleForm = () => {
    const errors: Record<string, string> = {};
    if (!scheduleFormData.supportType.trim()) errors.supportType = 'Support Type is required';
    if (!scheduleFormData.country.trim()) errors.country = 'Country is required';
    if (!scheduleFormData.startDate) errors.startDate = 'Start Date is required';

    if (scheduleFormData.startDate && scheduleFormData.endDate) {
      if (new Date(scheduleFormData.endDate) < new Date(scheduleFormData.startDate)) {
        errors.endDate = 'End Date cannot be earlier than Start Date';
      }
    }

    setScheduleFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleApiError(null);
    setScheduleSuccessMessage(null);

    if (!validateScheduleForm()) return;

    const payload: Partial<Schedule> = {
      supportType: scheduleFormData.supportType,
      country: scheduleFormData.country,
      fabCity: scheduleFormData.fabCity,
      fabSite: scheduleFormData.fabSite,
      startDate: scheduleFormData.startDate,
      endDate: scheduleFormData.endDate || undefined,
      scheduleStatus: scheduleFormData.scheduleStatus,
      remarks: scheduleFormData.remarks,
    };

    if (selectedSchedule) {
      updateScheduleMutation.mutate(
        { id: selectedSchedule.id, data: payload },
        {
          onSuccess: () => {
            setScheduleSuccessMessage('Schedule updated successfully.');
            setTimeout(() => {
              setIsScheduleModalOpen(false);
              setScheduleSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to update schedule.';
            setScheduleApiError(msg);
          },
        }
      );
    } else {
      createScheduleMutation.mutate(
        { engineerId, data: payload },
        {
          onSuccess: () => {
            setScheduleSuccessMessage('Schedule created successfully.');
            setTimeout(() => {
              setIsScheduleModalOpen(false);
              setScheduleSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to create schedule.';
            setScheduleApiError(msg);
          },
        }
      );
    }
  };

  const handleScheduleDelete = () => {
    if (!selectedSchedule) return;
    setScheduleApiError(null);
    deleteScheduleMutation.mutate(selectedSchedule.id, {
      onSuccess: () => {
        setIsScheduleDeleteModalOpen(false);
        setSelectedSchedule(null);
        alert('Schedule deleted successfully.');
      },
      onError: (err: any) => {
        const msg = err.message || err.details?.detail || 'Failed to delete schedule.';
        setScheduleApiError(msg);
      },
    });
  };

  // Visa logic functions
  const handleOpenAddVisaModal = () => {
    setSelectedVisa(null);
    setVisaFormData({
      country: 'United States',
      visaType: 'B1/B2',
      appliedOn: '',
      issueDate: '',
      expiryDate: '',
    });
    setVisaFormErrors({});
    setVisaApiError(null);
    setVisaSuccessMessage(null);
    setIsVisaModalOpen(true);
  };

  const handleOpenEditVisaModal = (v: Visa) => {
    setSelectedVisa(v);
    setVisaFormData({
      country: v.country || '',
      visaType: v.visaType || '',
      appliedOn: v.appliedOn || '',
      issueDate: v.issueDate || '',
      expiryDate: v.expiryDate || '',
    });
    setVisaFormErrors({});
    setVisaApiError(null);
    setVisaSuccessMessage(null);
    setIsVisaModalOpen(true);
  };

  const handleOpenDeleteVisaModal = (v: Visa) => {
    setSelectedVisa(v);
    setVisaApiError(null);
    setIsVisaDeleteModalOpen(true);
  };

  const validateVisaForm = () => {
    const errors: Record<string, string> = {};
    if (!visaFormData.country.trim()) errors.country = 'Country is required';

    if (visaFormData.issueDate && visaFormData.expiryDate) {
      if (new Date(visaFormData.expiryDate) < new Date(visaFormData.issueDate)) {
        errors.expiryDate = 'Expiry Date cannot be earlier than Start Date';
      }
    }

    setVisaFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleVisaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVisaApiError(null);
    setVisaSuccessMessage(null);

    if (!validateVisaForm()) return;

    const payload: Partial<Visa> = {
      country: visaFormData.country,
      visaType: visaFormData.visaType,
      appliedOn: visaFormData.appliedOn || undefined,
      issueDate: visaFormData.issueDate || undefined,
      expiryDate: visaFormData.expiryDate || undefined,
    };

    if (selectedVisa) {
      updateVisaMutation.mutate(
        { id: selectedVisa.id, data: payload },
        {
          onSuccess: () => {
            setVisaSuccessMessage('Visa record updated successfully.');
            setTimeout(() => {
              setIsVisaModalOpen(false);
              setVisaSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to update visa.';
            setVisaApiError(msg);
          },
        }
      );
    } else {
      createVisaMutation.mutate(
        { engineerId, data: payload },
        {
          onSuccess: () => {
            setVisaSuccessMessage('Visa record created successfully.');
            setTimeout(() => {
              setIsVisaModalOpen(false);
              setVisaSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to create visa.';
            setVisaApiError(msg);
          },
        }
      );
    }
  };

  const handleVisaDelete = () => {
    if (!selectedVisa) return;
    setVisaApiError(null);
    deleteVisaMutation.mutate(selectedVisa.id, {
      onSuccess: () => {
        setIsVisaDeleteModalOpen(false);
        setSelectedVisa(null);
        alert('Visa record deleted successfully.');
      },
      onError: (err: any) => {
        const msg = err.message || err.details?.detail || 'Failed to delete visa.';
        setVisaApiError(msg);
      },
    });
  };

  // Travel logic functions
  const handleOpenAddTravelModal = () => {
    setSelectedTravel(null);
    setTravelFormData({
      scheduleId: schedulesRes?.data?.[0]?.id || '',
      bookingDate: '',
      travelDate: '',
      purpose: 'Customer Support',
      comments: '',
    });
    setTravelFormErrors({});
    setTravelApiError(null);
    setTravelSuccessMessage(null);
    setIsTravelModalOpen(true);
  };

  const handleOpenEditTravelModal = (t: Travel) => {
    setSelectedTravel(t);
    setTravelFormData({
      scheduleId: t.scheduleId || '',
      bookingDate: t.bookingDate || '',
      travelDate: t.travelDate || '',
      purpose: t.purpose || 'Customer Support',
      comments: t.comments || '',
    });
    setTravelFormErrors({});
    setTravelApiError(null);
    setTravelSuccessMessage(null);
    setIsTravelModalOpen(true);
  };

  const handleOpenDeleteTravelModal = (t: Travel) => {
    setSelectedTravel(t);
    setTravelApiError(null);
    setIsTravelDeleteModalOpen(true);
  };

  const validateTravelForm = () => {
    const errors: Record<string, string> = {};
    if (!selectedTravel && !travelFormData.scheduleId) {
      errors.scheduleId = 'Schedule Assignment is required';
    }
    if (travelFormData.bookingDate && travelFormData.travelDate) {
      if (new Date(travelFormData.travelDate) < new Date(travelFormData.bookingDate)) {
        errors.travelDate = 'Travel Date cannot be earlier than Booking Date';
      }
    }
    setTravelFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTravelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTravelApiError(null);
    setTravelSuccessMessage(null);

    if (!validateTravelForm()) return;

    const payload: Partial<Travel> = {
      bookingDate: travelFormData.bookingDate || undefined,
      travelDate: travelFormData.travelDate || undefined,
      purpose: travelFormData.purpose,
      comments: travelFormData.comments,
    };

    if (selectedTravel) {
      updateTravelMutation.mutate(
        { id: selectedTravel.id, data: payload },
        {
          onSuccess: () => {
            setTravelSuccessMessage('Travel arrangement updated successfully.');
            setTimeout(() => {
              setIsTravelModalOpen(false);
              setTravelSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to update travel arrangement.';
            setTravelApiError(msg);
          },
        }
      );
    } else {
      createTravelMutation.mutate(
        { scheduleId: travelFormData.scheduleId, data: payload },
        {
          onSuccess: () => {
            setTravelSuccessMessage('Travel arrangement created successfully.');
            setTimeout(() => {
              setIsTravelModalOpen(false);
              setTravelSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to create travel arrangement.';
            setTravelApiError(msg);
          },
        }
      );
    }
  };

  const handleTravelDelete = () => {
    if (!selectedTravel) return;
    setTravelApiError(null);
    deleteTravelMutation.mutate(selectedTravel.id, {
      onSuccess: () => {
        setIsTravelDeleteModalOpen(false);
        setSelectedTravel(null);
        alert('Travel arrangement deleted successfully.');
      },
      onError: (err: any) => {
        const msg = err.message || err.details?.detail || 'Failed to delete travel arrangement.';
        setTravelApiError(msg);
      },
    });
  };


  // Performance logic functions
  const handleOpenAddPerfModal = () => {
    setIsAddPerfModalOpen(true);
  };

  const handleOpenEditPerfModal = (p: Performance) => {
    setSelectedPerf(p);
    setPerfFormData({
      scheduleId: p.scheduleId || '',
      actualStartDate: p.actualStartDate || '',
      actualEndDate: p.actualEndDate || '',
      escalation: !!p.escalation,
      escalationReason: p.escalationReason || '',
      feedback: p.feedback || '',
      score: p.score !== undefined ? String(p.score) : '5.0',
      attachment: p.attachment || '',
    });
    setPerfFormErrors({});
    setPerfApiError(null);
    setPerfSuccessMessage(null);
    setIsPerfModalOpen(true);
  };

  const handleOpenDeletePerfModal = (p: Performance) => {
    setSelectedPerf(p);
    setPerfApiError(null);
    setIsPerfDeleteModalOpen(true);
  };

  const validatePerfForm = () => {
    const errors: Record<string, string> = {};
    if (!selectedPerf && !perfFormData.scheduleId) {
      errors.scheduleId = 'Schedule Assignment is required';
    }
    if (perfFormData.actualStartDate && perfFormData.actualEndDate) {
      if (new Date(perfFormData.actualEndDate) < new Date(perfFormData.actualStartDate)) {
        errors.actualEndDate = 'Actual End Date cannot be earlier than Actual Start Date';
      }
    }
    if (perfFormData.escalation && !perfFormData.escalationReason.trim()) {
      errors.escalationReason = 'Escalation reason is required when escalation is enabled.';
    }
    const valScore = Number(perfFormData.score);
    if (isNaN(valScore) || valScore < 1.0 || valScore > 5.0) {
      errors.score = 'Performance rating score must be between 1.0 and 5.0';
    }

    setPerfFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePerfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPerfApiError(null);
    setPerfSuccessMessage(null);

    if (!validatePerfForm()) return;

    const payload: Partial<Performance> = {
      actualStartDate: perfFormData.actualStartDate || undefined,
      actualEndDate: perfFormData.actualEndDate || undefined,
      escalation: perfFormData.escalation,
      escalationReason: perfFormData.escalation ? perfFormData.escalationReason : null,
      feedback: perfFormData.feedback || undefined,
      score: Number(perfFormData.score),
      attachment: perfFormData.attachment || undefined,
    };

    if (selectedPerf) {
      updatePerfMutation.mutate(
        { id: selectedPerf.id, data: payload },
        {
          onSuccess: () => {
            setPerfSuccessMessage('Performance record updated successfully.');
            setTimeout(() => {
              setIsPerfModalOpen(false);
              setPerfSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to update performance record.';
            setPerfApiError(msg);
          },
        }
      );
    } else {
      createPerfMutation.mutate(
        { scheduleId: perfFormData.scheduleId, data: payload },
        {
          onSuccess: () => {
            setPerfSuccessMessage('Performance record created successfully.');
            setTimeout(() => {
              setIsPerfModalOpen(false);
              setPerfSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to create performance record.';
            setPerfApiError(msg);
          },
        }
      );
    }
  };

  const handlePerfDelete = () => {
    if (!selectedPerf) return;
    setPerfApiError(null);
    deletePerfMutation.mutate(selectedPerf.id, {
      onSuccess: () => {
        setIsPerfDeleteModalOpen(false);
        setSelectedPerf(null);
        alert('Performance record deleted successfully.');
      },
      onError: (err: any) => {
        const msg = err.message || err.details?.detail || 'Failed to delete performance record.';
        setPerfApiError(msg);
      },
    });
  };

  // Leave logic functions
  const handleOpenAddLeaveModal = () => {
    setSelectedLeave(null);
    setLeaveFormData({
      leaveType: 'Annual Leave',
      requestedDate: '',
      requestedOn: new Date().toISOString().split('T')[0],
      approvalStatus: 'Pending',
    });
    setLeaveFormErrors({});
    setLeaveApiError(null);
    setLeaveSuccessMessage(null);
    setIsLeaveModalOpen(true);
  };

  const handleOpenEditLeaveModal = (l: Leave) => {
    setSelectedLeave(l);
    setLeaveFormData({
      leaveType: l.leaveType || l.type || 'Annual Leave',
      requestedDate: l.requestedDate || l.startDate || '',
      requestedOn: l.requestedOn || new Date().toISOString().split('T')[0],
      approvalStatus: l.approvalStatus || l.status || 'Pending',
    });
    setLeaveFormErrors({});
    setLeaveApiError(null);
    setLeaveSuccessMessage(null);
    setIsLeaveModalOpen(true);
  };

  const handleOpenDeleteLeaveModal = (l: Leave) => {
    setSelectedLeave(l);
    setLeaveApiError(null);
    setIsLeaveDeleteModalOpen(true);
  };

  const validateLeaveForm = () => {
    const errors: Record<string, string> = {};
    if (!leaveFormData.requestedDate) {
      errors.requestedDate = 'Requested Date is required';
    }
    if (leaveFormData.requestedOn && leaveFormData.requestedDate) {
      if (new Date(leaveFormData.requestedOn) > new Date(leaveFormData.requestedDate)) {
        errors.requestedOn = 'Requested On date cannot be later than Requested Date';
      }
    }

    setLeaveFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveApiError(null);
    setLeaveSuccessMessage(null);

    if (!validateLeaveForm()) return;

    const payload: Partial<Leave> = {
      leaveType: leaveFormData.leaveType,
      requestedDate: leaveFormData.requestedDate,
      requestedOn: leaveFormData.requestedOn,
      approvalStatus: leaveFormData.approvalStatus,
    };

    if (selectedLeave) {
      updateLeaveMutation.mutate(
        { id: selectedLeave.id, data: payload },
        {
          onSuccess: () => {
            setLeaveSuccessMessage('Leave record updated successfully.');
            setTimeout(() => {
              setIsLeaveModalOpen(false);
              setLeaveSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to update leave record.';
            setLeaveApiError(msg);
          },
        }
      );
    } else {
      if (!engineerId) return;
      createLeaveMutation.mutate(
        { engineerId, data: payload },
        {
          onSuccess: () => {
            setLeaveSuccessMessage('Leave record created successfully.');
            setTimeout(() => {
              setIsLeaveModalOpen(false);
              setLeaveSuccessMessage(null);
            }, 1000);
          },
          onError: (err: any) => {
            const msg = err.message || err.details?.detail || 'Failed to create leave record.';
            setLeaveApiError(msg);
          },
        }
      );
    }
  };

  const handleLeaveDelete = () => {
    if (!selectedLeave) return;
    setLeaveApiError(null);
    deleteLeaveMutation.mutate(selectedLeave.id, {
      onSuccess: () => {
        setIsLeaveDeleteModalOpen(false);
        setSelectedLeave(null);
        alert('Leave record deleted successfully.');
      },
      onError: (err: any) => {
        const msg = err.message || err.details?.detail || 'Failed to delete leave record.';
        setLeaveApiError(msg);
      },
    });
  };

  const calculateSkillExperience = (startDateStr?: string, endDateStr?: string): string => {
    if (!startDateStr) return 'N/A';
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return 'N/A';

    const end = endDateStr ? new Date(endDateStr) : new Date();
    if (isNaN(end.getTime())) return 'N/A';

    const diffTime = Math.max(0, end.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return `${diffDays} Day${diffDays === 1 ? '' : 's'}`;
    }

    const years = diffDays / 365.25;
    if (years < 1) {
      const months = Math.round(diffDays / 30.4375);
      return `${months} Month${months === 1 ? '' : 's'} (${diffDays} Days)`;
    }

    const roundedYears = (Math.round(years * 10) / 10).toFixed(1);
    return `${roundedYears} Year${parseFloat(roundedYears) === 1 ? '' : 's'} (${diffDays} Days)`;
  };

  const skillColumns: Column<Skill>[] = [
    { key: 'toolType', header: 'Tool Type', sortable: true },
    { key: 'fab', header: 'FAB / Facility', sortable: true },
    { key: 'waferSize', header: 'Wafer Size', sortable: true },
    { key: 'role', header: 'Role', sortable: true },
    { key: 'startDate', header: 'Start Date', sortable: true },
    { key: 'endDate', header: 'End Date', sortable: true, render: (s) => <span>{s.endDate || 'Ongoing'}</span> },
    {
      key: 'totalExperience',
      header: 'Total Experience',
      sortable: true,
      render: (s) => (
        <span className="font-semibold text-slate-800 dark:text-slate-50 px-2 py-0.5 rounded bg-sky-50 dark:bg-slate-800 border border-sky-200 dark:border-slate-700 text-xs">
          {calculateSkillExperience(s.startDate, s.endDate)}
        </span>
      ),
    },
    {
      key: 'numberOfTools',
      header: 'Tools Count',
      sortable: true,
      render: (s) => <span>{s.numberOfTools !== undefined ? s.numberOfTools : 'N/A'}</span>,
    },
    {
      key: 'readyForPrimaryRole',
      header: 'Primary Role Ready',
      render: (s) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.readyForPrimaryRole
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
            : 'bg-slate-100 text-slate-800 border-slate-200'
            }`}
        >
          {s.readyForPrimaryRole ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (s) => (
        (canEdit || isEngineerUser) ? (
          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenEditModal(s)}
              icon={<Edit className="w-3.5 h-3.5 text-blue-500" />}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenDeleteModal(s)}
              icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
            >
              Delete
            </Button>
          </div>
        ) : null
      ),
    },

  ];

  const scheduleColumns: Column<Schedule>[] = [
    {
      key: 'supportType',
      header: 'Support Type',
      sortable: true,
      render: (s) => {
        const isMissed = missedScheduleIds.has(s.id);
        return (
          <div className="flex items-center space-x-2">
            {isMissed && (
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-yellow-500 shadow-sm flex-shrink-0 animate-pulse" title="Missed Schedule Assignment" />
            )}
            <span>{s.supportType}</span>
          </div>
        );
      }
    },
    { key: 'country', header: 'Country', sortable: true },
    { key: 'fabCity', header: 'FAB City', sortable: true },
    { key: 'fabSite', header: 'FAB Site / Customer', sortable: true },
    { key: 'startDate', header: 'Start Date', sortable: true },
    { key: 'endDate', header: 'End Date', sortable: true, render: (s) => <span>{s.endDate || 'Ongoing'}</span> },
    {
      key: 'scheduleStatus',
      header: 'Status',
      sortable: true,
      render: (s) => {
        const colors: Record<string, string> = {
          Upcoming: 'bg-blue-100 text-blue-800 border-blue-200',
          Confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          Completed: 'bg-slate-100 text-slate-800 border-slate-200',
          Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
          Ongoing: 'bg-amber-100 text-amber-800 border-amber-200',
        };
        const getDynamicStatus = (startDate?: string, endDate?: string, dbStatus?: string) => {
          if (dbStatus === 'Cancelled') return 'Cancelled';
          const todayStr = new Date().toISOString().split('T')[0];
          if (!startDate) return dbStatus || 'Upcoming';
          if (todayStr >= startDate && (!endDate || todayStr <= endDate)) return 'Ongoing';
          if (endDate && todayStr > endDate) return 'Completed';
          if (todayStr < startDate) return 'Upcoming';
          return dbStatus || 'Upcoming';
        };
        const displayStatus = getDynamicStatus(s.startDate, s.endDate, s.scheduleStatus);
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${colors[displayStatus] || 'bg-slate-100 text-slate-800'}`}>
            {displayStatus}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (s) => (
        <div className="flex items-center space-x-2 justify-end" onClick={(e) => e.stopPropagation()}>
          {isEngineerUser && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenScheduleCommentModal(s)}
              icon={<MessageSquare className="w-3.5 h-3.5 text-indigo-500" />}
              title="Add or Edit Schedule Comment"
            >
              Comment
            </Button>
          )}

          {canEdit && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenEditScheduleModal(s)}
                icon={<Edit className="w-3.5 h-3.5 text-blue-500" />}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenDeleteScheduleModal(s)}
                icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      ),
    },

  ];

  const visaColumns: Column<Visa>[] = [
    { key: 'country', header: 'Country', sortable: true },
    { key: 'visaType', header: 'Visa / Permit Class', sortable: true },
    { key: 'appliedOn', header: 'Applied On', sortable: true, render: (v) => <span>{v.appliedOn || 'N/A'}</span> },
    { key: 'issueDate', header: 'Start Date', sortable: true, render: (v) => <span>{v.issueDate || 'N/A'}</span> },
    { key: 'expiryDate', header: 'Expiry Date', sortable: true, render: (v) => <span>{v.expiryDate || 'N/A'}</span> },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (v) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${v.status === 'Expiring Soon'
            ? 'bg-amber-100 text-amber-800 border-amber-200'
            : v.status === 'Expired'
              ? 'bg-rose-100 text-rose-800 border-rose-200'
              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
            }`}
        >
          {v.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (v) => (
        canEdit ? (
          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenEditVisaModal(v)}
              icon={<Edit className="w-3.5 h-3.5 text-blue-500" />}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenDeleteVisaModal(v)}
              icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
            >
              Delete
            </Button>
          </div>
        ) : null
      ),
    },
  ];

  const travelColumns: Column<Travel>[] = [
    { key: 'originCountry', header: 'Origin', sortable: true },
    { key: 'destinationCountry', header: 'Destination', sortable: true },
    { key: 'bookingDate', header: 'Booking Date', sortable: true, render: (t) => <span>{t.bookingDate || 'N/A'}</span> },
    { key: 'travelDate', header: 'Travel Date', sortable: true, render: (t) => <span>{t.travelDate || 'N/A'}</span> },
    { key: 'purpose', header: 'Purpose', sortable: true },
    { key: 'comments', header: 'Comments', render: (t) => <span className="text-xs text-slate-500 line-clamp-1">{t.comments || 'N/A'}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (t) => (
        canEdit ? (
          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenEditTravelModal(t)}
              icon={<Edit className="w-3.5 h-3.5 text-blue-500" />}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenDeleteTravelModal(t)}
              icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
            >
              Delete
            </Button>
          </div>
        ) : null
      ),
    },
  ];

  const perfColumns: Column<Performance>[] = [
    { key: 'rating', header: 'Rating Score', sortable: true, render: (p) => <span className="font-bold text-amber-500">★ {p.rating}</span> },
    { key: 'actualStartDate', header: 'Actual Start', sortable: true, render: (p) => <span>{p.actualStartDate || 'N/A'}</span> },
    { key: 'actualEndDate', header: 'Actual End', sortable: true, render: (p) => <span>{p.actualEndDate || 'N/A'}</span> },
    {
      key: 'escalation',
      header: 'Escalation',
      sortable: true,
      render: (p) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${p.escalation ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'}`}>
          {p.escalation ? 'Yes' : 'No'}
        </span>
      ),
    },
    { key: 'reviewer', header: 'Reviewer' },
    { key: 'notes', header: 'Feedback / Notes', render: (p) => <span className="text-xs text-slate-500 line-clamp-1">{p.notes || 'N/A'}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) => (
        canEdit ? (
          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenEditPerfModal(p)}
              icon={<Edit className="w-3.5 h-3.5 text-blue-500" />}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenDeletePerfModal(p)}
              icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
            >
              Delete
            </Button>
          </div>
        ) : null
      ),
    },
  ];

  const leaveColumns: Column<Leave>[] = [
    { key: 'leaveType', header: 'Leave Type', sortable: true, render: (l) => <span>{l.leaveType || l.type}</span> },
    { key: 'requestedDate', header: 'Requested Date', sortable: true, render: (l) => <span>{l.requestedDate || l.startDate || 'N/A'}</span> },
    { key: 'requestedOn', header: 'Requested On', sortable: true, render: (l) => <span>{l.requestedOn || 'N/A'}</span> },
    {
      key: 'approvalStatus',
      header: 'Approval Status',
      sortable: true,
      render: (l) => {
        const st = l.approvalStatus || l.status || 'Pending';
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${st === 'Approved'
              ? 'bg-emerald-100 text-emerald-800'
              : st === 'Rejected'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-amber-100 text-amber-800'
              }`}
          >
            {st}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (l) => (
        canEdit ? (
          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenEditLeaveModal(l)}
              icon={<Edit className="w-3.5 h-3.5 text-blue-500" />}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenDeleteLeaveModal(l)}
              icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
            >
              Delete
            </Button>
          </div>
        ) : null
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header Back Navigation */}
      {!isEngineerUser && (
        <div className="flex items-center space-x-3">
          <Button size="sm" variant="outline" onClick={() => navigate('/engineers')} icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Directory
          </Button>
          <span className="text-xs text-slate-400 font-mono">Profile Record: {engineer?.orbitId}</span>
        </div>
      )}

      {/* Reusable Profile Banner Header */}
      {engineer && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start md:items-center space-x-4">
              {engineer.avatarUrl ? (
                <img
                  src={engineer.avatarUrl}
                  alt={engineer.name}
                  className="w-16 h-16 rounded-2xl object-cover ring-4 ring-slate-100 dark:ring-slate-800 shadow-md flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold border border-sky-200 dark:border-sky-800/60 shadow-sm flex-shrink-0">
                  <User className="w-8 h-8 text-sky-600 dark:text-sky-400" />
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">{engineer.name}</h1>
                  <span className="text-xs text-slate-400">({engineer.goesBy})</span>
                  <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold bg-slate-100 dark:bg-slate-100 text-slate-700 dark:text-slate-300 font-mono">
                    {engineer.orbitId}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[var(--color-secondary)] flex items-center space-x-2">
                  <span>{engineer.level}</span>
                  <span>•</span>
                  <span>{engineer.primaryTool}</span>
                </p>
                <div className="flex items-center space-x-4 text-xs text-slate-500 pt-1">
                  <span className="flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{engineer.email || 'N/A'}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{engineer.phoneNumber || 'N/A'}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{engineer.country}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 self-end md:self-auto">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-800 text-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Customer Exp</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">{engineer.customerExperience} Yrs</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-800 text-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Exp</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">{engineer.yearsExperience} Yrs</p>
              </div>
              {(canEdit || isEngineerUser) && (
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsPhotoModalOpen(true)}
                    icon={<Camera className="w-3.5 h-3.5 text-sky-500" />}
                  >
                    Upload Photo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenEditEngineerModal}
                    icon={<Edit className="w-3.5 h-3.5 text-blue-500" />}
                  >
                    Edit Profile
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-0.5">
        {[
          { id: 'profile', label: 'Overview Profile', icon: User },
          { id: 'skills', label: 'Skill Matrix', icon: Wrench },
          { id: 'schedule', label: 'Schedule Roster', icon: Calendar },
          { id: 'travel', label: 'Travel Itineraries', icon: Plane },
          { id: 'visa', label: 'Visas & Permits', icon: FileCheck },
          { id: 'performance', label: 'Performance Evaluations', icon: TrendingUp },
          { id: 'leaves', label: 'Leaves & Absence', icon: Clock },
          { id: 'reports', label: 'Reports', icon: BarChart3 },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all duration-150 whitespace-nowrap ${isActive
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white bg-slate-50 dark:bg-slate-800/40 rounded-t-lg'
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
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-4 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-[var(--color-secondary)]" />
                <span>Assignment & Site Allocation</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 font-medium">Assigned Fab Site (Current Schedule)</span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {currentScheduleSite}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 font-medium">Join Date</span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {engineer.joinDate || 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 font-medium">Active Projects</span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {engineer.activeProjectsCount} Projects
                  </p>
                </div>
              </div>
            </div>





            {/* Schedule Comments & Roster Updates Card */}
            {!isEngineerUser && (
              <div className="md:col-span-2">
                <ScheduleCommentsCard
                  engineerId={engineerId}
                  engineerName={engineer?.name}
                  hideShowMore={true}
                  hideViewProfile={true}
                />
              </div>
            )}


            {/* Operational Intelligence & Exceptions summary for this engineer */}
            {!isEngineerUser && user?.role !== 'Viewer' && (

              <div className="md:col-span-2 p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-3">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Operational Attention Summary</span>
                </h3>

                {!engAlerts || engAlerts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                    No active operational warnings or exception alerts for {engineer.name}.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {engAlerts.map((alt) => (
                      <div
                        key={alt.id}
                        className={`p-3 rounded-lg border flex items-start space-x-2.5 ${alt.severity === 'warning'
                          ? 'bg-amber-50/20 dark:bg-amber-950/10 border-amber-200/40 dark:border-amber-900/20 text-slate-950 dark:text-white'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                          }`}
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-semibold">{alt.title}</p>
                          <p className="text-[11px] opacity-80">{alt.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

        {activeTab === 'skills' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Competency Skill-Matrix
              </h3>
              {(canEdit || isEngineerUser) && (
                <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAddModal}>
                  Add Skill
                </Button>
              )}

            </div>
            <Table
              columns={skillColumns}
              data={skills || []}
              emptyTitle="No Specific Skills Logged"
              emptyDescription="Click Add Skill to record equipment competency records for this engineer."
            />
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Operation Schedules
              </h3>
              {canEdit && (
                <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAddScheduleModal}>
                  Add Schedule
                </Button>
              )}
            </div>
            <Table
              columns={scheduleColumns}
              data={engineerSchedulesList}
              onRowClick={(s) => {
                if (missedScheduleIds.has(s.id)) {
                  navigate(`/missed-schedules?search=${s.id}`);
                }
              }}
              rowClassName={(s) => {
                const hasAlert = engAlerts?.some(alt => alt.schedule_id === s.id);
                return hasAlert
                  ? 'bg-yellow-50/85 dark:bg-yellow-950/20 hover:bg-yellow-100/90 dark:hover:bg-yellow-900/30 border-l-4 border-yellow-400'
                  : '';
              }}
              emptyTitle="No Schedule Assignments"
              emptyDescription="Click Add Schedule to record deployment roster assignments for this engineer."
            />
          </div>
        )}

        {activeTab === 'travel' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Travel Operations
              </h3>
              {canEdit && (
                <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAddTravelModal}>
                  Book Field Travel
                </Button>
              )}
            </div>
            <Table
              columns={travelColumns}
              data={travelRes?.data || []}
              emptyTitle="No Travel Records"
              emptyDescription="Click Book Field Travel to record itinerary details for this engineer."
            />
          </div>
        )}

        {activeTab === 'visa' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Visas & Permits
              </h3>
              {canEdit && (
                <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAddVisaModal}>
                  Add Visa Record
                </Button>
              )}
            </div>
            <Table
              columns={visaColumns}
              data={visaRes?.data || []}
              emptyTitle="No Visa Records Logged"
              emptyDescription="Click Add Visa Record to log a new jurisdiction permit for this engineer."
            />
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Performance Evaluation Records
              </h3>
              {canEdit && (
                <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAddPerfModal}>
                  Record Performance Evaluation
                </Button>
              )}
            </div>
            <Table
              columns={perfColumns}
              data={perfRes?.data || []}
              emptyTitle="No Performance Evaluations Logged"
              emptyDescription="Click Record Performance Evaluation to log a new schedule feedback for this engineer."
            />
          </div>
        )}

        {activeTab === 'leaves' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Leaves & Absence Records
              </h3>
              {canEdit && (
                <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAddLeaveModal}>
                  Request Leave
                </Button>
              )}
            </div>
            <Table
              columns={leaveColumns}
              data={leavesRes?.data || []}
              emptyTitle="No Leave Records Logged"
              emptyDescription="Click Request Leave to log a new absence record for this engineer."
            />
          </div>
        )}

        {activeTab === 'reports' && (
          <EngineerIndividualReportView engineerId={targetReportEngineerId} />
        )}

      {/* Add / Edit Skill Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setFormErrors({});
          setApiError(null);
          setSuccessMessage(null);
        }}
        title={selectedSkill ? 'Edit Skill Record' : 'Add Skill Record'}
        subtitle={selectedSkill ? 'Modify tool chamber certification details.' : 'Log a new semiconductor equipment competency record.'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {apiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {apiError}
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs">
              {successMessage}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              required
            />
            <TextInput
              label="FAB / Facility"
              value={formData.fab}
              onChange={(e) => setFormData({ ...formData, fab: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Dropdown
              label="Wafer Size"
              value={formData.waferSize}
              onChange={(e) => setFormData({ ...formData, waferSize: e.target.value })}
              options={['300mm', '200mm', '150mm']}
            />
            <Dropdown
              label="Tool Type / Chamber"
              value={formData.toolType}
              onChange={(e) => setFormData({ ...formData, toolType: e.target.value })}
              options={['Etch', 'Deposition', 'Clean', 'Metrology', 'Ion Implantation', 'Lithography']}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Start Date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            <DatePicker
              label="End Date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              error={formErrors.endDate}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Number of Tools"
              type="number"
              value={formData.numberOfTools}
              onChange={(e) => setFormData({ ...formData, numberOfTools: e.target.value })}
              error={formErrors.numberOfTools}
            />
            <TextInput
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            />
          </div>

          <div className="space-y-2.5 pt-2">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.previousProcessStartup}
                onChange={(e) => setFormData({ ...formData, previousProcessStartup: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-[var(--color-secondary)] focus:ring-[var(--color-secondary)]"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Previous Process Startup Experience</span>
            </label>

            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.previousCmPm}
                onChange={(e) => setFormData({ ...formData, previousCmPm: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-[var(--color-secondary)] focus:ring-[var(--color-secondary)]"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Previous CM/PM Experience</span>
            </label>

            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.readyForPrimaryRole}
                onChange={(e) => setFormData({ ...formData, readyForPrimaryRole: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-[var(--color-secondary)] focus:ring-[var(--color-secondary)]"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Ready for Primary Role</span>
            </label>
          </div>

          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Comments / Notes
            </label>
            <textarea
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              className="w-full rounded-lg border bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3.5 py-2 transition-colors duration-150 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent min-h-[80px]"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createSkillMutation.isPending || updateSkillMutation.isPending}
            >
              {createSkillMutation.isPending || updateSkillMutation.isPending
                ? (selectedSkill ? 'Saving...' : 'Creating...')
                : (selectedSkill ? 'Save Changes' : 'Create Skill')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal for Skill */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setApiError(null);
        }}
        title="Delete Skill Record"
        subtitle="Confirm deletion of equipment competency record."
      >
        <div className="space-y-4">
          {apiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {apiError}
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete this skill record for <strong className="text-slate-800 dark:text-slate-100">{selectedSkill?.toolType}</strong> at {selectedSkill?.fab}? This action cannot be undone.
          </p>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setApiError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              loading={deleteSkillMutation.isPending}
            >
              {deleteSkillMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Schedule Modal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setScheduleFormErrors({});
          setScheduleApiError(null);
          setScheduleSuccessMessage(null);
        }}
        title={selectedSchedule ? 'Edit Schedule Assignment' : 'Add Schedule Assignment'}
        subtitle={selectedSchedule ? 'Modify roster and support details.' : 'Create a new fab field support schedule.'}
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {scheduleApiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {scheduleApiError}
            </div>
          )}
          {scheduleSuccessMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs">
              {scheduleSuccessMessage}
            </div>
          )}

          <TextInput
            label="Support Type"
            value={scheduleFormData.supportType}
            onChange={(e) => setScheduleFormData({ ...scheduleFormData, supportType: e.target.value })}
            error={scheduleFormErrors.supportType}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Country"
              value={scheduleFormData.country}
              onChange={(e) => setScheduleFormData({ ...scheduleFormData, country: e.target.value })}
              error={scheduleFormErrors.country}
              required
            />
            <TextInput
              label="FAB City"
              value={scheduleFormData.fabCity}
              onChange={(e) => setScheduleFormData({ ...scheduleFormData, fabCity: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="FAB Site / Customer"
              value={scheduleFormData.fabSite}
              onChange={(e) => setScheduleFormData({ ...scheduleFormData, fabSite: e.target.value })}
            />
            <Dropdown
              label="Status"
              value={scheduleFormData.scheduleStatus}
              onChange={(e) => setScheduleFormData({ ...scheduleFormData, scheduleStatus: e.target.value })}
              options={['Upcoming', 'Confirmed', 'Completed', 'Cancelled']}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Start Date"
              value={scheduleFormData.startDate}
              onChange={(e) => setScheduleFormData({ ...scheduleFormData, startDate: e.target.value })}
              error={scheduleFormErrors.startDate}
              required
            />
            <DatePicker
              label="End Date"
              value={scheduleFormData.endDate}
              onChange={(e) => setScheduleFormData({ ...scheduleFormData, endDate: e.target.value })}
              error={scheduleFormErrors.endDate}
            />
          </div>

          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Remarks / Comments
            </label>
            <textarea
              value={scheduleFormData.remarks}
              onChange={(e) => setScheduleFormData({ ...scheduleFormData, remarks: e.target.value })}
              className="w-full rounded-lg border bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3.5 py-2 transition-colors duration-150 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent min-h-[80px]"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsScheduleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createScheduleMutation.isPending || updateScheduleMutation.isPending}
            >
              {createScheduleMutation.isPending || updateScheduleMutation.isPending
                ? (selectedSchedule ? 'Saving...' : 'Creating...')
                : (selectedSchedule ? 'Save Changes' : 'Create Schedule')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal for Schedule */}
      <Modal
        isOpen={isScheduleDeleteModalOpen}
        onClose={() => {
          setIsScheduleDeleteModalOpen(false);
          setScheduleApiError(null);
        }}
        title="Delete Schedule Assignment"
        subtitle="Confirm deletion of roster assignment."
      >
        <div className="space-y-4">
          {scheduleApiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {scheduleApiError}
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete the schedule support assignment <strong className="text-slate-800 dark:text-slate-100">{selectedSchedule?.supportType}</strong> at {selectedSchedule?.fabSite}? This action cannot be undone.
          </p>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsScheduleDeleteModalOpen(false);
                setScheduleApiError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleScheduleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              loading={deleteScheduleMutation.isPending}
            >
              {deleteScheduleMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Visa Modal */}
      <Modal
        isOpen={isVisaModalOpen}
        onClose={() => {
          setIsVisaModalOpen(false);
          setVisaFormErrors({});
          setVisaApiError(null);
          setVisaSuccessMessage(null);
        }}
        title={selectedVisa ? 'Edit Visa Record' : 'Add Visa Record'}
        subtitle={selectedVisa ? 'Modify permit details.' : 'Create a new visa jurisdiction permit record.'}
      >
        <form onSubmit={handleVisaSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {visaApiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {visaApiError}
            </div>
          )}
          {visaSuccessMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs">
              {visaSuccessMessage}
            </div>
          )}

          <TextInput
            label="Country"
            value={visaFormData.country}
            onChange={(e) => setVisaFormData({ ...visaFormData, country: e.target.value })}
            error={visaFormErrors.country}
            required
          />

          <TextInput
            label="Visa / Permit Class"
            value={visaFormData.visaType}
            onChange={(e) => setVisaFormData({ ...visaFormData, visaType: e.target.value })}
          />

          <DatePicker
            label="Applied On"
            value={visaFormData.appliedOn}
            onChange={(e) => setVisaFormData({ ...visaFormData, appliedOn: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Start Date"
              value={visaFormData.issueDate}
              onChange={(e) => setVisaFormData({ ...visaFormData, issueDate: e.target.value })}
            />
            <DatePicker
              label="Expiry Date"
              value={visaFormData.expiryDate}
              onChange={(e) => setVisaFormData({ ...visaFormData, expiryDate: e.target.value })}
              error={visaFormErrors.expiryDate}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsVisaModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createVisaMutation.isPending || updateVisaMutation.isPending}
            >
              {createVisaMutation.isPending || updateVisaMutation.isPending
                ? (selectedVisa ? 'Saving...' : 'Creating...')
                : (selectedVisa ? 'Save Changes' : 'Create Visa')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal for Visa */}
      <Modal
        isOpen={isVisaDeleteModalOpen}
        onClose={() => {
          setIsVisaDeleteModalOpen(false);
          setVisaApiError(null);
        }}
        title="Delete Visa Record"
        subtitle="Confirm deletion of permit record."
      >
        <div className="space-y-4">
          {visaApiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {visaApiError}
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete the visa permit record for <strong className="text-slate-800 dark:text-slate-100">{selectedVisa?.visaType}</strong> to {selectedVisa?.country}? This action cannot be undone.
          </p>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsVisaDeleteModalOpen(false);
                setVisaApiError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleVisaDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              loading={deleteVisaMutation.isPending}
            >
              {deleteVisaMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Travel Modal */}
      <Modal
        isOpen={isTravelModalOpen}
        onClose={() => {
          setIsTravelModalOpen(false);
          setTravelFormErrors({});
          setTravelApiError(null);
          setTravelSuccessMessage(null);
        }}
        title={selectedTravel ? 'Edit Travel Arrangement' : 'Book Field Travel'}
        subtitle={selectedTravel ? 'Modify travel itinerary details.' : 'Book a new travel arrangement for this engineer.'}
      >
        <form onSubmit={handleTravelSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {travelApiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {travelApiError}
            </div>
          )}
          {travelSuccessMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs">
              {travelSuccessMessage}
            </div>
          )}

          {!selectedTravel && (
            <SearchableDropdown
              label="Schedule Assignment"
              value={travelFormData.scheduleId}
              onChange={(val) => setTravelFormData({ ...travelFormData, scheduleId: val })}
              options={engineerSchedulesList.map((sch) => ({
                value: sch.id,
                label: `${sch.engineerName || engineer?.name || 'Engineer'} | ${sch.fabSite || sch.siteLocation || sch.country || 'Site'} (${sch.startDate || 'N/A'} - ${sch.endDate || 'N/A'})`,
              }))}
              placeholder="Select a schedule assignment..."
              searchPlaceholder="Search location, dates..."
              required
              error={travelFormErrors.scheduleId}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Booking Date"
              value={travelFormData.bookingDate}
              onChange={(e) => setTravelFormData({ ...travelFormData, bookingDate: e.target.value })}
            />
            <DatePicker
              label="Travel Date"
              value={travelFormData.travelDate}
              onChange={(e) => setTravelFormData({ ...travelFormData, travelDate: e.target.value })}
              error={travelFormErrors.travelDate}
            />
          </div>

          <TextInput
            label="Purpose"
            value={travelFormData.purpose}
            onChange={(e) => setTravelFormData({ ...travelFormData, purpose: e.target.value })}
          />

          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Comments / Notes
            </label>
            <textarea
              value={travelFormData.comments}
              onChange={(e) => setTravelFormData({ ...travelFormData, comments: e.target.value })}
              className="w-full rounded-lg border bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3.5 py-2 transition-colors duration-150 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent min-h-[80px]"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTravelModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createTravelMutation.isPending || updateTravelMutation.isPending}
            >
              {createTravelMutation.isPending || updateTravelMutation.isPending
                ? (selectedTravel ? 'Saving...' : 'Booking...')
                : (selectedTravel ? 'Save Changes' : 'Book Travel')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal for Travel */}
      <Modal
        isOpen={isTravelDeleteModalOpen}
        onClose={() => {
          setIsTravelDeleteModalOpen(false);
          setTravelApiError(null);
        }}
        title="Delete Travel Arrangement"
        subtitle="Confirm deletion of travel itinerary."
      >
        <div className="space-y-4">
          {travelApiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {travelApiError}
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete this travel arrangement? This action cannot be undone.
          </p>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsTravelDeleteModalOpen(false);
                setTravelApiError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleTravelDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              loading={deleteTravelMutation.isPending}
            >
              {deleteTravelMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Performance Modal */}
      <Modal
        isOpen={isPerfModalOpen}
        onClose={() => {
          setIsPerfModalOpen(false);
          setPerfFormErrors({});
          setPerfApiError(null);
          setPerfSuccessMessage(null);
        }}
        title={selectedPerf ? 'Edit Performance Evaluation' : 'Record Performance Evaluation'}
        subtitle={selectedPerf ? 'Modify logged feedback and rating score.' : 'Record a new performance evaluation for this engineer.'}
      >
        <form onSubmit={handlePerfSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {perfApiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {perfApiError}
            </div>
          )}
          {perfSuccessMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs">
              {perfSuccessMessage}
            </div>
          )}

          {!selectedPerf && (
            <div className="w-full flex flex-col space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Schedule Assignment
              </label>
              <select
                value={perfFormData.scheduleId}
                onChange={(e) => setPerfFormData({ ...perfFormData, scheduleId: e.target.value })}
                className="w-full rounded-lg border bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 px-3.5 py-2 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                required
              >
                <option value="" disabled>Select a schedule assignment...</option>
                {schedulesRes?.data?.map((sch) => (
                  <option key={sch.id} value={sch.id}>
                    {sch.supportType} ({sch.fabSite} - {sch.country})
                  </option>
                ))}
              </select>
              {perfFormErrors.scheduleId && (
                <span className="text-xs text-rose-500">{perfFormErrors.scheduleId}</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Actual Start Date"
              value={perfFormData.actualStartDate}
              onChange={(e) => setPerfFormData({ ...perfFormData, actualStartDate: e.target.value })}
            />
            <DatePicker
              label="Actual End Date"
              value={perfFormData.actualEndDate}
              onChange={(e) => setPerfFormData({ ...perfFormData, actualEndDate: e.target.value })}
              error={perfFormErrors.actualEndDate}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Score (1.0 - 5.0)"
              value={perfFormData.score}
              onChange={(e) => setPerfFormData({ ...perfFormData, score: e.target.value })}
              error={perfFormErrors.score}
              required
            />
            <TextInput
              label="Attachment URL"
              value={perfFormData.attachment}
              onChange={(e) => setPerfFormData({ ...perfFormData, attachment: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-2 py-2">
            <input
              type="checkbox"
              id="perf-escalation"
              checked={perfFormData.escalation}
              onChange={(e) => setPerfFormData({ ...perfFormData, escalation: e.target.checked })}
              className="rounded text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
            />
            <label htmlFor="perf-escalation" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Customer Escalation Initiated
            </label>
          </div>

          {perfFormData.escalation && (
            <TextInput
              label="Escalation Reason"
              value={perfFormData.escalationReason}
              onChange={(e) => setPerfFormData({ ...perfFormData, escalationReason: e.target.value })}
              error={perfFormErrors.escalationReason}
              placeholder="Detail reasons for customer escalation..."
              required
            />
          )}

          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Feedback / Notes
            </label>
            <textarea
              value={perfFormData.feedback}
              onChange={(e) => setPerfFormData({ ...perfFormData, feedback: e.target.value })}
              className="w-full rounded-lg border bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 px-3.5 py-2 transition-colors duration-150 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent min-h-[80px]"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPerfModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createPerfMutation.isPending || updatePerfMutation.isPending}
            >
              {createPerfMutation.isPending || updatePerfMutation.isPending
                ? (selectedPerf ? 'Saving...' : 'Recording...')
                : (selectedPerf ? 'Save Changes' : 'Record Evaluation')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal for Performance */}
      <Modal
        isOpen={isPerfDeleteModalOpen}
        onClose={() => {
          setIsPerfDeleteModalOpen(false);
          setPerfApiError(null);
        }}
        title="Delete Performance Evaluation"
        subtitle="Confirm deletion of evaluation record."
      >
        <div className="space-y-4">
          {perfApiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {perfApiError}
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete this performance record? This action cannot be undone.
          </p>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPerfDeleteModalOpen(false);
                setPerfApiError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handlePerfDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              loading={deletePerfMutation.isPending}
            >
              {deletePerfMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Leave Modal */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => {
          setIsLeaveModalOpen(false);
          setLeaveFormErrors({});
          setLeaveApiError(null);
          setLeaveSuccessMessage(null);
        }}
        title={selectedLeave ? 'Edit Leave Record' : 'Request Leave'}
        subtitle={selectedLeave ? 'Modify leave request details.' : 'Submit a new leave request for this engineer.'}
      >
        <form onSubmit={handleLeaveSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {leaveApiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {leaveApiError}
            </div>
          )}
          {leaveSuccessMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs">
              {leaveSuccessMessage}
            </div>
          )}

          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Leave Type
            </label>
            <Dropdown
              value={leaveFormData.leaveType}
              onChange={(e) => setLeaveFormData({ ...leaveFormData, leaveType: e.target.value })}
              options={['Annual Leave', 'Sick Leave', 'Training', 'Emergency', 'Personal Leave', 'Others']}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Requested Date (Absence Date)"
              value={leaveFormData.requestedDate}
              onChange={(e) => setLeaveFormData({ ...leaveFormData, requestedDate: e.target.value })}
              error={leaveFormErrors.requestedDate}
              required
            />
            <DatePicker
              label="Requested On (Submission Date)"
              value={leaveFormData.requestedOn}
              onChange={(e) => setLeaveFormData({ ...leaveFormData, requestedOn: e.target.value })}
              error={leaveFormErrors.requestedOn}
            />
          </div>

          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Approval Status
            </label>
            <Dropdown
              value={leaveFormData.approvalStatus}
              onChange={(e) => setLeaveFormData({ ...leaveFormData, approvalStatus: e.target.value })}
              options={['Pending', 'Approved', 'Rejected', 'Cancelled']}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsLeaveModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createLeaveMutation.isPending || updateLeaveMutation.isPending}
            >
              {createLeaveMutation.isPending || updateLeaveMutation.isPending
                ? (selectedLeave ? 'Saving...' : 'Submitting...')
                : (selectedLeave ? 'Save Changes' : 'Submit Leave Request')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal for Leave */}
      <Modal
        isOpen={isLeaveDeleteModalOpen}
        onClose={() => {
          setIsLeaveDeleteModalOpen(false);
          setLeaveApiError(null);
        }}
        title="Delete Leave Record"
        subtitle="Confirm deletion of absence request."
      >
        <div className="space-y-4">
          {leaveApiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {leaveApiError}
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete this leave record? This action cannot be undone.
          </p>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsLeaveDeleteModalOpen(false);
                setLeaveApiError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleLeaveDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              loading={deleteLeaveMutation.isPending}
            >
              {deleteLeaveMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
      {/* Edit Engineer Profile Modal */}
      <Modal
        isOpen={isEditEngineerModalOpen}
        onClose={() => {
          setIsEditEngineerModalOpen(false);
          setEngineerFormErrors({});
          setEngineerApiError(null);
          setEngineerSuccessMessage(null);
        }}
        title="Edit Engineer Profile"
        subtitle="Update field engineer profile and competency attributes."
      >
        <form onSubmit={handleUpdateEngineerSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {engineerApiError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {engineerApiError}
            </div>
          )}
          {engineerSuccessMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs">
              {engineerSuccessMessage}
            </div>
          )}

          <TextInput
            label="Engineer Name"
            value={engineerFormData.name}
            onChange={(e) => setEngineerFormData({ ...engineerFormData, name: e.target.value })}
            error={engineerFormErrors.name}
            disabled={isEngineerUser}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Goes By"
              value={engineerFormData.goesBy}
              onChange={(e) => setEngineerFormData({ ...engineerFormData, goesBy: e.target.value })}
              disabled={isEngineerUser}
            />
            <TextInput
              label="Customer ID"
              value={engineerFormData.customerId}
              onChange={(e) => setEngineerFormData({ ...engineerFormData, customerId: e.target.value })}
              disabled={isEngineerUser}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Orbit ID"
              value={engineerFormData.orbitId}
              onChange={(e) => setEngineerFormData({ ...engineerFormData, orbitId: e.target.value })}
              error={engineerFormErrors.orbitId}
              disabled={isEngineerUser}
              required
            />
            <Dropdown
              label="Competency Level"
              value={engineerFormData.level}
              onChange={(e) => setEngineerFormData({ ...engineerFormData, level: e.target.value })}
              options={['L1 Junior', 'L2 Specialist', 'L3 Senior', 'L4 Master', 'L5 Principal Expert']}
              disabled={isEngineerUser}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <TextInput
              label="Email Address"
              type="email"
              value={engineerFormData.email}
              onChange={(e) => setEngineerFormData({ ...engineerFormData, email: e.target.value })}
              error={engineerFormErrors.email}
              helperText={isEngineerUser ? "You can update your personal contact email" : undefined}
            />
            <TextInput
              label="Phone Number"
              value={engineerFormData.phoneNumber}
              onChange={(e) => setEngineerFormData({ ...engineerFormData, phoneNumber: e.target.value })}
              error={engineerFormErrors.phoneNumber}
              helperText={isEngineerUser ? "You can update your personal contact phone" : undefined}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Country Location"
              value={engineerFormData.country}
              disabled
              helperText="Automatically set by latest schedule's country"
            />
            <TextInput
              label="City Location"
              value={engineerFormData.city}
              disabled
              helperText="Automatically set by latest schedule's city"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Date of Joining"
              value={engineerFormData.joinDate}
              onChange={(e) => setEngineerFormData({ ...engineerFormData, joinDate: e.target.value })}
              disabled={isEngineerUser}
            />
            <Dropdown
              label="Primary Tool / Chamber"
              value={engineerFormData.primaryTool}
              onChange={(e) => setEngineerFormData({ ...engineerFormData, primaryTool: e.target.value })}
              options={['Etch', 'SENSAI', 'Kiyo', 'Purion', 'ALTUS', 'CVD', 'ALD']}
              disabled={isEngineerUser}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Customer Experience (Yrs)"
              type="number"
              step="0.1"
              value={engineerFormData.customerExperience}
              onChange={(e) => setEngineerFormData({ ...engineerFormData, customerExperience: e.target.value })}
              disabled={isEngineerUser}
            />
            <TextInput
              label="Industry Experience (Yrs)"
              type="number"
              step="0.1"
              value={engineerFormData.yearsExperience}
              onChange={(e) => setEngineerFormData({ ...engineerFormData, yearsExperience: e.target.value })}
              disabled={isEngineerUser}
            />
          </div>

          <Dropdown
            label="Operational Status"
            value={engineerFormData.status}
            onChange={(e) => setEngineerFormData({ ...engineerFormData, status: e.target.value })}
            options={['Active', 'Deployed', 'On Leave', 'In Transit', 'Training']}
            disabled={isEngineerUser}
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditEngineerModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={updateEngineerMutation.isPending}
            >
              {updateEngineerMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Certifications & Compliance Modal */}
      <Modal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        title="Manage Certifications & Compliance Status"
        subtitle={`Update certified clearances and compliance permits for ${engineer.name}.`}
      >
        <form onSubmit={handleUpdateCertificationsSubmit} className="space-y-4">
          <TextInput
            label="Valid Certifications Count"
            type="number"
            value={String(certFormData.certificationsCount)}
            onChange={(e) => setCertFormData({ ...certFormData, certificationsCount: Number(e.target.value) })}
            required
          />

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Compliance Clearance Items
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <TextInput
                  label="Primary Certification Name"
                  value={certFormData.cert1Name}
                  onChange={(e) => setCertFormData({ ...certFormData, cert1Name: e.target.value })}
                />
              </div>
              <Dropdown
                label="Status"
                value={certFormData.cert1Status}
                onChange={(e) => setCertFormData({ ...certFormData, cert1Status: e.target.value })}
                options={['Valid', 'Expiring Soon', 'Pending Renewal', 'Expired']}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <TextInput
                  label="Secondary Certification Name"
                  value={certFormData.cert2Name}
                  onChange={(e) => setCertFormData({ ...certFormData, cert2Name: e.target.value })}
                />
              </div>
              <Dropdown
                label="Status"
                value={certFormData.cert2Status}
                onChange={(e) => setCertFormData({ ...certFormData, cert2Status: e.target.value })}
                options={['Valid', 'Expiring Soon', 'Pending Renewal', 'Expired']}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <TextInput
                  label="Safety Permit Name"
                  value={certFormData.cert3Name}
                  onChange={(e) => setCertFormData({ ...certFormData, cert3Name: e.target.value })}
                />
              </div>
              <Dropdown
                label="Status"
                value={certFormData.cert3Status}
                onChange={(e) => setCertFormData({ ...certFormData, cert3Status: e.target.value })}
                options={['Valid', 'Expiring Soon', 'Pending Renewal', 'Expired']}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCertModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={updateEngineerMutation.isPending}>
              {updateEngineerMutation.isPending ? 'Saving...' : 'Save Compliance Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Schedule Comment Modal */}

      <Modal
        isOpen={isScheduleCommentModalOpen}
        onClose={() => setIsScheduleCommentModalOpen(false)}
        title="Schedule Remarks & Comments"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Add or edit operational comments for assignment: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedScheduleForComment?.supportType} ({selectedScheduleForComment?.fabSite || selectedScheduleForComment?.country})</span>
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Comments / Remarks
            </label>
            <textarea
              rows={4}
              value={scheduleRemarksInput}
              onChange={(e) => setScheduleRemarksInput(e.target.value)}
              placeholder="Enter schedule status updates, transit notes, or customer site comments..."
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsScheduleCommentModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveScheduleComment} loading={updateScheduleCommentsMutation.isPending || updateScheduleMutation.isPending}>
              Save Comment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Performance Modal */}
      <AddPerformanceModal
        isOpen={isAddPerfModalOpen}
        onClose={() => setIsAddPerfModalOpen(false)}
        schedulesList={engineerSchedulesList}
        engineerName={engineer?.name}
        orbitId={engineer?.orbitId}
        onSuccess={() => refetch()}
        onEditExisting={() => navigate('/performance')}
      />

      {/* Upload Profile Photo Modal */}
      <EngineerPhotoUploadModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        engineerId={engineer?.id || ''}
        engineerName={engineer?.name}
        orbitId={engineer?.orbitId}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

