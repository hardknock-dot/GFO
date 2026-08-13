import { useQuery } from '@tanstack/react-query';
import {
  getReportsSummary,
  getCategoryReport,
} from '../services/reports';
import { useCompany } from '../context/CompanyContext';

export const useReportsSummary = (companyId?: string, startDate?: string, endDate?: string) => {
  const { currentCompany } = useCompany();
  const contextCompanyId = currentCompany?.company_id || currentCompany?.id;
  const activeCompanyId = companyId !== undefined ? companyId : ((contextCompanyId && contextCompanyId !== 'all-data') ? contextCompanyId : undefined);

  return useQuery({
    queryKey: ['reports', 'summary', activeCompanyId || 'global', startDate || 'all', endDate || 'all'],
    queryFn: () => getReportsSummary(activeCompanyId, startDate, endDate),
    staleTime: 1000 * 60 * 5,
  });
};

export const useCategoryReport = (category: string, companyId?: string, startDate?: string, endDate?: string) => {
  const { currentCompany } = useCompany();
  const contextCompanyId = currentCompany?.company_id || currentCompany?.id;
  const activeCompanyId = companyId !== undefined ? companyId : ((contextCompanyId && contextCompanyId !== 'all-data') ? contextCompanyId : undefined);

  return useQuery({
    queryKey: ['reports', 'category', category, activeCompanyId || 'global', startDate || 'all', endDate || 'all'],
    queryFn: () => getCategoryReport(category, activeCompanyId, startDate, endDate),
    staleTime: 1000 * 60 * 5,
    enabled: !!category,
  });
};
