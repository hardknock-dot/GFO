import api from './axios';
import type { Visa } from '../types';
import type { PaginatedResponse } from './engineers';
import { getEngineerById } from './engineers';

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
    appliedOn: apiVisa.applied_on || '',
    visaStartDate: apiVisa.visa_start_date || '',
    visaEndDate: apiVisa.visa_end_date || '',
    comments: apiVisa.comments || '',
    commentStatus: apiVisa.comment_status || 'UNADDRESSED',
    ownerId: apiVisa.owner_id,
    owner_id: apiVisa.owner_id,
  };
};

export const updateVisaCommentStatus = async (visaId: string, commentStatus: string): Promise<Visa> => {
  const res = await api.patch(`/visa/${visaId}/comments/status`, { comment_status: commentStatus });
  return mapApiVisaToFrontend(res.data);
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
    const queryParams: any = {
      page: params?.page || 1,
      page_size: params?.pageSize || params?.page_size || 20,
    };
    const compId = params?.companyId || params?.company_id;
    if (compId && compId !== 'all-data') queryParams.company_id = compId;
    if (params?.engineerId) queryParams.engineer_id = params.engineerId;
    if (params?.search) queryParams.search = params.search;

    const res = await api.get('/visa', { params: queryParams });
    const raw = res.data;
    if (raw && Array.isArray(raw.items)) {
      return {
        data: raw.items.map((v: any) => mapApiVisaToFrontend(v)),
        total: raw.total,
        page: raw.page,
        pageSize: raw.page_size,
        totalPages: raw.total_pages,
      };
    }
    if (Array.isArray(raw)) {
      const data = raw.map((v: any) => mapApiVisaToFrontend(v));
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
    console.error('Error fetching global visas:', err);
    throw err;
  }
};

export const getVisaRecordById = async (id: string): Promise<Visa | null> => {
  const res = await api.get(`/visa/${id}`);
  return res.data ? mapApiVisaToFrontend(res.data) : null;
};

export const createVisaRecord = async (engineerId: string, data: Partial<Visa>): Promise<Visa> => {
  const payload = {
    country: data.country,
    visa_type: data.visaType || null,
    applied_on: data.appliedOn || null,
    visa_start_date: data.issueDate || null,
    visa_end_date: data.expiryDate || null,
  };
  const res = await api.post(`/engineers/${engineerId}/visa`, payload);
  return mapApiVisaToFrontend(res.data);
};

export const updateVisaRecord = async (id: string, data: Partial<Visa>): Promise<Visa> => {
  const payload = {
    country: data.country,
    visa_type: data.visaType || null,
    applied_on: data.appliedOn || null,
    visa_start_date: data.issueDate || null,
    visa_end_date: data.expiryDate || null,
  };
  const res = await api.put(`/visa/${id}`, payload);
  return mapApiVisaToFrontend(res.data);
};

export const deleteVisaRecord = async (id: string): Promise<{ success: boolean }> => {
  await api.delete(`/visa/${id}`);
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
