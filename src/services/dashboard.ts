import api from './axios';
import type { DashboardMetrics } from '../types';

export const getDashboardMetrics = async (companyIds?: string[] | string): Promise<DashboardMetrics> => {
  const urlParams = new URLSearchParams();
  if (Array.isArray(companyIds)) {
    const filtered = companyIds.filter((id) => id && id !== 'all-data');
    filtered.forEach((id) => urlParams.append('company_ids', id));
  } else if (companyIds && companyIds !== 'all-data') {
    urlParams.append('company_id', companyIds);
  }
  const queryString = urlParams.toString();
  const endpoint = queryString ? `/dashboard?${queryString}` : '/dashboard';
  const res = await api.get(endpoint);
  return res.data;
};
