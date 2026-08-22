import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
  getEngineerMe,
  getEngineerMeSchedules,
  getEngineerMeNextSchedule,
  updateScheduleComments,
  getEngineerMeSkills,
  createEngineerSkill,
  updateEngineerSkill,
  deleteEngineerSkill,
  getEngineerMeVisa,
  updateVisaComments,
  getEngineerMePerformance,
  getEngineerMeReportSummary,
  createEngineerMeLeave,
} from '../services/engineerSelfService';

export const useCreateEngineerMeLeave = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const engineerId = user?.engineerId || user?.id || 'me';

  return useMutation({
    mutationFn: (data: { leave_type: string; requested_date: string; comments?: string }) =>
      createEngineerMeLeave(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineer-me-leaves', engineerId] });
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['company-operational-alerts'] });
    },
  });
};

import type { Skill } from '../types';

import { getEngineerReportSummary } from '../services/engineers';

export const useEngineerMe = () => {
  const { user } = useAuth();
  const engineerId = user?.engineerId || user?.id || 'me';
  const isEngineer = user?.role === 'Field Engineer' || user?.role === 'Engineer';

  return useQuery({
    queryKey: ['engineer-me', engineerId],
    queryFn: () => getEngineerMe(),
    enabled: isEngineer,
    staleTime: 1000 * 60 * 5,
  });
};

export const useEngineerMeSchedules = () => {
  const { user } = useAuth();
  const engineerId = user?.engineerId || user?.id || 'me';

  return useQuery({
    queryKey: ['engineer-me-schedules', engineerId],
    queryFn: () => getEngineerMeSchedules(),
    staleTime: 1000 * 60 * 5,
  });
};

export const useEngineerMeNextSchedule = () => {
  const { user } = useAuth();
  const engineerId = user?.engineerId || user?.id || 'me';

  return useQuery({
    queryKey: ['engineer-me-next-schedule', engineerId],
    queryFn: () => getEngineerMeNextSchedule(),
    staleTime: 1000 * 60 * 2,
  });
};

export const useUpdateEngineerMeScheduleComments = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const engineerId = user?.engineerId || user?.id || 'me';

  return useMutation({
    mutationFn: ({ scheduleId, remarks }: { scheduleId: string; remarks: string }) =>
      updateScheduleComments(scheduleId, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineer-me-schedules', engineerId] });
      queryClient.invalidateQueries({ queryKey: ['engineer-me-next-schedule', engineerId] });
      queryClient.invalidateQueries({ queryKey: ['engineer-me-reports', engineerId] });
      queryClient.invalidateQueries({ queryKey: ['engineer-report-summary'] });
    },
  });
};

export const useEngineerMeSkills = () => {
  const { user } = useAuth();
  const engineerId = user?.engineerId || user?.id || 'me';

  return useQuery({
    queryKey: ['engineer-me-skills', engineerId],
    queryFn: () => getEngineerMeSkills(),
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateEngineerMeSkill = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const engineerId = user?.engineerId || user?.id || 'me';

  return useMutation({
    mutationFn: (data: Partial<Skill>) => createEngineerSkill(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineer-me-skills', engineerId] });
      queryClient.invalidateQueries({ queryKey: ['engineer-me-reports', engineerId] });
      queryClient.invalidateQueries({ queryKey: ['engineer-report-summary'] });
    },
  });
};

export const useUpdateEngineerMeSkill = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const engineerId = user?.engineerId || user?.id || 'me';

  return useMutation({
    mutationFn: ({ skillId, data }: { skillId: string; data: Partial<Skill> }) =>
      updateEngineerSkill(skillId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineer-me-skills', engineerId] });
      queryClient.invalidateQueries({ queryKey: ['engineer-me-reports', engineerId] });
      queryClient.invalidateQueries({ queryKey: ['engineer-report-summary'] });
    },
  });
};

export const useDeleteEngineerMeSkill = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const engineerId = user?.engineerId || user?.id || 'me';

  return useMutation({
    mutationFn: (skillId: string) => deleteEngineerSkill(skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineer-me-skills', engineerId] });
      queryClient.invalidateQueries({ queryKey: ['engineer-me-reports', engineerId] });
      queryClient.invalidateQueries({ queryKey: ['engineer-report-summary'] });
    },
  });
};


export const useEngineerMeVisa = () => {
  const { user } = useAuth();
  const engineerId = user?.engineerId || user?.id || 'me';

  return useQuery({
    queryKey: ['engineer-me-visa', engineerId],
    queryFn: () => getEngineerMeVisa(),
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateEngineerMeVisaComments = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const engineerId = user?.engineerId || user?.id || 'me';

  return useMutation({
    mutationFn: ({ visaId, comments }: { visaId: string; comments: string }) =>
      updateVisaComments(visaId, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engineer-me-visa', engineerId] });
      queryClient.invalidateQueries({ queryKey: ['engineer-me-reports', engineerId] });
      queryClient.invalidateQueries({ queryKey: ['engineer-report-summary'] });
    },
  });
};

export const useEngineerMePerformance = () => {
  const { user } = useAuth();
  const engineerId = user?.engineerId || user?.id || 'me';

  return useQuery({
    queryKey: ['engineer-me-performance', engineerId],
    queryFn: () => getEngineerMePerformance(),
    staleTime: 1000 * 60 * 5,
  });
};

export const useEngineerMeReports = () => {
  const { user } = useAuth();
  const engineerId = user?.engineerId || user?.id || 'me';
  const isEngineer = user?.role === 'Field Engineer' || user?.role === 'Engineer';

  return useQuery({
    queryKey: ['engineer-me-reports', engineerId],
    queryFn: () => getEngineerMeReportSummary(),
    enabled: isEngineer,
    staleTime: 1000 * 60 * 5,
  });
};

export const useEngineerReportSummary = (engineerId: string, isEngineerUser: boolean) => {
  return useQuery({
    queryKey: ['engineer-report-summary', engineerId, isEngineerUser],
    queryFn: () => isEngineerUser ? getEngineerMeReportSummary() : getEngineerReportSummary(engineerId),
    enabled: !!engineerId,
    staleTime: 1000 * 60 * 5,
  });
};

