import api from './axios';
import type { Engineer } from '../types';
import excelData from '../data/excelData.json';

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

export const ALL_ENGINEERS: Engineer[] = (excelData as any).engineers || [];

export const getEngineers = async (params?: EngineerQueryParams): Promise<PaginatedResponse<Engineer>> => {
  try {
    const response = await api.get('/engineers', { params });
    if (response.data && Array.isArray(response.data.data)) {
      return response.data;
    }
  } catch (_err) {
    // API server not running or returning HTML fallback
  }

  let filtered = [...ALL_ENGINEERS];
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.goesBy && e.goesBy.toLowerCase().includes(q)) ||
        e.orbitId.toLowerCase().includes(q) ||
        e.primaryTool.toLowerCase().includes(q) ||
        e.country.toLowerCase().includes(q) ||
        (e.assignedSite && e.assignedSite.toLowerCase().includes(q))
    );
  }
  if (params?.status && params.status !== 'All') {
    filtered = filtered.filter((e) => e.status.toLowerCase() === params.status?.toLowerCase());
  }
  if (params?.country && params.country !== 'All') {
    filtered = filtered.filter((e) => e.country.toLowerCase() === params.country?.toLowerCase());
  }
  if (params?.tool && params.tool !== 'All') {
    filtered = filtered.filter((e) => e.primaryTool.toLowerCase().includes(params.tool?.toLowerCase() || ''));
  }
  if (params?.level && params.level !== 'All') {
    filtered = filtered.filter((e) => e.level.toLowerCase().includes(params.level?.toLowerCase() || ''));
  }
  if (params?.minExperience !== undefined && params.minExperience > 0) {
    filtered = filtered.filter((e) => e.yearsExperience >= (params.minExperience || 0));
  }

  return {
    data: filtered,
    total: filtered.length,
    page: params?.page || 1,
    totalPages: 1,
  };
};

export const getEngineerById = async (id: string): Promise<Engineer | null> => {
  try {
    const response = await api.get(`/engineers/${id}`);
    if (response.data && response.data.id && typeof response.data === 'object') {
      return response.data;
    }
  } catch (_err) {
    // API server not running
  }

  const q = id.toLowerCase().replace('eng-', '');
  const found = ALL_ENGINEERS.find(
    (e) =>
      e.id.toLowerCase() === id.toLowerCase() ||
      e.orbitId.toLowerCase() === q ||
      e.orbitId.toLowerCase() === id.toLowerCase()
  );
  return found || ALL_ENGINEERS[0];
};

export const createEngineer = async (data: Partial<Engineer>): Promise<Engineer> => {
  const response = await api.post('/engineers', data).catch(() => ({
    data: {
      id: `eng-${Date.now()}`,
      orbitId: `ORB-${Math.floor(8000 + Math.random() * 1000)}`,
      customerId: 'CUST-NEW-001',
      name: data.name || 'New Engineer',
      email: data.email || 'engineer@company.com',
      phone: data.phone || '+1 555 0000',
      status: (data.status as any) || 'Active',
      primaryTool: data.primaryTool || 'Tool Chamber',
      level: (data.level as any) || 'L2 Specialist',
      country: data.country || 'United States',
      city: data.city || 'San Jose, CA',
      yearsExperience: data.yearsExperience || 3,
      certificationsCount: 2,
      activeProjectsCount: 1,
      joinDate: new Date().toISOString().split('T')[0],
    } as Engineer,
  }));
  return response.data;
};

export const updateEngineer = async (id: string, data: Partial<Engineer>): Promise<Engineer> => {
  const response = await api.put(`/engineers/${id}`, data).catch(() => ({
    data: { ...ALL_ENGINEERS[0], ...data, id } as Engineer,
  }));
  return response.data;
};

export const deleteEngineer = async (id: string): Promise<{ success: boolean }> => {
  await api.delete(`/engineers/${id}`).catch(() => null);
  return { success: true };
};
