import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMissedSchedules,
  createMissedScheduleRecord,
  updateMissedScheduleRecord,
  deleteMissedScheduleRecord,
} from '../services/missedSchedule';
import type { MissedSchedule } from '../types';

export const useMissedSchedules = (params?: any) => {
  return useQuery({
    queryKey: ['missedSchedules', params],
    queryFn: () => getMissedSchedules(params),
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
    },
  });
};

export const useDeleteMissedSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMissedScheduleRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missedSchedules'] });
    },
  });
};
