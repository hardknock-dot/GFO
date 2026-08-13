import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMissedSchedules,
  createMissedScheduleRecord,
  updateMissedScheduleRecord,
  deleteMissedScheduleRecord,
} from '../services/missedSchedule';
import type { MissedSchedule } from '../types';
import { useCompany } from '../context/CompanyContext';

export const useMissedSchedules = (params?: any) => {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.company_id || currentCompany?.id;
  const activeCompanyId = (companyId && companyId !== 'all-data') ? companyId : undefined;

  const queryParams = {
    ...params,
    companyId: params?.companyId !== undefined ? params.companyId : (params?.company_id !== undefined ? params.company_id : activeCompanyId),
  };

  return useQuery({
    queryKey: ['missedSchedules', queryParams],
    queryFn: () => getMissedSchedules(queryParams),
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateMissedSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: string; data: Partial<MissedSchedule> }) =>
      createMissedScheduleRecord(scheduleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missedSchedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateMissedSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MissedSchedule> }) =>
      updateMissedScheduleRecord(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missedSchedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteMissedSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMissedScheduleRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missedSchedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
