import api from './axios';
import type { ReportsSummaryData, CategoryReportData } from '../types';

export const getReportsSummary = async (
  companyId?: string,
  startDate?: string,
  endDate?: string
): Promise<ReportsSummaryData> => {
  const params: Record<string, string> = {};
  if (companyId && companyId !== 'all-data') {
    params.company_id = companyId;
  }
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  const res = await api.get('/reports/summary', { params });
  return res.data;
};

export const getCategoryReport = async (
  category: string,
  companyId?: string,
  startDate?: string,
  endDate?: string
): Promise<CategoryReportData> => {
  const params: Record<string, string> = {};
  if (companyId && companyId !== 'all-data') {
    params.company_id = companyId;
  }
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  const res = await api.get(`/reports/category/${category}`, { params });
  return res.data;
};

export const downloadReportCsv = async (
  category: string,
  companyId?: string,
  startDate?: string,
  endDate?: string
): Promise<void> => {
  const params: Record<string, string> = { category };
  if (companyId && companyId !== 'all-data') {
    params.company_id = companyId;
  }
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  const res = await api.get('/reports/export/csv', {
    params,
    responseType: 'blob',
  });

  const blob = new Blob([res.data], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `ORMP_${category}_Report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
};
