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
    country: apiSch.country || '',
    
    // Core DB fields:
    supportType: apiSch.support_type || '',
    fabCity: apiSch.fab_city || '',
    fabSite: apiSch.fab_site || '',
    scheduleStatus: apiSch.schedule_status || 'Upcoming',
    remarks: apiSch.remarks || '',
    commentStatus: apiSch.comment_status || 'UNADDRESSED',
    startDate: apiSch.start_date || '',
    endDate: apiSch.end_date || '',

    // Compatibility fields:
    customerName: apiSch.fab_site || 'TSMC',
    siteLocation: apiSch.fab_city ? `${apiSch.fab_city}, ${apiSch.country || ''}` : (apiSch.fab_site || 'Fab 18'),
    projectCode: apiSch.support_type || 'PRJ-001',
    status: (apiSch.schedule_status || 'Active Assignment') as any,
    shiftType: 'Day Shift',
  };
};

export const updateScheduleCommentStatus = async (scheduleId: string, commentStatus: string): Promise<Schedule> => {
  const res = await api.patch(`/schedules/${scheduleId}/comments/status`, { comment_status: commentStatus });
  return mapApiScheduleToFrontend(res.data);
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
      const activeCompId = params?.companyId || params?.company_id;
      const engs = await getEngineers(activeCompId ? { company_id: activeCompId } : undefined);
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
          s.projectCode.toLowerCase().includes(q) ||
          (s.supportType && s.supportType.toLowerCase().includes(q)) ||
          (s.fabSite && s.fabSite.toLowerCase().includes(q))
      );
    }
    if (params?.status && params.status !== 'All') {
      list = list.filter((s) => 
        s.status.toLowerCase().includes(params.status.toLowerCase()) ||
        (s.scheduleStatus && s.scheduleStatus.toLowerCase().includes(params.status.toLowerCase()))
      );
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

export const createSchedule = async (engineerId: string, data: Partial<Schedule>): Promise<Schedule> => {
  const payload = {
    support_type: data.supportType,
    country: data.country,
    fab_city: data.fabCity || null,
    fab_site: data.fabSite || null,
    start_date: data.startDate || null,
    end_date: data.endDate || null,
    schedule_status: data.scheduleStatus || 'Upcoming',
    remarks: data.remarks || null,
  };
  const res = await api.post(`/engineers/${engineerId}/schedules`, payload);
  return mapApiScheduleToFrontend(res.data);
};

export const updateSchedule = async (id: string, data: Partial<Schedule>): Promise<Schedule> => {
  const payload = {
    support_type: data.supportType,
    country: data.country,
    fab_city: data.fabCity || null,
    fab_site: data.fabSite || null,
    start_date: data.startDate || null,
    end_date: data.endDate || null,
    schedule_status: data.scheduleStatus || 'Upcoming',
    remarks: data.remarks || null,
  };
  const res = await api.put(`/schedules/${id}`, payload);
  return mapApiScheduleToFrontend(res.data);
};

export const deleteSchedule = async (id: string): Promise<{ success: boolean }> => {
  await api.delete(`/schedules/${id}`);
  return { success: true };
};
