import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEngineerDeletionRequests,
  requestEngineerDeletion,
  approveEngineerDeletionRequest,
  rejectEngineerDeletionRequest,
} from '../services/engineerDeletionRequests';

export const useEngineerDeletionRequests = (companyId?: string, status?: string) => {
  return useQuery({
    queryKey: ['engineer-deletion-requests', companyId, status],
    queryFn: () => getEngineerDeletionRequests(companyId, status),
    staleTime: 1000 * 60 * 2,
  });
};

export const useRequestEngineerDeletion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ engineerId, reason }: { engineerId: string; reason?: string }) =>
      requestEngineerDeletion(engineerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineer-deletion-requests'] });
      queryClient.invalidateQueries({ queryKey: ['engineers'] });
      queryClient.invalidateQueries({ queryKey: ['company-operational-alerts'] });
    },
  });
};

export const useApproveEngineerDeletionRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => approveEngineerDeletionRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineer-deletion-requests'] });
      queryClient.invalidateQueries({ queryKey: ['engineers'] });
      queryClient.invalidateQueries({ queryKey: ['company-operational-alerts'] });
    },
  });
};

export const useRejectEngineerDeletionRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, reviewComment }: { requestId: string; reviewComment?: string }) =>
      rejectEngineerDeletionRequest(requestId, reviewComment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineer-deletion-requests'] });
      queryClient.invalidateQueries({ queryKey: ['engineers'] });
      queryClient.invalidateQueries({ queryKey: ['company-operational-alerts'] });
    },
  });
};
