import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from '../services/schedule';
import type { Schedule } from '../types';
import { useCompany } from '../context/CompanyContext';

export const useSchedule = (params?: any) => {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.company_id || currentCompany?.id;
  const activeCompanyId = (companyId && companyId !== 'all-data') ? companyId : undefined;

  const queryParams = {
    ...params,
    companyId: params?.companyId !== undefined ? params.companyId : (params?.company_id !== undefined ? params.company_id : activeCompanyId),
  };

  return useQuery({
    queryKey: ['schedules', queryParams],
    queryFn: () => getSchedules(queryParams),
    staleTime: 1000 * 60 * 5,
  });
};

export const useSchedules = useSchedule;

export const useScheduleDetail = (id: string) => {
  return useQuery({
    queryKey: ['schedule', id],
    queryFn: () => getScheduleById(id),
    enabled: !!id,
  });
};

export const useCreateSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ engineerId, data }: { engineerId: string; data: Partial<Schedule> }) => createSchedule(engineerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Schedule> }) => updateSchedule(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedule', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
