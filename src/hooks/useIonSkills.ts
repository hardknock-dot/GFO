import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getIonTools,
  getIonExperiences,
  getIonExperienceById,
  createIonExperience,
  updateIonExperience,
  deleteIonExperience,
  getEngineerIonCurrentSummary,
  getEngineerIonHistory,
  getIonCompanySummary,
} from '../services/ionSkills';
import type {
  IonSkillQueryParams,
  IonSkillExperienceCreatePayload,
  IonSkillExperienceUpdatePayload,
} from '../types';

export const useIonTools = (activeOnly: boolean = true) => {
  return useQuery({
    queryKey: ['ion-tools', activeOnly],
    queryFn: () => getIonTools(activeOnly),
    staleTime: 5 * 60 * 1000,
  });
};

export const useIonExperiences = (params?: IonSkillQueryParams) => {
  return useQuery({
    queryKey: ['ion-experiences', params],
    queryFn: () => getIonExperiences(params),
  });
};

export const useIonExperience = (id?: string) => {
  return useQuery({
    queryKey: ['ion-experience', id],
    queryFn: () => (id ? getIonExperienceById(id) : Promise.reject('No ID provided')),
    enabled: Boolean(id),
  });
};

export const useCreateIonExperience = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: IonSkillExperienceCreatePayload) => createIonExperience(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ion-experiences'] });
      queryClient.invalidateQueries({ queryKey: ['ion-summary'] });
      queryClient.invalidateQueries({ queryKey: ['ion-engineer-current'] });
      queryClient.invalidateQueries({ queryKey: ['ion-engineer-history'] });
    },
  });
};

export const useUpdateIonExperience = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: IonSkillExperienceUpdatePayload }) =>
      updateIonExperience(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ion-experiences'] });
      queryClient.invalidateQueries({ queryKey: ['ion-experience', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['ion-summary'] });
      queryClient.invalidateQueries({ queryKey: ['ion-engineer-current'] });
      queryClient.invalidateQueries({ queryKey: ['ion-engineer-history'] });
    },
  });
};

export const useDeleteIonExperience = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIonExperience(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ion-experiences'] });
      queryClient.invalidateQueries({ queryKey: ['ion-summary'] });
      queryClient.invalidateQueries({ queryKey: ['ion-engineer-current'] });
      queryClient.invalidateQueries({ queryKey: ['ion-engineer-history'] });
    },
  });
};

export const useEngineerIonCurrentSummary = (engineerId?: string) => {
  return useQuery({
    queryKey: ['ion-engineer-current', engineerId],
    queryFn: () =>
      engineerId ? getEngineerIonCurrentSummary(engineerId) : Promise.reject('No engineerId'),
    enabled: Boolean(engineerId),
  });
};

export const useEngineerIonHistory = (engineerId?: string, toolId?: string) => {
  return useQuery({
    queryKey: ['ion-engineer-history', engineerId, toolId],
    queryFn: () =>
      engineerId ? getEngineerIonHistory(engineerId, toolId) : Promise.reject('No engineerId'),
    enabled: Boolean(engineerId),
  });
};

export const useIonCompanySummary = (params?: {
  search?: string;
  tool_id?: string;
  min_level?: number;
}) => {
  return useQuery({
    queryKey: ['ion-summary', params],
    queryFn: () => getIonCompanySummary(params),
  });
};
