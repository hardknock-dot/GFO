import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  updateScheduleCommentStatus,
} from '../services/schedule';
import type { Schedule } from '../types';
import { useCompany } from '../context/CompanyContext';

import { useEffect } from 'react';

export const useSchedule = (params?: any) => {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.company_id || currentCompany?.id;
  const activeCompanyId = (companyId && companyId !== 'all-data') ? companyId : undefined;

  const targetCompanyId = params?.companyId !== undefined ? params.companyId : (params?.company_id !== undefined ? params.company_id : activeCompanyId);
  const currentPage = params?.page || 1;
  const pageSize = params?.pageSize || params?.page_size || 20;
  const search = params?.search || '';
  const status = params?.status || params?.schedule_status || '';

  const queryParams = {
    page: currentPage,
    page_size: pageSize,
    search: search || undefined,
    schedule_status: status || undefined,
    company_id: targetCompanyId,
  };

  const query = useQuery({
    queryKey: ['schedules', targetCompanyId, currentPage, pageSize, search, status],
    queryFn: () => getSchedules(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (query.data && currentPage < query.data.totalPages) {
      const nextPageParams = { ...queryParams, page: currentPage + 1 };
      queryClient.prefetchQuery({
        queryKey: ['schedules', targetCompanyId, currentPage + 1, pageSize, search, status],
        queryFn: () => getSchedules(nextPageParams),
        staleTime: 1000 * 60 * 5,
      });
    }
  }, [query.data?.totalPages, currentPage, targetCompanyId, pageSize, search, status, queryClient]);

  return query;
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

export const useUpdateScheduleCommentStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, commentStatus }: { id: string; commentStatus: string }) =>
      updateScheduleCommentStatus(id, commentStatus),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedule', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['company-operational-alerts'] });
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

