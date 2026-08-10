import api from './axios';
import type { Leave } from '../types';
import type { PaginatedResponse } from './engineers';

const MOCK_LEAVES: Leave[] = [
  {
    id: 'lv-001',
    engineerId: 'eng-e150',
    engineerName: 'Selvaganesh Nagarathinam Rajagopalchettiar',
    startDate: '2026-08-10',
    endDate: '2026-08-15',
    type: 'Annual Leave',
    status: 'Approved',
    reason: 'Family vacation in Tokyo',
  },
  {
    id: 'lv-002',
    engineerId: 'eng-e151',
    engineerName: 'Prakash Govindaraj',
    startDate: '2026-08-20',
    endDate: '2026-08-22',
    type: 'Training',
    status: 'Pending',
    reason: 'Advanced chamber maintenance course',
  },
  {
    id: 'lv-003',
    engineerId: 'eng-e152',
    engineerName: 'Devanand Gunasekaran',
    startDate: '2026-08-01',
    endDate: '2026-08-03',
    type: 'Sick Leave',
    status: 'Approved',
    reason: 'Dental surgery recovery',
  },
];

export const getLeaves = async (params?: any): Promise<PaginatedResponse<Leave>> => {
  try {
    const res = await api.get('/leaves', { params });
    if (res.data && Array.isArray(res.data.data)) {
      return res.data;
    }
  } catch (_err) {
    // Fallback
  }

  let list = [...MOCK_LEAVES];
  if (params?.engineerId) {
    list = list.filter((l) => l.engineerId === params.engineerId);
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
};

export const getLeaveById = async (id: string): Promise<Leave | null> => {
  try {
    const res = await api.get(`/leaves/${id}`);
    return res.data;
  } catch (_err) {
    // Fallback
  }
  return MOCK_LEAVES.find((l) => l.id === id) || null;
};

export const createLeave = async (data: Partial<Leave>): Promise<Leave> => {
  try {
    const res = await api.post('/leaves', data);
    return res.data;
  } catch (_err) {
    // Fallback
  }
  return {
    id: `lv-${Date.now()}`,
    engineerId: data.engineerId || 'eng-e150',
    engineerName: data.engineerName || 'Unknown Engineer',
    startDate: data.startDate || new Date().toISOString().split('T')[0],
    endDate: data.endDate || new Date().toISOString().split('T')[0],
    type: data.type || 'Annual Leave',
    status: data.status || 'Pending',
    reason: data.reason || 'Personal time off',
  };
};

export const updateLeave = async (id: string, data: Partial<Leave>): Promise<Leave> => {
  try {
    const res = await api.put(`/leaves/${id}`, data);
    return res.data;
  } catch (_err) {
    // Fallback
  }
  const found = MOCK_LEAVES.find((l) => l.id === id) || MOCK_LEAVES[0];
  return { ...found, ...data, id };
};

export const deleteLeave = async (id: string): Promise<{ success: boolean }> => {
  try {
    await api.delete(`/leaves/${id}`);
  } catch (_err) {
    // Fallback
  }
  return { success: true };
};
