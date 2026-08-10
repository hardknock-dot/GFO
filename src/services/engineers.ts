import api from './axios';
import type { Engineer } from '../types';

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
    customerId: apiEng.lam_id || '',
    name: apiEng.engineer_name,
    goesBy: apiEng.goes_by || '',
    email: apiEng.email || `${apiEng.goes_by?.toLowerCase() || 'engineer'}@company.com`,
    phone: apiEng.phone || '+1 (555) 019-1000',
    status: apiEng.status || 'Active',
    primaryTool: apiEng.primary_tool_type || '',
    level: apiEng.level || 'L2 Specialist',
    country: apiEng.country || 'Taiwan',
    city: apiEng.city || 'Hsinchu',
    assignedSite: apiEng.assigned_site || 'TSMC Fab 18',
    yearsExperience: Number(apiEng.industry_experience) || 0,
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
  const response = await api.post('/engineers', data);
  return response.data;
};

export const updateEngineer = async (id: string, data: Partial<Engineer>): Promise<Engineer> => {
  const response = await api.put(`/engineers/${id}`, data);
  return response.data;
};

export const deleteEngineer = async (id: string): Promise<{ success: boolean }> => {
  await api.delete(`/engineers/${id}`);
  return { success: true };
};
