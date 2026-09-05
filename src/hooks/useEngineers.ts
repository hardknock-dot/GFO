import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEngineers,
  getEngineerById,
  createEngineer,
  updateEngineer,
  deleteEngineer,
} from '../services/engineers';
import type { EngineerQueryParams } from '../services/engineers';
import type { Engineer } from '../types';

import { useCompany } from '../context/CompanyContext';

import { useEffect } from 'react';

export const useEngineers = (params?: EngineerQueryParams) => {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();
  const rawId = currentCompany?.company_id || currentCompany?.id;

  let activeCompanyId: string | undefined = undefined;
  if (rawId && rawId !== 'all-data') {
    if (rawId === 'lam-research') {
      activeCompanyId = '11b9d863-b83c-4af3-8db5-b6e773f78235';
    } else if (rawId === 'axcelis') {
      activeCompanyId = 'f81bd16c-2f63-4818-a653-7486fe3f45ec';
    } else {
      activeCompanyId = rawId;
    }
  }

  const companyId = params?.company_id !== undefined ? params.company_id : activeCompanyId;

  const fullParams: EngineerQueryParams = {
    ...params,
    company_id: companyId,
    page: params?.page || 1,
    pageSize: params?.pageSize || params?.limit || 100,
  };

  const serializedKey = JSON.stringify(fullParams);

  const query = useQuery({
    queryKey: ['engineers', serializedKey],
    queryFn: () => getEngineers(fullParams),
    staleTime: 0,
  });

  const currentPage = fullParams.page || 1;

  useEffect(() => {
    if (query.data && currentPage < query.data.totalPages) {
      const nextPageParams = { ...fullParams, page: currentPage + 1 };
      queryClient.prefetchQuery({
        queryKey: ['engineers', JSON.stringify(nextPageParams)],
        queryFn: () => getEngineers(nextPageParams),
        staleTime: 0,
      });
    }
  }, [query.data?.totalPages, currentPage, serializedKey, queryClient]);

  return query;
};

export const useEngineerDetail = (id: string) => {
  return useQuery({
    queryKey: ['engineer', id],
    queryFn: () => getEngineerById(id),
    enabled: !!id,
  });
};

export const useCreateEngineer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Engineer>) => createEngineer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineers'] });
    },
  });
};

export const useUpdateEngineer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Engineer> }) => updateEngineer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['engineers'] });
      queryClient.invalidateQueries({ queryKey: ['engineer', variables.id] });
    },
  });
};

export const useDeleteEngineer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEngineer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineers'] });
    },
  });
};
