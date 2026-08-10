import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSkills,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill,
  getEngineerSkills,
} from '../services/skills';
import type { Skill } from '../types';

export const useSkills = (params?: any) => {
  return useQuery({
    queryKey: ['skills', params],
    queryFn: () => getSkills(params),
    staleTime: 1000 * 60 * 5,
  });
};

export const useSkillDetail = (id: string) => {
  return useQuery({
    queryKey: ['skill-detail', id],
    queryFn: () => getSkillById(id),
    enabled: !!id,
  });
};

export const useCreateSkill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Skill>) => createSkill(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });
};

export const useUpdateSkill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Skill> }) => updateSkill(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['skill-detail', variables.id] });
    },
  });
};

export const useDeleteSkill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSkill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });
};

export const useEngineerSkills = (engineerId: string) => {
  return useQuery({
    queryKey: ['engineer-skills', engineerId],
    queryFn: () => getEngineerSkills(engineerId),
    enabled: !!engineerId,
  });
};
