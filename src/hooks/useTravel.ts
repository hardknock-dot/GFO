import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTravelRecords,
  getTravelRecordById,
  createTravelRecord,
  updateTravelRecord,
  deleteTravelRecord,
} from '../services/travel';
import type { Travel } from '../types';

export const useTravel = (params?: any) => {
  return useQuery({
    queryKey: ['travel', params],
    queryFn: () => getTravelRecords(params),
    staleTime: 1000 * 60 * 5,
  });
};

export const useTravelDetail = (id: string) => {
  return useQuery({
    queryKey: ['travel-detail', id],
    queryFn: () => getTravelRecordById(id),
    enabled: !!id,
  });
};

export const useCreateTravel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: string; data: Partial<Travel> }) => createTravelRecord(scheduleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
};

export const useUpdateTravel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Travel> }) => updateTravelRecord(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['travel'] });
      queryClient.invalidateQueries({ queryKey: ['travel-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
};

export const useDeleteTravel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTravelRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
};
