import { useQuery } from '@tanstack/react-query';
import {
  getCompanyOperationalAlerts,
  getEngineerOperationalAlerts,
  getScheduleOperationalAlerts,
} from '../services/operational';
import { useCompany } from '../context/CompanyContext';

export const useCompanyOperationalAlerts = (companyId?: string) => {
  const { currentCompany } = useCompany();
  const rawId = companyId !== undefined ? companyId : (currentCompany?.company_id || currentCompany?.id);
  
  let activeCompanyId: string | undefined = undefined;
  if (rawId && rawId !== 'all-data') {
    if (rawId === 'lam-research') {
      activeCompanyId = '11b9d863-b83c-4af3-8db5-b6e773f78235';
    } else if (rawId === 'axcelis') {
      activeCompanyId = 'f81bd16c-2f63-4818-a653-7486fe3f45ec';
    } else {
      activeCompanyId = rawId;
    }
  }

  return useQuery({
    queryKey: ['operational-alerts', activeCompanyId || 'global'],
    queryFn: () => getCompanyOperationalAlerts(activeCompanyId),
    staleTime: 1000 * 60 * 5,
  });
};

export const useEngineerOperationalAlerts = (engineerId: string) => {
  return useQuery({
    queryKey: ['engineer-operational-alerts', engineerId],
    queryFn: () => getEngineerOperationalAlerts(engineerId),
    enabled: !!engineerId,
  });
};

export const useScheduleOperationalAlerts = (scheduleId: string) => {
  return useQuery({
    queryKey: ['schedule-operational-alerts', scheduleId],
    queryFn: () => getScheduleOperationalAlerts(scheduleId),
    enabled: !!scheduleId,
  });
};
