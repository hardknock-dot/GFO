import api from './axios';
import type { MissedSchedule } from '../types';
import type { PaginatedResponse } from './engineers';
import { getEngineerById, resolveEngineerName, resolveEngineerOrbitId } from './engineers';

const mapApiMissedScheduleToFrontend = (apiMs: any, engineerName?: string, orbitId?: string, engineerId?: string): MissedSchedule => {
  const engId = engineerId || apiMs.engineer_id;
  const resolvedName = resolveEngineerName(engId, orbitId || apiMs.orbit_id, engineerName || apiMs.engineer_name);
  const resolvedOrbit = resolveEngineerOrbitId(engId, orbitId || apiMs.orbit_id);

  return {
    id: apiMs.missed_schedule_id,
    engineerId: engId || 'eng-e150',
    engineerName: resolvedName,
    engineerOrbitId: resolvedOrbit,
    requestedStartDate: apiMs.requested_start_date || '',
    requestedEndDate: apiMs.requested_end_date || '',
    actualStartDate: apiMs.actual_start_date || '',
    actualEndDate: apiMs.actual_end_date || '',
    reasonForChange: apiMs.reason || 'Change request',
    notesAttachEvidence: apiMs.evidence || '',
    owner: 'Operations Manager',
    scheduleId: apiMs.schedule_id,
    ownerId: apiMs.owner_id || undefined,
    reason: apiMs.reason || '',
    evidence: apiMs.evidence || '',
    delayReason: apiMs.delay_reason ?? null,
    delayResponsible: apiMs.delay_responsible ?? null,
    delayComment: apiMs.delay_comment ?? null,
    delay_reason: apiMs.delay_reason ?? null,
    delay_responsible: apiMs.delay_responsible ?? null,
    delay_comment: apiMs.delay_comment ?? null,
  };
};

export const getEngineerMissedSchedules = async (engineerId: string): Promise<MissedSchedule[]> => {
  try {
    const engineer = await getEngineerById(engineerId);
    const res = await api.get(`/engineers/${engineerId}/missed-schedules`);
    if (res.data && Array.isArray(res.data)) {
      return res.data.map(ms => mapApiMissedScheduleToFrontend(ms, engineer?.name, engineer?.orbitId, engineerId));
    }
    return [];
  } catch (err) {
    console.error(`Error fetching missed schedules for engineer ${engineerId}:`, err);
    throw err;
  }
};

export const getScheduleMissedSchedules = async (scheduleId: string): Promise<MissedSchedule[]> => {
  try {
    const res = await api.get(`/schedules/${scheduleId}/missed-schedules`);
    if (res.data && Array.isArray(res.data)) {
      return res.data.map(ms => mapApiMissedScheduleToFrontend(ms));
    }
    return [];
  } catch (err) {
    console.error(`Error fetching missed schedules for schedule ${scheduleId}:`, err);
    throw err;
  }
};

export const getMissedSchedules = async (params?: any): Promise<PaginatedResponse<MissedSchedule>> => {
  try {
    const queryParams: any = {
      page: params?.page || 1,
      page_size: params?.pageSize || params?.page_size || 20,
    };
    const compId = params?.companyId || params?.company_id;
    if (compId && compId !== 'all-data') queryParams.company_id = compId;
    if (params?.scheduleId) queryParams.schedule_id = params.scheduleId;
    if (params?.engineerId) queryParams.engineer_id = params.engineerId;
    if (params?.search) queryParams.search = params.search;

    const res = await api.get('/missed-schedules', { params: queryParams });
    const raw = res.data;
    if (raw && Array.isArray(raw.items)) {
      return {
        data: raw.items.map((ms: any) => mapApiMissedScheduleToFrontend(ms)),
        total: raw.total,
        page: raw.page,
        pageSize: raw.page_size,
        totalPages: raw.total_pages,
      };
    }
    if (Array.isArray(raw)) {
      const data = raw.map((ms: any) => mapApiMissedScheduleToFrontend(ms));
      return {
        data,
        total: data.length,
        page: 1,
        pageSize: data.length || 20,
        totalPages: 1,
      };
    }
    return {
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    };
  } catch (err) {
    console.error('Error fetching global missed schedules:', err);
    throw err;
  }
};

export const createMissedScheduleRecord = async (scheduleId: string, data: Partial<MissedSchedule>): Promise<MissedSchedule> => {
  const payload = {
    requested_start_date: data.requestedStartDate || null,
    requested_end_date: data.requestedEndDate || null,
    actual_start_date: data.actualStartDate || null,
    actual_end_date: data.actualEndDate || null,
    reason: data.reason || data.reasonForChange || null,
    evidence: data.evidence || data.notesAttachEvidence || null,
    delay_reason: data.delayReason !== undefined ? data.delayReason : (data.delay_reason !== undefined ? data.delay_reason : null),
    delay_responsible: data.delayResponsible !== undefined ? data.delayResponsible : (data.delay_responsible !== undefined ? data.delay_responsible : null),
    delay_comment: data.delayComment !== undefined ? data.delayComment : (data.delay_comment !== undefined ? data.delay_comment : null),
  };
  const res = await api.post(`/schedules/${scheduleId}/missed-schedules`, payload);
  return mapApiMissedScheduleToFrontend(res.data);
};

export const updateMissedScheduleRecord = async (id: string, data: Partial<MissedSchedule>): Promise<MissedSchedule> => {
  const payload: any = {
    requested_start_date: data.requestedStartDate || undefined,
    requested_end_date: data.requestedEndDate || undefined,
    actual_start_date: data.actualStartDate || undefined,
    actual_end_date: data.actualEndDate || undefined,
    reason: data.reason !== undefined ? data.reason : data.reasonForChange,
    evidence: data.evidence !== undefined ? data.evidence : data.notesAttachEvidence,
  };
  if (data.delayReason !== undefined) payload.delay_reason = data.delayReason;
  else if (data.delay_reason !== undefined) payload.delay_reason = data.delay_reason;

  if (data.delayResponsible !== undefined) payload.delay_responsible = data.delayResponsible;
  else if (data.delay_responsible !== undefined) payload.delay_responsible = data.delay_responsible;

  if (data.delayComment !== undefined) payload.delay_comment = data.delayComment;
  else if (data.delay_comment !== undefined) payload.delay_comment = data.delay_comment;

  const res = await api.put(`/missed-schedules/${id}`, payload);
  return mapApiMissedScheduleToFrontend(res.data);
};

export const deleteMissedScheduleRecord = async (id: string): Promise<{ success: boolean }> => {
  await api.delete(`/missed-schedules/${id}`);
  return { success: true };
};
