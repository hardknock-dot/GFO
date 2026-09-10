import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCompanySettings, updateCompanySettings, type CompanySettings, type CompanySettingsUpdate } from '../services/settings';

export const useCompanySettings = (companyId?: string) => {
  return useQuery<CompanySettings>({
    queryKey: ['company-settings', companyId || 'current'],
    queryFn: () => getCompanySettings(companyId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateCompanySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CompanySettingsUpdate) => updateCompanySettings(payload),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(['company-settings', updatedSettings.company_id], updatedSettings);
      queryClient.setQueryData(['company-settings', 'current'], updatedSettings);
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      queryClient.invalidateQueries({ queryKey: ['operational-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['visas'] });
    },
  });
};
