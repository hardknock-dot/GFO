import api from './axios';
import type { Engineer, Schedule, Skill, Visa, Performance, EngineerReportSummary } from '../types';

const mapApiEngineerToFrontend = (apiEng: any): Engineer => {
  return {
    id: apiEng.engineer_id,
    orbitId: apiEng.orbit_id,
    customerId: apiEng.lam_id || apiEng.employee_id || '',
    name: apiEng.engineer_name,
    goesBy: apiEng.goes_by || '',
    email: apiEng.email || null,
    phoneNumber: apiEng.phone_number || null,
    status: apiEng.status || 'Active',
    primaryTool: apiEng.primary_tool_type || apiEng.primary_tool || '',
    level: apiEng.level || 'L2 Specialist',
    country: apiEng.country || '',
    city: apiEng.city || '',
    assignedSite: apiEng.assigned_site || '',
    yearsExperience: Number(apiEng.industry_experience) || 0,
    customerExperience: Number(apiEng.customer_experience) || Number(apiEng.lam_experience) || 0,
    certificationsCount: apiEng.certifications_count || 0,
    activeProjectsCount: apiEng.active_projects_count || 0,
    avatarUrl: apiEng.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
    joinDate: apiEng.date_of_joining || '',
  };
};

const mapApiScheduleToFrontend = (item: any): Schedule => {
  return {
    id: item.schedule_id,
    engineerId: item.engineer_id,
    engineerName: item.engineer_name || '',
    customerName: item.fab_site || 'Customer Site',
    siteLocation: item.fab_city || item.country || '',
    country: item.country || '',
    projectCode: item.support_type || 'STANDARD',
    startDate: item.start_date || '',
    endDate: item.end_date || '',
    status: (item.schedule_status as any) || 'Upcoming',
    shiftType: 'Day Shift',
    supportType: item.support_type,
    fabCity: item.fab_city,
    fabSite: item.fab_site,
    scheduleStatus: item.schedule_status,
    remarks: item.remarks || '',
    commentStatus: item.comment_status || 'UNADDRESSED',
    ownerId: item.owner_id,
    owner_id: item.owner_id
  };
};

const mapApiSkillToFrontend = (item: any): Skill => {
  return {
    id: item.skill_id,
    engineerId: item.engineer_id,
    toolModel: item.tool_type || item.primary_tool || 'Etch System',
    category: item.category || 'Etch',
    competencyLevel: item.role === 'Primary' ? 'L3 Senior' : 'L2 Specialist',
    certified: item.ready_for_primary_role || false,
    lastAssessedDate: item.updated_at || item.created_at || '',
    country: item.country || '',
    fab: item.fab || '',
    waferSize: item.wafer_size || '',
    toolType: item.tool_type || '',
    startDate: item.start_date || '',
    endDate: item.end_date || '',
    numberOfTools: item.number_of_tools || 1,
    role: item.role || 'Primary',
    readyForPrimaryRole: item.ready_for_primary_role || false,
    comments: item.comments || '',
  };
};

const mapApiVisaToFrontend = (item: any): Visa => {
  return {
    id: item.visa_id,
    engineerId: item.engineer_id,
    engineerName: item.engineer_name || '',
    country: item.country || '',
    visaType: item.visa_type || '',
    passportNumber: 'N/A',
    issueDate: item.visa_start_date || item.applied_on || '',
    expiryDate: item.visa_end_date || '',
    daysUntilExpiry: item.visa_end_date ? Math.ceil((new Date(item.visa_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
    status: item.visa_end_date && new Date(item.visa_end_date) < new Date() ? 'Expired' : 'Valid',
    appliedOn: item.applied_on || '',
    visaStartDate: item.visa_start_date || '',
    visaEndDate: item.visa_end_date || '',
    comments: item.comments || '',
    commentStatus: item.comment_status || 'UNADDRESSED',
    ownerId: item.owner_id,
    owner_id: item.owner_id,
  };
};

const mapApiPerformanceToFrontend = (item: any): Performance => {
  return {
    id: item.performance_id,
    engineerId: item.engineer_id || '',
    engineerName: item.engineer_name || '',
    rating: item.score ? Math.round(item.score / 20) : 4,
    projectsCompleted: 1,
    customerFeedbackScore: item.score || 90,
    onTimeArrivalRate: 100,
    reviewDate: item.actual_end_date || item.created_at || '',
    reviewer: 'Manager',
    notes: item.feedback || '',
    actualStartDate: item.actual_start_date,
    actualEndDate: item.actual_end_date,
    escalation: item.escalation || false,
    escalationReason: item.escalation_reason || '',
    feedback: item.feedback || '',
    score: item.score || 0,
    attachment: item.attachment || '',
    scheduleId: item.schedule_id,
  };
};

export const getEngineerMe = async (): Promise<Engineer> => {
  const res = await api.get('/engineer/me');
  return mapApiEngineerToFrontend(res.data);
};

export const getEngineerMeSchedules = async (): Promise<Schedule[]> => {
  const res = await api.get('/engineer/me/schedules');
  return (res.data || []).map(mapApiScheduleToFrontend);
};

export const getEngineerMeNextSchedule = async (): Promise<Schedule | null> => {
  const res = await api.get('/engineer/me/schedules/next');
  return res.data ? mapApiScheduleToFrontend(res.data) : null;
};

export const updateScheduleComments = async (scheduleId: string, remarks: string): Promise<Schedule> => {
  const res = await api.patch(`/engineer/me/schedules/${scheduleId}/comments`, { remarks });
  return mapApiScheduleToFrontend(res.data);
};

export const getEngineerMeSkills = async (): Promise<Skill[]> => {
  const res = await api.get('/engineer/me/skills');
  return (res.data || []).map(mapApiSkillToFrontend);
};

export const createEngineerSkill = async (data: Partial<Skill>): Promise<Skill> => {
  const payload = {
    country: data.country || 'Taiwan',
    fab: data.fab || 'Fab 18',
    wafer_size: data.waferSize || '300mm',
    tool_type: data.toolType || data.toolModel || 'Etch',
    role: data.role || 'Primary',
    number_of_tools: data.numberOfTools || 1,
    start_date: data.startDate || null,
    end_date: data.endDate || null,
    ready_for_primary_role: data.readyForPrimaryRole || false,
    previous_process_startup: data.previousProcessStartup || false,
    previous_cm_pm: data.previousCmPm || false,
    comments: data.comments || '',
  };
  const res = await api.post('/engineer/me/skills', payload);
  return mapApiSkillToFrontend(res.data);
};

export const updateEngineerSkill = async (skillId: string, data: Partial<Skill>): Promise<Skill> => {
  const payload = {
    country: data.country,
    fab: data.fab,
    wafer_size: data.waferSize,
    tool_type: data.toolType || data.toolModel,
    role: data.role,
    number_of_tools: data.numberOfTools,
    start_date: data.startDate,
    end_date: data.endDate,
    ready_for_primary_role: data.readyForPrimaryRole,
    previous_process_startup: data.previousProcessStartup,
    previous_cm_pm: data.previousCmPm,
    comments: data.comments,
  };
  const res = await api.put(`/engineer/me/skills/${skillId}`, payload);
  return mapApiSkillToFrontend(res.data);
};

export const deleteEngineerSkill = async (skillId: string): Promise<void> => {
  await api.delete(`/engineer/me/skills/${skillId}`);
};


export const getEngineerMeVisa = async (): Promise<Visa[]> => {
  const res = await api.get('/engineer/me/visa');
  return (res.data || []).map(mapApiVisaToFrontend);
};

export const updateVisaComments = async (visaId: string, comments: string): Promise<Visa> => {
  const res = await api.patch(`/engineer/me/visa/${visaId}/comments`, { comments });
  return mapApiVisaToFrontend(res.data);
};

export const getEngineerMePerformance = async (): Promise<Performance[]> => {
  const res = await api.get('/engineer/me/performance');
  return (res.data || []).map(mapApiPerformanceToFrontend);
};

export const getEngineerMeReportSummary = async (): Promise<EngineerReportSummary> => {
  const res = await api.get('/engineer/me/reports/summary');
  return res.data;
};

export const createEngineerMeLeave = async (data: { leave_type: string; requested_date: string; comments?: string }) => {
  const res = await api.post('/engineer/me/leaves', data);
  return res.data;
};

