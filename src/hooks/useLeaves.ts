import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLeaves,
  getLeaveById,
  createLeaveRecord,
  updateLeaveRecord,
  deleteLeaveRecord,
} from '../services/leave';
import type { Leave } from '../types';
import { useCompany } from '../context/CompanyContext';

export const useLeaves = (params?: any) => {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.company_id || currentCompany?.id;
  const activeCompanyId = (companyId && companyId !== 'all-data') ? companyId : undefined;

  const queryParams = {
    ...params,
    companyId: params?.companyId !== undefined ? params.companyId : (params?.company_id !== undefined ? params.company_id : activeCompanyId),
  };

  return useQuery({
    queryKey: ['leaves', queryParams],
    queryFn: () => getLeaves(queryParams),
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
    mutationFn: ({ engineerId, data }: { engineerId: string; data: Partial<Leave> }) => createLeaveRecord(engineerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['engineer-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Leave> }) => updateLeaveRecord(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leave', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['engineer-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLeaveRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['engineer-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
