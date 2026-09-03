import api from './axios';
import type { Schedule } from '../types';
import type { PaginatedResponse } from './engineers';
import { getEngineerById, resolveEngineerName, resolveEngineerOrbitId } from './engineers';

const mapApiScheduleToFrontend = (apiSch: any, engineerName?: string, orbitId?: string): Schedule => {
  const engId = apiSch.engineer_id;
  const resolvedName = resolveEngineerName(engId, orbitId || apiSch.orbit_id, engineerName || apiSch.engineer_name);
  const resolvedOrbit = resolveEngineerOrbitId(engId, orbitId || apiSch.orbit_id);

  const commentAdressal = apiSch.comment_adressal !== undefined ? apiSch.comment_adressal : null;
  const commentStatus = commentAdressal === false ? 'UNADDRESSED' : (apiSch.comment_status || null);

  return {
    id: apiSch.schedule_id,
    engineerId: engId,
    engineerName: resolvedName,
    engineerOrbitId: resolvedOrbit,
    country: apiSch.country || '',

    // Core DB fields:
    supportType: apiSch.support_type || '',
    fabCity: apiSch.fab_city || '',
    fabSite: apiSch.fab_site || '',
    scheduleStatus: apiSch.schedule_status || 'Upcoming',
    remarks: apiSch.remarks || '',
    commentStatus: commentStatus,
    commentAdressal: commentAdressal,
    startDate: apiSch.start_date || '',
    endDate: apiSch.end_date || '',

    // Compatibility fields:
    customerName: apiSch.fab_site || '',
    siteLocation: apiSch.fab_city ? `${apiSch.fab_city}${apiSch.country ? ', ' + apiSch.country : ''}` : (apiSch.fab_site || ''),
    projectCode: apiSch.support_type || 'PRJ-001',
    status: (apiSch.schedule_status || 'Active Assignment') as any,
    shiftType: 'Day Shift',
  };
};

export const markScheduleCommentAddressed = async (scheduleId: string): Promise<any> => {
  const res = await api.post(`/schedules/${scheduleId}/mark-addressed`);
  return res.data;
};

export const updateScheduleCommentStatus = async (scheduleId: string, commentAdressal: boolean | null = null): Promise<Schedule> => {
  if (commentAdressal === null || commentAdressal === true) {
    return markScheduleCommentAddressed(scheduleId);
  }
  const payload = { 
    comment_adressal: false,
    comment_status: 'UNADDRESSED'
  };
  const res = await api.patch(`/schedules/${scheduleId}/comments/status`, payload);
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
    const queryParams: any = {
      page: params?.page || 1,
      page_size: params?.pageSize || params?.page_size || 20,
    };
    const compId = params?.companyId || params?.company_id;
    if (compId && compId !== 'all-data') queryParams.company_id = compId;
    if (params?.engineerId) queryParams.engineer_id = params.engineerId;
    if (params?.search) queryParams.search = params.search;
    if (params?.status && params.status !== 'All') queryParams.schedule_status = params.status;
    if (params?.hasComments !== undefined || params?.has_comments !== undefined) {
      queryParams.has_comments = params.hasComments ?? params.has_comments;
    }
    if (params?.commentAdressal !== undefined || params?.comment_adressal !== undefined) {
      queryParams.comment_adressal = params.commentAdressal ?? params.comment_adressal;
    }

    const res = await api.get('/schedules', { params: queryParams });
    const raw = res.data;
    if (raw && Array.isArray(raw.items)) {
      return {
        data: raw.items.map((s: any) => mapApiScheduleToFrontend(s)),
        total: raw.total,
        page: raw.page,
        pageSize: raw.page_size,
        totalPages: raw.total_pages,
      };
    }
    if (Array.isArray(raw)) {
      const data = raw.map((s: any) => mapApiScheduleToFrontend(s));
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
