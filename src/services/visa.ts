import api from './axios';
import type { Visa } from '../types';
import type { PaginatedResponse } from './engineers';
import excelData from '../data/excelData.json';

const MOCK_VISAS: Visa[] = (excelData as any).visas || [];

export const getVisaRecords = async (params?: any): Promise<PaginatedResponse<Visa>> => {
  try {
    const res = await api.get('/visas', { params });
    if (res.data && Array.isArray(res.data.data)) {
      return res.data;
    }
  } catch (_err) {
    // API fallback
  }

  let list = [...MOCK_VISAS];
  if (params?.engineerId) {
    const q = params.engineerId.toLowerCase().replace('eng-', '');
    list = list.filter(
      (v) =>
        (v.engineerOrbitId && v.engineerOrbitId.toLowerCase() === q) ||
        v.engineerName.toLowerCase().includes(q)
    );
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (v) =>
        v.engineerName.toLowerCase().includes(q) ||
        v.country.toLowerCase().includes(q) ||
        (v.visaType && v.visaType.toLowerCase().includes(q))
    );
  }
  if (params?.status && params.status !== 'All') {
    list = list.filter((v) => v.status.toLowerCase().includes(params.status.toLowerCase()));
  }
  return {
    data: list,
    total: list.length,
    page: params?.page || 1,
    totalPages: 1,
  };
};

export const getVisaRecordById = async (id: string): Promise<Visa | null> => {
  try {
    const res = await api.get(`/visas/${id}`);
    if (res.data && typeof res.data === 'object') {
      return res.data;
    }
  } catch (_err) {
    // Fallback
  }
  return MOCK_VISAS.find((v) => v.id === id) || null;
};

export const createVisaRecord = async (data: Partial<Visa>): Promise<Visa> => {
  try {
    const res = await api.post('/visas', data);
    return res.data;
  } catch (_err) {
    // Fallback
  }
  return {
    ...MOCK_VISAS[0],
    ...data,
    id: `visa-${Date.now()}`,
  } as Visa;
};

export const updateVisaRecord = async (id: string, data: Partial<Visa>): Promise<Visa> => {
  try {
    const res = await api.put(`/visas/${id}`, data);
    return res.data;
  } catch (_err) {
    // Fallback
  }
  const found = MOCK_VISAS.find((v) => v.id === id) || MOCK_VISAS[0];
  return { ...found, ...data, id } as Visa;
};

export const deleteVisaRecord = async (id: string): Promise<{ success: boolean }> => {
  try {
    await api.delete(`/visas/${id}`);
  } catch (_err) {
    // Fallback
  }
  return { success: true };
};

export const getExpiringVisas = async (days: number = 30): Promise<Visa[]> => {
  try {
    const res = await api.get(`/visas/expiring`, { params: { days } });
    return res.data;
  } catch (_err) {
    return MOCK_VISAS.filter((v) => v.daysUntilExpiry <= days && v.status !== 'Expired');
  }
};

export const renewVisa = async (visaId: string): Promise<Visa> => {
  try {
    const res = await api.post(`/visas/${visaId}/renew`);
    return res.data;
  } catch (_err) {
    // Fallback
  }
  const found = MOCK_VISAS.find((v) => v.id === visaId) || MOCK_VISAS[0];
  return {
    ...found,
    id: visaId,
    status: 'In Progress' as const,
  };
};
