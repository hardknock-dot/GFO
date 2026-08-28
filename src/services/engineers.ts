import api from './axios';
import type { Engineer, EngineerReportSummary } from '../types';



export interface EngineerFilterOptions {
  tool_modules: string[];
  tool_names: string[];
  countries: string[];
  fabs: string[];
  consumer_experience: { min: number; max: number };
  industry_experience: { min: number; max: number };
}

export interface EngineerQueryParams {
  search?: string;
  q?: string;
  status?: string;
  tool?: string;
  primaryTool?: string;
  toolName?: string;
  tool_modules?: string[];
  tool_names?: string[];
  consumer_min?: number;
  consumer_max?: number;
  industry_min?: number;
  industry_max?: number;
  country?: string;
  fab?: string;
  fabs?: string[];
  level?: string;
  minExperience?: number;
  maxExperience?: number;
  page?: number;
  limit?: number;
  pageSize?: number;
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
    avatarUrl: apiEng.avatar_url || '',
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

export const getEngineerFilterOptions = async (companyId?: string): Promise<EngineerFilterOptions> => {
  try {
    const params: any = {};
    if (companyId) params.company_id = companyId;
    const response = await api.get('/engineers/options', { params });
    return response.data;
  } catch (err) {
    console.error('Error fetching engineer filter options:', err);
    return {
      tool_modules: [],
      tool_names: [],
      countries: [],
      fabs: [],
      consumer_experience: { min: 0, max: 20 },
      industry_experience: { min: 0, max: 20 },
    };
  }
};

export const getEngineers = async (params?: EngineerQueryParams): Promise<PaginatedResponse<Engineer>> => {
  try {
    const urlParams = new URLSearchParams();
    if (params) {
      const p: any = { ...params };
      if (p.limit && !p.pageSize) p.page_size = p.limit;
      if (p.pageSize) p.page_size = p.pageSize;
      delete p.limit;
      delete p.pageSize;

      if (p.tool && !p.primary_tool) p.primary_tool = p.tool;
      delete p.tool;

      if (p.primaryTool) {
        p.primary_tool = p.primaryTool;
        delete p.primaryTool;
      }
      if (p.toolName) {
        p.tool_name = p.toolName;
        delete p.toolName;
      }

      Object.entries(p).forEach(([key, val]) => {
        if (val === undefined || val === null || val === '') return;
        if (Array.isArray(val)) {
          val.forEach((item) => {
            if (item && item.trim()) urlParams.append(key, item.trim());
          });
        } else {
          urlParams.append(key, String(val));
        }
      });
    }

    const response = await api.get(`/engineers?${urlParams.toString()}`);
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
        pageSize: params?.limit || params?.pageSize || 20,
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
    avatar_url: data.avatarUrl !== undefined ? data.avatarUrl : undefined,
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

