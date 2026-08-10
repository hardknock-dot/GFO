import api from './axios';
import type { Visa } from '../types';
import type { PaginatedResponse } from './engineers';
import { getEngineers, getEngineerById } from './engineers';

const mapApiVisaToFrontend = (apiVisa: any, engineerName?: string, orbitId?: string): Visa => {
  const expiryStr = apiVisa.visa_end_date || '';
  let daysUntilExpiry = 365;
  let status: 'Valid' | 'Expiring Soon' | 'Expired' = 'Valid';

  if (expiryStr) {
    const expiry = new Date(expiryStr);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 0) {
      status = 'Expired';
    } else if (daysUntilExpiry <= 30) {
      status = 'Expiring Soon';
    }
  }

  return {
    id: apiVisa.visa_id,
    engineerId: apiVisa.engineer_id,
    engineerName: engineerName || 'Field Engineer',
    engineerOrbitId: orbitId || 'ORB001',
    country: apiVisa.country || 'Taiwan',
    visaType: apiVisa.visa_type || 'Specialist Work Visa',
    passportNumber: 'N/A',
    issueDate: apiVisa.visa_start_date || '',
    expiryDate: expiryStr,
    daysUntilExpiry,
    status,
  };
};

export const getEngineerVisas = async (engineerId: string): Promise<Visa[]> => {
  try {
    const engineer = await getEngineerById(engineerId);
    const res = await api.get(`/engineers/${engineerId}/visa`);
    if (res.data && Array.isArray(res.data)) {
      return res.data.map(v => mapApiVisaToFrontend(v, engineer?.name, engineer?.orbitId));
    }
    return [];
  } catch (err) {
    console.error(`Error fetching visas for engineer ${engineerId}:`, err);
    throw err;
  }
};

export const getVisaRecords = async (params?: any): Promise<PaginatedResponse<Visa>> => {
  try {
    let list: Visa[] = [];
    if (params?.engineerId) {
      list = await getEngineerVisas(params.engineerId);
    } else {
      const engs = await getEngineers();
      const visasPromises = engs.data.map(e => getEngineerVisas(e.id));
      const nestedVisas = await Promise.all(visasPromises);
      list = nestedVisas.flat();
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (v) =>
          v.engineerName.toLowerCase().includes(q) ||
          v.country.toLowerCase().includes(q) ||
          v.visaType.toLowerCase().includes(q)
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
  } catch (err) {
    console.error('Error fetching global visas:', err);
    throw err;
  }
};

export const getVisaRecordById = async (id: string): Promise<Visa | null> => {
  const res = await api.get(`/visas/${id}`);
  return res.data ? mapApiVisaToFrontend(res.data) : null;
};

export const createVisaRecord = async (data: Partial<Visa>): Promise<Visa> => {
  const res = await api.post('/visas', data);
  return res.data;
};

export const updateVisaRecord = async (id: string, data: Partial<Visa>): Promise<Visa> => {
  const res = await api.put(`/visas/${id}`, data);
  return res.data;
};

export const deleteVisaRecord = async (id: string): Promise<{ success: boolean }> => {
  await api.delete(`/visas/${id}`);
  return { success: true };
};

export const getExpiringVisas = async (days: number = 30): Promise<Visa[]> => {
  const res = await getVisaRecords();
  return res.data.filter((v) => v.daysUntilExpiry <= days && v.status !== 'Expired');
};

export const renewVisa = async (visaId: string): Promise<Visa> => {
  const res = await api.post(`/visas/${visaId}/renew`);
  return res.data;
};
