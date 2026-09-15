import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import {
  getDeploymentDiary,
  createDeploymentDiary,
  updateDeploymentDiary,
  deleteDeploymentDiary
} from '../services/deploymentDiary';
import type {
  DeploymentDiaryCreatePayload,
  DeploymentDiaryUpdatePayload
} from '../types';

export const useDeploymentDiaries = (params?: {
  engineer_id?: string;
  schedule_id?: string;
  entry_date?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  page?: number;
  page_size?: number;
}) => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const companyId = user?.currentCompanyId || currentCompany?.company_id || currentCompany?.id;

  return useQuery({
    queryKey: ['deployment-diaries', companyId, params],
    queryFn: () => getDeploymentDiary(params),
    staleTime: 1000 * 60 * 2,
  });
};

export const useCreateDeploymentDiary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DeploymentDiaryCreatePayload) => createDeploymentDiary(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployment-diaries'] });
    },
  });
};

export const useUpdateDeploymentDiary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DeploymentDiaryUpdatePayload }) =>
      updateDeploymentDiary(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployment-diaries'] });
    },
  });
};

export const useDeleteDeploymentDiary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDeploymentDiary(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployment-diaries'] });
    },
  });
};
