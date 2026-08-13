import api from './axios';
import type { DashboardMetrics } from '../types';

export const getDashboardMetrics = async (companyId?: string): Promise<DashboardMetrics> => {
  const params: Record<string, string> = {};
  if (companyId && companyId !== 'all-data') {
    params.company_id = companyId;
  }
  const res = await api.get('/dashboard', { params });
  return res.data;
};
