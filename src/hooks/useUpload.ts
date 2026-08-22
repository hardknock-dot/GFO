import { useQuery } from '@tanstack/react-query';
import { getUploadHistory, getUploadHistoryById } from '../services/upload';
import { useCompany } from '../context/CompanyContext';

export const useUploadHistory = () => {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.company_id || currentCompany?.id || 'all-data';

  return useQuery({
    queryKey: ['bulk-upload-history', companyId],
    queryFn: () => getUploadHistory(companyId),
    staleTime: 1000 * 30, // 30 seconds
  });
};

export const useUploadHistoryById = (uploadId: string) => {
  return useQuery({
    queryKey: ['bulk-upload-history-detail', uploadId],
    queryFn: () => getUploadHistoryById(uploadId),
    enabled: !!uploadId,
  });
};
