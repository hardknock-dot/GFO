import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import {
  getCompanyThemeSettings,
  updateCompanyThemeSettings,
} from '../services/companyTheme';
import type { CompanyThemeUpdatePayload } from '../services/companyTheme';

export const useCompanyTheme = (companyId?: string) => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const effectiveCid = companyId || user?.currentCompanyId || currentCompany?.company_id || currentCompany?.id;

  return useQuery({
    queryKey: ['company-theme', effectiveCid],
    queryFn: () => getCompanyThemeSettings(effectiveCid),
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateCompanyTheme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, companyId }: { data: CompanyThemeUpdatePayload; companyId?: string }) =>
      updateCompanyThemeSettings(data, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-theme'] });
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
    },
  });
};
