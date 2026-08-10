import api from './axios';
import type { Company } from '../types';
import { PRESET_COMPANIES } from '../context/CompanyContext';

export const getCompanies = async (): Promise<Company[]> => {
  try {
    const res = await api.get('/companies');
    return res.data;
  } catch (_err) {
    return PRESET_COMPANIES;
  }
};

export const getCompany = async (id: string): Promise<Company | null> => {
  try {
    const res = await api.get(`/companies/${id}`);
    return res.data;
  } catch (_err) {
    // Fallback
  }
  return PRESET_COMPANIES.find((c) => c.id === id) || null;
};

export const createCompany = async (data: Partial<Company>): Promise<Company> => {
  try {
    const res = await api.post('/companies', data);
    return res.data;
  } catch (_err) {
    // Fallback
  }
  return {
    ...PRESET_COMPANIES[0],
    ...data,
    id: `company-${Date.now()}`,
  } as Company;
};

export const updateCompany = async (id: string, data: Partial<Company>): Promise<Company> => {
  try {
    const res = await api.put(`/companies/${id}`, data);
    return res.data;
  } catch (_err) {
    // Fallback
  }
  const found = PRESET_COMPANIES.find((c) => c.id === id) || PRESET_COMPANIES[0];
  return { ...found, ...data, id } as Company;
};

export const deleteCompany = async (id: string): Promise<{ success: boolean }> => {
  try {
    await api.delete(`/companies/${id}`);
  } catch (_err) {
    // Fallback
  }
  return { success: true };
};

export const switchCompanyTenant = async (companyId: string): Promise<{ success: boolean; activeCompany: string }> => {
  try {
    const res = await api.post('/companies/switch', { company_id: companyId });
    return res.data;
  } catch (_err) {
    localStorage.setItem('ormp_active_company', companyId);
    return { success: true, activeCompany: companyId };
  }
};
