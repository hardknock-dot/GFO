import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLeaves,
  getLeaveById,
  createLeave,
  updateLeave,
  deleteLeave,
} from '../services/leave';
import type { Leave } from '../types';

export const useLeaves = (params?: any) => {
  return useQuery({
    queryKey: ['leaves', params],
    queryFn: () => getLeaves(params),
    staleTime: 1000 * 60 * 5,
  });
};

export const useLeaveDetail = (id: string) => {
  return useQuery({
    queryKey: ['leave', id],
    queryFn: () => getLeaveById(id),
    enabled: !!id,
  });
};

export const useCreateLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Leave>) => createLeave(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
  });
};

export const useUpdateLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Leave> }) => updateLeave(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leave', variables.id] });
    },
  });
};

export const useDeleteLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLeave(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
  });
};
