import api from './axios';
import type { Travel } from '../types';
import type { PaginatedResponse } from './engineers';
import excelData from '../data/excelData.json';

const MOCK_TRAVEL: Travel[] = (excelData as any).travel || [];

export const getTravelRecords = async (params?: any): Promise<PaginatedResponse<Travel>> => {
  try {
    const res = await api.get('/travel', { params });
    if (res.data && Array.isArray(res.data.data)) {
      return res.data;
    }
  } catch (_err) {
    // API fallback
  }

  let list = [...MOCK_TRAVEL];
  if (params?.engineerId) {
    const q = params.engineerId.toLowerCase().replace('eng-', '');
    list = list.filter(
      (t) =>
        (t.engineerOrbitId && t.engineerOrbitId.toLowerCase() === q) ||
        t.engineerName.toLowerCase().includes(q)
    );
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (t) =>
        t.engineerName.toLowerCase().includes(q) ||
        t.destinationCountry.toLowerCase().includes(q) ||
        (t.purpose && t.purpose.toLowerCase().includes(q))
    );
  }
  if (params?.status && params.status !== 'All') {
    list = list.filter((t) => t.status.toLowerCase().includes(params.status.toLowerCase()));
  }
  return {
    data: list,
    total: list.length,
    page: params?.page || 1,
    totalPages: 1,
  };
};

export const getTravelRecordById = async (id: string): Promise<Travel | null> => {
  try {
    const res = await api.get(`/travel/${id}`);
    if (res.data && typeof res.data === 'object') {
      return res.data;
    }
  } catch (_err) {
    // Fallback
  }
  return MOCK_TRAVEL.find((t) => t.id === id) || null;
};

export const createTravelRecord = async (data: Partial<Travel>): Promise<Travel> => {
  try {
    const res = await api.post('/travel', data);
    return res.data;
  } catch (_err) {
    // Fallback
  }
  return {
    ...MOCK_TRAVEL[0],
    ...data,
    id: `trv-${Date.now()}`,
  } as Travel;
};

export const updateTravelRecord = async (id: string, data: Partial<Travel>): Promise<Travel> => {
  try {
    const res = await api.put(`/travel/${id}`, data);
    return res.data;
  } catch (_err) {
    // Fallback
  }
  const found = MOCK_TRAVEL.find((t) => t.id === id) || MOCK_TRAVEL[0];
  return { ...found, ...data, id } as Travel;
};

export const deleteTravelRecord = async (id: string): Promise<{ success: boolean }> => {
  try {
    await api.delete(`/travel/${id}`);
  } catch (_err) {
    // Fallback
  }
  return { success: true };
};
