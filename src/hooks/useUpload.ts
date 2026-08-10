import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUploads,
  getUploadById,
  uploadModuleFile,
  updateUpload,
  deleteUpload,
} from '../services/upload';
import type { UploadCardItem } from '../types';

export const useUploads = () => {
  return useQuery({
    queryKey: ['uploads'],
    queryFn: () => getUploads(),
    staleTime: 1000 * 60 * 5,
  });
};

export const useUploadDetail = (id: string) => {
  return useQuery({
    queryKey: ['upload-detail', id],
    queryFn: () => getUploadById(id),
    enabled: !!id,
  });
};

export const useUploadFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, file }: { cardId: string; file: File }) => uploadModuleFile(cardId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
    },
  });
};

export const useUpdateUpload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UploadCardItem> }) => updateUpload(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
      queryClient.invalidateQueries({ queryKey: ['upload-detail', variables.id] });
    },
  });
};

export const useDeleteUpload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUpload(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
    },
  });
};
