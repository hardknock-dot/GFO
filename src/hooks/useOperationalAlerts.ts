import { useQuery } from '@tanstack/react-query';
import {
  getCompanyOperationalAlerts,
  getEngineerOperationalAlerts,
  getScheduleOperationalAlerts,
} from '../services/operational';
import { useCompany } from '../context/CompanyContext';

export const useCompanyOperationalAlerts = (companyId?: string) => {
  const { currentCompany } = useCompany();
  const contextCompanyId = currentCompany?.company_id || currentCompany?.id;
  const activeCompanyId = companyId !== undefined ? companyId : ((contextCompanyId && contextCompanyId !== 'all-data') ? contextCompanyId : undefined);

  return useQuery({
    queryKey: ['operational-alerts', activeCompanyId || 'global'],
    queryFn: () => getCompanyOperationalAlerts(activeCompanyId),
    staleTime: 1000 * 60 * 5, // 5 mins
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
