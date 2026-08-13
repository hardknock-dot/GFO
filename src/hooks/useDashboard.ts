import { useQuery } from '@tanstack/react-query';
import { getDashboardMetrics } from '../services/dashboard';
import { useCompany } from '../context/CompanyContext';

export const useDashboard = () => {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.company_id || currentCompany?.id;
  const activeCompanyId = (companyId && companyId !== 'all-data') ? companyId : undefined;

  return useQuery({
    queryKey: ['dashboard', activeCompanyId || 'global'],
    queryFn: () => getDashboardMetrics(activeCompanyId),
    staleTime: 1000 * 60 * 5, // 5 mins
  });
};
