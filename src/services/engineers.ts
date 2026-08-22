import api from './axios';
import type { Engineer, EngineerReportSummary } from '../types';



export interface EngineerQueryParams {
  search?: string;
  status?: string;
  tool?: string;
  country?: string;
  level?: string;
  minExperience?: number;
  maxExperience?: number;
  page?: number;
  limit?: number;
  company_id?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

const mapApiEngineerToFrontend = (apiEng: any): Engineer => {
  return {
    id: apiEng.engineer_id,
    orbitId: apiEng.orbit_id,
    customerId: apiEng.lam_id || apiEng.employee_id || '',
    name: apiEng.engineer_name,
    goesBy: apiEng.goes_by || '',
    email: apiEng.email || null,
    phoneNumber: apiEng.phone_number || null,
    status: apiEng.status || 'Active',
    primaryTool: apiEng.primary_tool_type || apiEng.primary_tool || '',
    level: apiEng.level || 'L2 Specialist',
    country: apiEng.country || 'Taiwan',
    city: apiEng.city || 'Hsinchu',
    assignedSite: apiEng.assigned_site || 'TSMC Fab 18',
    yearsExperience: Number(apiEng.industry_experience) || 0,
    customerExperience: Number(apiEng.customer_experience) || Number(apiEng.lam_experience) || 0,
    certificationsCount: apiEng.certifications_count || 0,
    activeProjectsCount: apiEng.active_projects_count || 0,
    avatarUrl: apiEng.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
    joinDate: apiEng.date_of_joining || '',
  };
};

export const getEngineers = async (params?: EngineerQueryParams): Promise<PaginatedResponse<Engineer>> => {
  try {
    const response = await api.get('/engineers', { params });
    if (response.data && Array.isArray(response.data)) {
      const data = response.data.map(mapApiEngineerToFrontend);
      return {
        data,
        total: data.length,
        page: params?.page || 1,
        totalPages: 1,
      };
    }
    return {
      data: [],
      total: 0,
      page: 1,
      totalPages: 1,
    };
  } catch (err) {
    console.error('Error fetching engineers:', err);
    throw err;
  }
};

export const getEngineerById = async (id: string): Promise<Engineer | null> => {
  try {
    const response = await api.get(`/engineers/${id}`);
    if (response.data) {
      return mapApiEngineerToFrontend(response.data);
    }
    return null;
  } catch (err) {
    console.error(`Error fetching engineer ${id}:`, err);
    throw err;
  }
};

export const createEngineer = async (data: Partial<Engineer>): Promise<Engineer> => {
  const payload = {
    company_id: (data as any).company_id,
    engineer_name: data.name,
    goes_by: data.goesBy,
    employee_id: data.customerId,
    orbit_id: data.orbitId,
    level: data.level,
    date_of_joining: data.joinDate || null,
    primary_tool: data.primaryTool,
    customer_experience: data.customerExperience !== undefined ? Number(data.customerExperience) : null,
    industry_experience: data.yearsExperience !== undefined ? Number(data.yearsExperience) : null,
    status: data.status,
    email: data.email || null,
    phone_number: data.phoneNumber || null,
  };
  const response = await api.post('/engineers', payload);
  return mapApiEngineerToFrontend(response.data);
};

export const updateEngineer = async (id: string, data: Partial<Engineer>): Promise<Engineer> => {
  const payload = {
    engineer_name: data.name,
    goes_by: data.goesBy,
    employee_id: data.customerId,
    orbit_id: data.orbitId,
    level: data.level,
    date_of_joining: data.joinDate || null,
    primary_tool: data.primaryTool,
    customer_experience: data.customerExperience !== undefined ? Number(data.customerExperience) : null,
    industry_experience: data.yearsExperience !== undefined ? Number(data.yearsExperience) : null,
    status: data.status,
    email: data.email || null,
    phone_number: data.phoneNumber || null,
  };
  const response = await api.put(`/engineers/${id}`, payload);
  return mapApiEngineerToFrontend(response.data);
};

export const deleteEngineer = async (id: string): Promise<{ success: boolean }> => {
  await api.delete(`/engineers/${id}`);
  return { success: true };
};

export const getEngineerReportSummary = async (engineerId: string): Promise<EngineerReportSummary> => {
  const response = await api.get(`/engineers/${engineerId}/reports/summary`);
  return response.data;
};

