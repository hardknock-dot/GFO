import api from './axios';
import type { Leave } from '../types';
import type { PaginatedResponse } from './engineers';
import { getEngineers, getEngineerById } from './engineers';

const mapApiLeaveToFrontend = (apiLeave: any, engineerName?: string, engineerId?: string): Leave => {
  return {
    id: apiLeave.leave_id,
    engineerId: engineerId || apiLeave.engineer_id || 'eng-e150',
    engineerName: engineerName || 'Field Engineer',
    startDate: apiLeave.requested_date || '',
    endDate: apiLeave.requested_date || '',
    type: (apiLeave.leave_type as any) || 'Annual Leave',
    status: (apiLeave.approval_status as any) || 'Pending',
    reason: 'No reason provided',
  };
};

export const getEngineerLeaves = async (engineerId: string): Promise<Leave[]> => {
  try {
    const engineer = await getEngineerById(engineerId);
    const res = await api.get(`/engineers/${engineerId}/leaves`);
    if (res.data && Array.isArray(res.data)) {
      return res.data.map(l => mapApiLeaveToFrontend(l, engineer?.name, engineerId));
    }
    return [];
  } catch (err) {
    console.error(`Error fetching leaves for engineer ${engineerId}:`, err);
    throw err;
  }
};

export const getLeaves = async (params?: any): Promise<PaginatedResponse<Leave>> => {
  try {
    let list: Leave[] = [];
    if (params?.engineerId) {
      list = await getEngineerLeaves(params.engineerId);
    } else {
      const engs = await getEngineers();
      const leavesPromises = engs.data.map(e => getEngineerLeaves(e.id));
      const nestedLeaves = await Promise.all(leavesPromises);
      list = nestedLeaves.flat();
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (l) =>
          l.engineerName.toLowerCase().includes(q) ||
          l.type.toLowerCase().includes(q) ||
          l.reason.toLowerCase().includes(q)
      );
    }
    if (params?.status && params.status !== 'All') {
      list = list.filter((l) => l.status === params.status);
    }

    return {
      data: list,
      total: list.length,
      page: params?.page || 1,
      totalPages: 1,
    };
  } catch (err) {
    console.error('Error fetching global leaves:', err);
    throw err;
  }
};

export const getLeaveById = async (id: string): Promise<Leave | null> => {
  const res = await api.get(`/leaves/${id}`);
  return res.data ? mapApiLeaveToFrontend(res.data) : null;
};

export const createLeave = async (data: Partial<Leave>): Promise<Leave> => {
  const res = await api.post('/leaves', data);
  return res.data;
};

export const updateLeave = async (id: string, data: Partial<Leave>): Promise<Leave> => {
  const res = await api.put(`/leaves/${id}`, data);
  return res.data;
};

export const deleteLeave = async (id: string): Promise<{ success: boolean }> => {
  await api.delete(`/leaves/${id}`);
  return { success: true };
};
