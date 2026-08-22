import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getDashboardMetrics } from '../services/dashboard';
import { useCompany } from '../context/CompanyContext';

export const useDashboard = () => {
  const { currentCompany, selectedCompanyIds } = useCompany();
  const rawId = currentCompany?.company_id || currentCompany?.id;

  let queryTarget: string[] | string | undefined = undefined;

  if (selectedCompanyIds && selectedCompanyIds.length > 0) {
    queryTarget = selectedCompanyIds;
  } else if (rawId && rawId !== 'all-data') {
    queryTarget = rawId;
  }

  const cacheKey = Array.isArray(queryTarget)
    ? [...queryTarget].sort().join(',')
    : (queryTarget || 'global');

  return useQuery({
    queryKey: ['dashboard', cacheKey],
    queryFn: () => getDashboardMetrics(queryTarget),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });
};
