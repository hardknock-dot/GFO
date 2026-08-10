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

export const getMissedSchedules = async (params?: any): Promise<PaginatedResponse<MissedSchedule>> => {
  try {
    let list: MissedSchedule[] = [];
    if (params?.engineerId) {
      list = await getEngineerMissedSchedules(params.engineerId);
    } else {
      const engs = await getEngineers();
      const msPromises = engs.data.map(e => getEngineerMissedSchedules(e.id));
      const nestedMs = await Promise.all(msPromises);
      list = nestedMs.flat();
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (ms) =>
          ms.engineerName.toLowerCase().includes(q) ||
          ms.reasonForChange.toLowerCase().includes(q)
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
