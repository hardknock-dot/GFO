import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getReports,
  getReportById,
  generateReport,
  updateReport,
  deleteReport,
} from '../services/reports';
import type { ReportSummary } from '../types';

export const useReports = () => {
  return useQuery({
    queryKey: ['reports'],
    queryFn: () => getReports(),
    staleTime: 1000 * 60 * 5,
  });
};

export const useReportDetail = (id: string) => {
  return useQuery({
    queryKey: ['report-detail', id],
    queryFn: () => getReportById(id),
    enabled: !!id,
  });
};

export const useGenerateReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { title: string; category: string; format: string }) => generateReport(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useUpdateReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ReportSummary> }) => updateReport(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['report-detail', variables.id] });
    },
  });
};

export const useDeleteReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};
