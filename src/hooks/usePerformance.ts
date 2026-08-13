import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPerformanceRecords,
  getPerformanceRecordById,
  createPerformanceRecord,
  updatePerformanceRecord,
  deletePerformanceRecord,
} from '../services/performance';
import type { Performance } from '../types';
import { useCompany } from '../context/CompanyContext';

export const usePerformance = (params?: any) => {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.company_id || currentCompany?.id;
  const activeCompanyId = (companyId && companyId !== 'all-data') ? companyId : undefined;

  const queryParams = {
    ...params,
    companyId: params?.companyId !== undefined ? params.companyId : (params?.company_id !== undefined ? params.company_id : activeCompanyId),
  };

  return useQuery({
    queryKey: ['performance', queryParams],
    queryFn: () => getPerformanceRecords(queryParams),
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
    mutationFn: ({ scheduleId, data }: { scheduleId: string; data: Partial<Performance> }) => createPerformanceRecord(scheduleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeletePerformance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePerformanceRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
