import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPerformanceRecords,
  getPerformanceRecordById,
  createPerformanceRecord,
  updatePerformanceRecord,
  deletePerformanceRecord,
} from '../services/performance';
import type { Performance } from '../types';

export const usePerformance = (params?: any) => {
  return useQuery({
    queryKey: ['performance', params],
    queryFn: () => getPerformanceRecords(params),
    staleTime: 1000 * 60 * 5,
  });
};

export const usePerformanceDetail = (id: string) => {
  return useQuery({
    queryKey: ['performance-detail', id],
    queryFn: () => getPerformanceRecordById(id),
    enabled: !!id,
  });
};

export const useCreatePerformance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Performance>) => createPerformanceRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance'] });
    },
  });
};

export const useUpdatePerformance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Performance> }) => updatePerformanceRecord(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['performance'] });
      queryClient.invalidateQueries({ queryKey: ['performance-detail', variables.id] });
    },
  });
};

export const useDeletePerformance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePerformanceRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance'] });
    },
  });
};
