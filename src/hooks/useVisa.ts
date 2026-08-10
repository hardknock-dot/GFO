import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getVisaRecords,
  getVisaRecordById,
  createVisaRecord,
  updateVisaRecord,
  deleteVisaRecord,
  getExpiringVisas,
  renewVisa,
} from '../services/visa';
import type { Visa } from '../types';

export const useVisa = (params?: any) => {
  return useQuery({
    queryKey: ['visas', params],
    queryFn: () => getVisaRecords(params),
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
    mutationFn: (data: Partial<Visa>) => createVisaRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visas'] });
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
    },
  });
};

export const useDeleteVisa = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVisaRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visas'] });
    },
  });
};

export const useExpiringVisas = (days: number = 30) => {
  return useQuery({
    queryKey: ['expiring-visas', days],
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
    },
  });
};
