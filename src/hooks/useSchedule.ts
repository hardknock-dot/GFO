import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from '../services/schedule';
import type { Schedule } from '../types';

export const useSchedule = (params?: any) => {
  return useQuery({
    queryKey: ['schedules', params],
    queryFn: () => getSchedules(params),
    staleTime: 1000 * 60 * 5,
  });
};

export const useSchedules = (params?: any) => {
  return useQuery({
    queryKey: ['schedules', params],
    queryFn: () => getSchedules(params),
    staleTime: 1000 * 60 * 5,
  });
};

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
    },
  });
};

export const useDeleteSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
};
