import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getCompanyOperationalAlerts,
  getEngineerOperationalAlerts,
  getScheduleOperationalAlerts,
  type OperationalAlert,
} from '../services/operational';
import { useCompany } from '../context/CompanyContext';
import { useCompanySettings } from './useSettings';
import type { CompanySettings } from '../services/settings';

export const filterAlertsBySettings = (alerts: OperationalAlert[] = [], settings?: CompanySettings): OperationalAlert[] => {
  if (!settings) return alerts;
  return alerts.filter((alert) => {
    switch (alert.type) {
      case 'visa':
      case 'visa_comment':
        return settings.visa_alerts_enabled ?? true;
      case 'schedule':
      case 'deployment':
        return settings.deployment_alerts_enabled ?? true;
      case 'travel':
        return settings.travel_alerts_enabled ?? true;
      case 'leave':
      case 'pto_conflict':
        return settings.leave_alerts_enabled ?? true;
      case 'missed_schedule':
        return settings.missed_schedule_alerts_enabled ?? true;
      case 'schedule_comment':
      case 'remark':
        return settings.operational_remark_alerts_enabled ?? true;
      case 'performance':
        return settings.performance_alerts_enabled ?? true;
      default:
        return true;
    }
  });
};

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

  const { data: settings } = useCompanySettings(activeCompanyId);

  const queryResult = useQuery({
    queryKey: ['operational-alerts', activeCompanyId || 'global'],
    queryFn: () => getCompanyOperationalAlerts(activeCompanyId),
    staleTime: 1000 * 60 * 5,
  });

  const filteredAlerts = useMemo(() => {
    if (!queryResult.data) return [];
    return filterAlertsBySettings(queryResult.data, settings);
  }, [queryResult.data, settings]);

  return {
    ...queryResult,
    data: filteredAlerts,
    allAlerts: queryResult.data || [],
    settings,
  };
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
