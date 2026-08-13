import api from './axios';

export interface OperationalAlert {
  id: string;
  type: 'schedule' | 'leave' | 'visa' | 'travel' | 'performance' | 'skills' | 'missed_schedule';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  engineer_id?: string;
  schedule_id?: string;
  company_id?: string;
  company_name?: string;
}

export const getCompanyOperationalAlerts = async (companyId?: string): Promise<OperationalAlert[]> => {
  const params: Record<string, string> = {};
  if (companyId && companyId !== 'all-data') {
    params.company_id = companyId;
  }
  const res = await api.get('/dashboard/operational-alerts', { params });
  return res.data;
};

export const getEngineerOperationalAlerts = async (engineerId: string): Promise<OperationalAlert[]> => {
  const res = await api.get(`/engineers/${engineerId}/operational-alerts`);
  return res.data;
};

export const getScheduleOperationalAlerts = async (scheduleId: string): Promise<OperationalAlert[]> => {
  const res = await api.get(`/schedules/${scheduleId}/operational-alerts`);
  return res.data;
};
