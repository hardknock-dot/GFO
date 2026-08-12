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

export const useEngineers = (params?: EngineerQueryParams) => {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.company_id || currentCompany?.id;
  const activeCompanyId = (companyId && companyId !== 'all-data') ? companyId : undefined;

  const queryParams = {
    ...params,
    company_id: params?.company_id !== undefined ? params.company_id : activeCompanyId,
  };

  return useQuery({
    queryKey: ['engineers', queryParams],
    queryFn: () => getEngineers(queryParams),
    staleTime: 1000 * 60 * 5, // 5 mins
  });
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
