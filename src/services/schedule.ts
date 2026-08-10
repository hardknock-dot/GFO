import api from './axios';
import type { Schedule } from '../types';
import type { PaginatedResponse } from './engineers';
import { getEngineers, getEngineerById } from './engineers';

const mapApiScheduleToFrontend = (apiSch: any, engineerName?: string, orbitId?: string): Schedule => {
  return {
    id: apiSch.schedule_id,
    engineerId: apiSch.engineer_id,
    engineerName: engineerName || 'Field Engineer',
    engineerOrbitId: orbitId || 'ORB001',
    customerName: 'TSMC',
    siteLocation: 'Fab 18',
    country: 'Taiwan',
    projectCode: apiSch.project_code || 'PRJ-001',
    startDate: apiSch.start_date || '',
    endDate: apiSch.end_date || '',
    status: apiSch.status || 'Active Assignment',
    shiftType: apiSch.shift_type || 'Day Shift',
    supportType: apiSch.support_type || 'Deployment',
  };
};

export const getEngineerSchedules = async (engineerId: string): Promise<Schedule[]> => {
  try {
    const engineer = await getEngineerById(engineerId);
    const res = await api.get(`/engineers/${engineerId}/schedules`);
    if (res.data && Array.isArray(res.data)) {
      return res.data.map(s => mapApiScheduleToFrontend(s, engineer?.name, engineer?.orbitId));
    }
    return [];
  } catch (err) {
    console.error(`Error fetching schedules for engineer ${engineerId}:`, err);
    throw err;
  }
};

export const getSchedules = async (params?: any): Promise<PaginatedResponse<Schedule>> => {
  try {
    let list: Schedule[] = [];
    if (params?.engineerId) {
      list = await getEngineerSchedules(params.engineerId);
    } else {
      const engs = await getEngineers();
      const schedulesPromises = engs.data.map(e => getEngineerSchedules(e.id));
      const nestedSchedules = await Promise.all(schedulesPromises);
      list = nestedSchedules.flat();
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.engineerName.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          s.projectCode.toLowerCase().includes(q)
      );
    }
    if (params?.status && params.status !== 'All') {
      list = list.filter((s) => s.status.toLowerCase().includes(params.status.toLowerCase()));
    }

    return {
      data: list,
      total: list.length,
      page: params?.page || 1,
      totalPages: 1,
    };
  } catch (err) {
    console.error('Error fetching global schedules:', err);
    throw err;
  }
};

export const getScheduleById = async (id: string): Promise<Schedule | null> => {
  const res = await api.get(`/schedules/${id}`);
  return res.data ? mapApiScheduleToFrontend(res.data) : null;
};

export const createSchedule = async (data: Partial<Schedule>): Promise<Schedule> => {
  const res = await api.post('/schedules', data);
  return res.data;
};

export const updateSchedule = async (id: string, data: Partial<Schedule>): Promise<Schedule> => {
  const res = await api.put(`/schedules/${id}`, data);
  return res.data;
};

export const deleteSchedule = async (id: string): Promise<{ success: boolean }> => {
  await api.delete(`/schedules/${id}`);
  return { success: true };
};
