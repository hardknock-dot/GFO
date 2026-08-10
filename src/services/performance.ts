import api from './axios';
import type { Performance } from '../types';
import type { PaginatedResponse } from './engineers';
import excelData from '../data/excelData.json';

const MOCK_PERFORMANCE: Performance[] = (excelData as any).performance || [];

export const getPerformanceRecords = async (params?: any): Promise<PaginatedResponse<Performance>> => {
  try {
    const res = await api.get('/performance', { params });
    if (res.data && Array.isArray(res.data.data)) {
      return res.data;
    }
  } catch (_err) {
    // API fallback
  }

  let list = [...MOCK_PERFORMANCE];
  if (params?.engineerId) {
    const q = params.engineerId.toLowerCase().replace('eng-', '');
    list = list.filter(
      (p) =>
        (p.engineerOrbitId && p.engineerOrbitId.toLowerCase() === q) ||
        p.engineerName.toLowerCase().includes(q)
    );
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (p) => p.engineerName.toLowerCase().includes(q) || (p.reviewer && p.reviewer.toLowerCase().includes(q))
    );
  }
  return {
    data: list,
    total: list.length,
    page: params?.page || 1,
    totalPages: 1,
  };
};

export const getPerformanceRecordById = async (id: string): Promise<Performance | null> => {
  try {
    const res = await api.get(`/performance/${id}`);
    if (res.data && typeof res.data === 'object') {
      return res.data;
    }
  } catch (_err) {
    // Fallback
  }
  return MOCK_PERFORMANCE.find((p) => p.id === id) || null;
};

export const createPerformanceRecord = async (data: Partial<Performance>): Promise<Performance> => {
  try {
    const res = await api.post('/performance', data);
    return res.data;
  } catch (_err) {
    // Fallback
  }
  return {
    ...MOCK_PERFORMANCE[0],
    ...data,
    id: `perf-${Date.now()}`,
  } as Performance;
};

export const updatePerformanceRecord = async (id: string, data: Partial<Performance>): Promise<Performance> => {
  try {
    const res = await api.put(`/performance/${id}`, data);
    return res.data;
  } catch (_err) {
    // Fallback
  }
  const found = MOCK_PERFORMANCE.find((p) => p.id === id) || MOCK_PERFORMANCE[0];
  return { ...found, ...data, id } as Performance;
};

export const deletePerformanceRecord = async (id: string): Promise<{ success: boolean }> => {
  try {
    await api.delete(`/performance/${id}`);
  } catch (_err) {
    // Fallback
  }
  return { success: true };
};
