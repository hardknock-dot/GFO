import api from './axios';
import type { Company } from '../types';
import { PRESET_COMPANIES } from '../context/CompanyContext';

const mapApiCompanyToFrontend = (apiComp: any): Company => {
  const preset = PRESET_COMPANIES.find(
    (c) =>
      c.company_id === apiComp.company_id ||
      c.id === apiComp.company_id ||
      c.name.toLowerCase() === apiComp.company_name?.toLowerCase() ||
      c.code.toLowerCase() === apiComp.short_name?.toLowerCase()
  ) || PRESET_COMPANIES[0];

  return {
    ...preset,
    id: apiComp.company_id,
    name: apiComp.company_name,
    code: apiComp.short_name,
    company_id: apiComp.company_id,
    company_name: apiComp.company_name,
    short_name: apiComp.short_name,
    logo: apiComp.logo ? (apiComp.logo.startsWith('http') ? apiComp.logo : preset.logo) : preset.logo,
  };
};

export const getCompanies = async (): Promise<Company[]> => {
  try {
    const res = await api.get('/companies');
    if (res.data && Array.isArray(res.data)) {
      return res.data.map(mapApiCompanyToFrontend);
    }
    return [];
  } catch (err) {
    console.error('Error fetching companies:', err);
    throw err;
  }
};

export const getCompany = async (id: string): Promise<Company | null> => {
  try {
    const res = await api.get(`/companies/${id}`);
    if (res.data) {
      return mapApiCompanyToFrontend(res.data);
    }
    return null;
  } catch (err) {
    console.error(`Error fetching company ${id}:`, err);
    throw err;
  }
};

export const createCompany = async (data: Partial<Company>): Promise<Company> => {
  const res = await api.post('/companies', data);
  return res.data;
};

export const updateCompany = async (id: string, data: Partial<Company>): Promise<Company> => {
  const res = await api.put(`/companies/${id}`, data);
  return res.data;
};

export const deleteCompany = async (id: string): Promise<{ success: boolean }> => {
  await api.delete(`/companies/${id}`);
  return { success: true };
};

export const switchCompanyTenant = async (companyId: string): Promise<{ success: boolean; activeCompany: string }> => {
  localStorage.setItem('ormp_active_company', companyId);
  return { success: true, activeCompany: companyId };
};
