import { useQuery, useInfiniteQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getVisaRecords,
  getVisaRecordById,
  createVisaRecord,
  updateVisaRecord,
  deleteVisaRecord,
  getExpiringVisas,
  renewVisa,
  updateVisaCommentStatus,
} from '../services/visa';

import type { Visa } from '../types';
import { useCompany } from '../context/CompanyContext';

export const useVisa = (params?: any) => {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.company_id || currentCompany?.id;
  const activeCompanyId = (companyId && companyId !== 'all-data') ? companyId : undefined;

  const queryParams = {
    ...params,
    companyId: params?.companyId !== undefined ? params.companyId : (params?.company_id !== undefined ? params.company_id : activeCompanyId),
  };

  return useQuery({
    queryKey: ['visas', queryParams],
    queryFn: () => getVisaRecords(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });
};

export const useProgressiveVisa = (params?: any) => {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.company_id || currentCompany?.id;
  const activeCompanyId = (companyId && companyId !== 'all-data') ? companyId : undefined;

  const queryParams = {
    ...params,
    companyId: params?.companyId !== undefined ? params.companyId : (params?.company_id !== undefined ? params.company_id : activeCompanyId),
  };

  return useInfiniteQuery({
    queryKey: ['progressive-visas', queryParams],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await getVisaRecords({ ...queryParams, page: pageParam, pageSize: 20 });
      return res;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage && lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useVisaDetail = (id: string) => {
  return useQuery({
    queryKey: ['visa-detail', id],
    queryFn: () => getVisaRecordById(id),
    enabled: !!id,
  });
};

export const useCreateVisa = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ engineerId, data }: { engineerId: string; data: Partial<Visa> }) => createVisaRecord(engineerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateVisa = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Visa> }) => updateVisaRecord(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['visas'] });
      queryClient.invalidateQueries({ queryKey: ['visa-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteVisa = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVisaRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useExpiringVisas = (days: number = 30) => {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.company_id || currentCompany?.id;
  const activeCompanyId = (companyId && companyId !== 'all-data') ? companyId : undefined;

  return useQuery({
    queryKey: ['expiring-visas', days, activeCompanyId || 'global'],
    queryFn: () => getExpiringVisas(days),
    staleTime: 1000 * 60 * 5,
  });
};

export const useRenewVisa = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (visaId: string) => renewVisa(visaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visas'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-visas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateVisaCommentStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, commentStatus }: { id: string; commentStatus: string }) =>
      updateVisaCommentStatus(id, commentStatus),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['visas'] });
      queryClient.invalidateQueries({ queryKey: ['visa-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['company-operational-alerts'] });
    },
  });
};

