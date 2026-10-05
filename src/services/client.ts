import api from './axios';
import type {
  ClientOverviewResponse,
  ClientCompanyShowcaseItem,
  ClientWorkforceResponse,
  ClientExpertiseResponse,
  ClientDeploymentsResponse,
  ClientGeographyResponse,
  ClientCompanyDetailResponse,
} from '../types/client';

export const getClientOverview = async (companyId?: string): Promise<ClientOverviewResponse> => {
  const params: Record<string, string> = {};
  if (companyId && companyId !== 'all-data') {
    params.company_id = companyId;
  }
  const res = await api.get('/client/overview', { params });
  return res.data;
};

export const getClientCompanies = async (companyId?: string): Promise<ClientCompanyShowcaseItem[]> => {
  const params: Record<string, string> = {};
  if (companyId && companyId !== 'all-data') {
    params.company_id = companyId;
  }
  const res = await api.get('/client/companies', { params });
  return Array.isArray(res.data) ? res.data : [];
};

export const getClientCompanyDetail = async (companyId: string): Promise<ClientCompanyDetailResponse> => {
  const res = await api.get(`/client/companies/${companyId}`);
  return res.data;
};

export const getClientWorkforce = async (companyId?: string): Promise<ClientWorkforceResponse> => {
  const params: Record<string, string> = {};
  if (companyId && companyId !== 'all-data') {
    params.company_id = companyId;
  }
  const res = await api.get('/client/workforce', { params });
  return res.data;
};

export const getClientExpertise = async (companyId?: string): Promise<ClientExpertiseResponse> => {
  const params: Record<string, string> = {};
  if (companyId && companyId !== 'all-data') {
    params.company_id = companyId;
  }
  const res = await api.get('/client/expertise', { params });
  return res.data;
};

export const getClientDeployments = async (companyId?: string): Promise<ClientDeploymentsResponse> => {
  const params: Record<string, string> = {};
  if (companyId && companyId !== 'all-data') {
    params.company_id = companyId;
  }
  const res = await api.get('/client/deployments', { params });
  return res.data;
};

export const getClientGeography = async (companyId?: string): Promise<ClientGeographyResponse> => {
  const params: Record<string, string> = {};
  if (companyId && companyId !== 'all-data') {
    params.company_id = companyId;
  }
  const res = await api.get('/client/geography', { params });
  return res.data;
};
