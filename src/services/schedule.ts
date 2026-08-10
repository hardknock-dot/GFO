import api from './axios';
import type { Schedule } from '../types';
import type { PaginatedResponse } from './engineers';
import excelData from '../data/excelData.json';

const MOCK_SCHEDULES: Schedule[] = (excelData as any).schedules || [];

export const getSchedules = async (params?: any): Promise<PaginatedResponse<Schedule>> => {
  try {
    const res = await api.get('/schedules', { params });
    if (res.data && Array.isArray(res.data.data)) {
      return res.data;
    }
  } catch (_err) {
    // API fallback
  }

  let list = [...MOCK_SCHEDULES];
  if (params?.engineerId) {
    const q = params.engineerId.toLowerCase().replace('eng-', '');
    list = list.filter(
      (s) =>
        (s.engineerOrbitId && s.engineerOrbitId.toLowerCase() === q) ||
        s.engineerName.toLowerCase().includes(q)
    );
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (s) =>
        s.engineerName.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
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
};

export const getScheduleById = async (id: string): Promise<Schedule | null> => {
  try {
    const res = await api.get(`/schedules/${id}`);
    if (res.data && typeof res.data === 'object') {
      return res.data;
    }
  } catch (_err) {
    // API fallback
  }
  return MOCK_SCHEDULES.find((s) => s.id === id) || null;
};

export const createSchedule = async (data: Partial<Schedule>): Promise<Schedule> => {
  try {
    const res = await api.post('/schedules', data);
    return res.data;
  } catch (_err) {
    // Fallback
  }
  return {
    ...MOCK_SCHEDULES[0],
    ...data,
    id: `sch-${Date.now()}`,
  } as Schedule;
};

export const updateSchedule = async (id: string, data: Partial<Schedule>): Promise<Schedule> => {
  try {
    const res = await api.put(`/schedules/${id}`, data);
    return res.data;
  } catch (_err) {
    // Fallback
  }
  const found = MOCK_SCHEDULES.find((s) => s.id === id) || MOCK_SCHEDULES[0];
  return { ...found, ...data, id } as Schedule;
};

export const deleteSchedule = async (id: string): Promise<{ success: boolean }> => {
  try {
    await api.delete(`/schedules/${id}`);
  } catch (_err) {
    // Fallback
  }
  return { success: true };
};
