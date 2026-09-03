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
  const engineerId = params?.engineerId || params?.engineer_id || undefined;
  const currentPage = params?.page || 1;
  const pageSize = params?.pageSize || params?.page_size || 20;
  const search = params?.search || '';
  const status = params?.status || params?.schedule_status || '';
  const hasComments = params?.hasComments !== undefined ? params.hasComments : (params?.has_comments !== undefined ? params.has_comments : undefined);
  const commentAdressal = params?.commentAdressal !== undefined ? params.commentAdressal : (params?.comment_adressal !== undefined ? params.comment_adressal : undefined);

  const queryParams = {
    page: currentPage,
    page_size: pageSize,
    search: search || undefined,
    schedule_status: status || undefined,
    company_id: targetCompanyId,
    engineer_id: engineerId,
    has_comments: hasComments,
    comment_adressal: commentAdressal,
  };

  const query = useQuery({
    queryKey: ['schedules', targetCompanyId, engineerId, currentPage, pageSize, search, status, hasComments, commentAdressal],
    queryFn: () => getSchedules(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  useEffect(() => {
    if (query.data && currentPage < query.data.totalPages) {
      const nextPageParams = { ...queryParams, page: currentPage + 1 };
      queryClient.prefetchQuery({
        queryKey: ['schedules', targetCompanyId, engineerId, currentPage + 1, pageSize, search, status],
        queryFn: () => getSchedules(nextPageParams),
        staleTime: 1000 * 60 * 5,
      });
    }
  }, [query.data?.totalPages, currentPage, targetCompanyId, engineerId, pageSize, search, status, queryClient]);

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
    mutationFn: ({ id, commentStatus, commentAdressal }: { id: string; commentStatus?: string; commentAdressal?: boolean | null }) => {
      const param = commentAdressal !== undefined ? commentAdressal : (commentStatus === 'UNADDRESSED' ? false : null);
      return updateScheduleCommentStatus(id, param);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedule', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['company-operational-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['engineer'] });
      queryClient.invalidateQueries({ queryKey: ['engineer-me'] });
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

