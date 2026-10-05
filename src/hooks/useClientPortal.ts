import { useQuery } from '@tanstack/react-query';
import {
  getClientOverview,
  getClientCompanies,
  getClientCompanyDetail,
  getClientWorkforce,
  getClientExpertise,
  getClientDeployments,
  getClientGeography,
} from '../services/client';

export const useClientOverview = (companyId?: string) => {
  return useQuery({
    queryKey: ['client-overview', companyId || 'default'],
    queryFn: () => getClientOverview(companyId),
    staleTime: 60 * 1000,
  });
};

export const useClientCompanies = (companyId?: string) => {
  return useQuery({
    queryKey: ['client-companies', companyId || 'default'],
    queryFn: () => getClientCompanies(companyId),
    staleTime: 60 * 1000,
  });
};

export const useClientCompanyDetail = (companyId?: string) => {
  return useQuery({
    queryKey: ['client-company-detail', companyId],
    queryFn: () => (companyId ? getClientCompanyDetail(companyId) : null),
    enabled: !!companyId,
    staleTime: 60 * 1000,
  });
};

export const useClientWorkforce = (companyId?: string) => {
  return useQuery({
    queryKey: ['client-workforce', companyId || 'default'],
    queryFn: () => getClientWorkforce(companyId),
    staleTime: 60 * 1000,
  });
};

export const useClientExpertise = (companyId?: string) => {
  return useQuery({
    queryKey: ['client-expertise', companyId || 'default'],
    queryFn: () => getClientExpertise(companyId),
    staleTime: 60 * 1000,
  });
};

export const useClientDeployments = (companyId?: string) => {
  return useQuery({
    queryKey: ['client-deployments', companyId || 'default'],
    queryFn: () => getClientDeployments(companyId),
    staleTime: 60 * 1000,
  });
};

export const useClientGeography = (companyId?: string) => {
  return useQuery({
    queryKey: ['client-geography', companyId || 'default'],
    queryFn: () => getClientGeography(companyId),
    staleTime: 60 * 1000,
  });
};
