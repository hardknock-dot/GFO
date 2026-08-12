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
    leaveType: apiLeave.leave_type || 'Annual Leave',
    requestedDate: apiLeave.requested_date || '',
    requestedOn: apiLeave.requested_on || '',
    approvalStatus: apiLeave.approval_status || 'Pending',
    ownerId: apiLeave.owner_id || undefined,
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
      const engs = await getEngineers(params?.companyId ? { company_id: params.companyId } : undefined);
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
      list = list.filter((l) => l.status === params.status || l.approvalStatus === params.status);
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

export const createLeaveRecord = async (engineerId: string, data: Partial<Leave>): Promise<Leave> => {
  const payload = {
    leave_type: data.leaveType || data.type || 'Annual Leave',
    requested_date: data.requestedDate || data.startDate || null,
    requested_on: data.requestedOn || new Date().toISOString().split('T')[0],
    approval_status: data.approvalStatus || data.status || 'Pending',
  };
  const res = await api.post(`/engineers/${engineerId}/leaves`, payload);
  return mapApiLeaveToFrontend(res.data);
};

export const updateLeaveRecord = async (id: string, data: Partial<Leave>): Promise<Leave> => {
  const payload = {
    leave_type: data.leaveType || data.type || undefined,
    requested_date: data.requestedDate || data.startDate || undefined,
    requested_on: data.requestedOn || undefined,
    approval_status: data.approvalStatus || data.status || undefined,
  };
  const res = await api.put(`/leaves/${id}`, payload);
  return mapApiLeaveToFrontend(res.data);
};

export const deleteLeaveRecord = async (id: string): Promise<{ success: boolean }> => {
  await api.delete(`/leaves/${id}`);
  return { success: true };
};
