import api from './axios';
import type { ReportSummary } from '../types';

const MOCK_REPORTS: ReportSummary[] = [
  {
    id: 'rep-001',
    title: 'Global Field Engineer Deployment Matrix Q3',
    category: 'Engineers',
    generatedAt: '2026-07-28 14:30:00',
    generatedBy: 'System Administrator',
    format: 'PDF',
    downloadUrl: '#',
  },
  {
    id: 'rep-002',
    title: 'APAC Visa Expiry Audit & Risk Assessment',
    category: 'Visa',
    generatedAt: '2026-07-25 09:15:00',
    generatedBy: 'Global Mobility Operations',
    format: 'XLSX',
    downloadUrl: '#',
  },
  {
    id: 'rep-003',
    title: 'Semiconductor Tool Certification Utilization Summary',
    category: 'Utilization',
    generatedAt: '2026-07-20 16:45:00',
    generatedBy: 'Resource Manager',
    format: 'CSV',
    downloadUrl: '#',
  },
];

export const getReports = async (): Promise<ReportSummary[]> => {
  try {
    const res = await api.get('/reports');
    return res.data;
  } catch (_err) {
    return MOCK_REPORTS;
  }
};

export const getReportById = async (id: string): Promise<ReportSummary | null> => {
  try {
    const res = await api.get(`/reports/${id}`);
    return res.data;
  } catch (_err) {
    // Fallback
  }
  return MOCK_REPORTS.find((r) => r.id === id) || null;
};

export const generateReport = async (params: { title: string; category: string; format: string }): Promise<ReportSummary> => {
  try {
    const res = await api.post('/reports/generate', params);
    return res.data;
  } catch (_err) {
    // Fallback
  }

  return {
    id: `rep-${Date.now()}`,
    title: params.title,
    category: params.category as any,
    generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    generatedBy: 'Marcus Vance',
    format: params.format as any,
    downloadUrl: '#',
  };
};

export const updateReport = async (id: string, data: Partial<ReportSummary>): Promise<ReportSummary> => {
  try {
    const res = await api.put(`/reports/${id}`, data);
    return res.data;
  } catch (_err) {
    // Fallback
  }
  const found = MOCK_REPORTS.find((r) => r.id === id) || MOCK_REPORTS[0];
  return { ...found, ...data, id } as ReportSummary;
};

export const deleteReport = async (id: string): Promise<{ success: boolean }> => {
  try {
    await api.delete(`/reports/${id}`);
  } catch (_err) {
    // Fallback
  }
  return { success: true };
};

// Export abstractions
export const exportExcel = async (reportId: string): Promise<Blob> => {
  try {
    const res = await api.get(`/reports/${reportId}/export/excel`, { responseType: 'blob' });
    return res.data;
  } catch (_err) {
    // Fallback
  }
  return new Blob(['Mock Excel File Content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const exportCsv = async (reportId: string): Promise<Blob> => {
  try {
    const res = await api.get(`/reports/${reportId}/export/csv`, { responseType: 'blob' });
    return res.data;
  } catch (_err) {
    // Fallback
  }
  return new Blob(['Mock CSV File Content'], { type: 'text/csv' });
};

export const exportPdf = async (reportId: string): Promise<Blob> => {
  try {
    const res = await api.get(`/reports/${reportId}/export/pdf`, { responseType: 'blob' });
    return res.data;
  } catch (_err) {
    // Fallback
  }
  return new Blob(['Mock PDF File Content'], { type: 'application/pdf' });
};
