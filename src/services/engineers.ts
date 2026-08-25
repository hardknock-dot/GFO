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
  pageSize: number;
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

const engineersCacheById = new Map<string, Engineer>();
const engineersCacheByOrbitId = new Map<string, Engineer>();

export const cacheEngineers = (engineers: Engineer[]) => {
  engineers.forEach((eng) => {
    if (eng.id) engineersCacheById.set(eng.id, eng);
    if (eng.orbitId) engineersCacheByOrbitId.set(eng.orbitId.trim().toLowerCase(), eng);
  });
};

export const resolveEngineerName = (engineerId?: string, orbitId?: string, apiName?: string): string => {
  if (apiName && apiName !== 'N/A' && apiName !== 'Field Engineer') {
    return apiName;
  }
  if (engineerId && engineersCacheById.has(engineerId)) {
    return engineersCacheById.get(engineerId)!.name;
  }
  if (orbitId) {
    const cleanOrbit = orbitId.trim().toLowerCase();
    if (engineersCacheByOrbitId.has(cleanOrbit)) {
      return engineersCacheByOrbitId.get(cleanOrbit)!.name;
    }
  }
  return apiName || orbitId || 'N/A';
};

export const resolveEngineerOrbitId = (engineerId?: string, apiOrbitId?: string): string => {
  if (apiOrbitId && apiOrbitId !== 'ORB001' && apiOrbitId !== 'N/A') {
    return apiOrbitId;
  }
  if (engineerId && engineersCacheById.has(engineerId)) {
    return engineersCacheById.get(engineerId)!.orbitId;
  }
  return apiOrbitId || 'N/A';
};

export const getEngineers = async (params?: EngineerQueryParams): Promise<PaginatedResponse<Engineer>> => {
  try {
    const queryParams: any = { ...params };
    if (queryParams.limit) {
      queryParams.page_size = queryParams.limit;
      delete queryParams.limit;
    }
    const response = await api.get('/engineers', { params: queryParams });
    const raw = response.data;
    if (raw && Array.isArray(raw.items)) {
      const data = raw.items.map(mapApiEngineerToFrontend);
      cacheEngineers(data);
      return {
        data,
        total: raw.total,
        page: raw.page,
        pageSize: raw.page_size,
        totalPages: raw.total_pages,
      };
    }
    if (Array.isArray(raw)) {
      const data = raw.map(mapApiEngineerToFrontend);
      cacheEngineers(data);
      return {
        data,
        total: data.length,
        page: params?.page || 1,
        pageSize: params?.limit || 20,
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

