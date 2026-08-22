import api from './axios';
import type { MissedSchedule } from '../types';
import type { PaginatedResponse } from './engineers';
import { getEngineers, getEngineerById } from './engineers';

const mapApiMissedScheduleToFrontend = (apiMs: any, engineerName?: string, orbitId?: string, engineerId?: string): MissedSchedule => {
  return {
    id: apiMs.missed_schedule_id,
    engineerId: engineerId || apiMs.engineer_id || 'eng-e150',
    engineerName: engineerName || 'Field Engineer',
    engineerOrbitId: orbitId || 'ORB001',
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
    let list: MissedSchedule[] = [];
    if (params?.scheduleId) {
      list = await getScheduleMissedSchedules(params.scheduleId);
    } else if (params?.engineerId) {
      list = await getEngineerMissedSchedules(params.engineerId);
    } else {
      const activeCompId = params?.companyId || params?.company_id;
      const engs = await getEngineers(activeCompId ? { company_id: activeCompId } : undefined);
      const msPromises = engs.data.map(e => getEngineerMissedSchedules(e.id));
      const nestedMs = await Promise.all(msPromises);
      list = nestedMs.flat();
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (ms) =>
          ms.engineerName.toLowerCase().includes(q) ||
          ms.reasonForChange.toLowerCase().includes(q) ||
          ms.notesAttachEvidence.toLowerCase().includes(q) ||
          (ms.scheduleId && ms.scheduleId.toLowerCase().includes(q))
      );
    }

    return {
      data: list,
      total: list.length,
      page: params?.page || 1,
      totalPages: 1,
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
  };
  const res = await api.post(`/schedules/${scheduleId}/missed-schedules`, payload);
  return mapApiMissedScheduleToFrontend(res.data);
};

export const updateMissedScheduleRecord = async (id: string, data: Partial<MissedSchedule>): Promise<MissedSchedule> => {
  const payload = {
    requested_start_date: data.requestedStartDate || undefined,
    requested_end_date: data.requestedEndDate || undefined,
    actual_start_date: data.actualStartDate || undefined,
    actual_end_date: data.actualEndDate || undefined,
    reason: data.reason !== undefined ? data.reason : data.reasonForChange,
    evidence: data.evidence !== undefined ? data.evidence : data.notesAttachEvidence,
  };
  const res = await api.put(`/missed-schedules/${id}`, payload);
  return mapApiMissedScheduleToFrontend(res.data);
};

export const deleteMissedScheduleRecord = async (id: string): Promise<{ success: boolean }> => {
  await api.delete(`/missed-schedules/${id}`);
  return { success: true };
};
