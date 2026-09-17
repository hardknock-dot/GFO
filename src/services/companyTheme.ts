import api from './axios';

export interface CompanyThemeResponse {
  company_theme_id?: string;
  company_id: string;
  theme_key: string;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyThemeUpdatePayload {
  theme_key: string;
}

export const getCompanyThemeSettings = async (companyId?: string): Promise<CompanyThemeResponse> => {
  const params = companyId ? { company_id: companyId } : undefined;
  const response = await api.get<CompanyThemeResponse>('/company-theme', { params });
  return response.data;
};

export const updateCompanyThemeSettings = async (
  data: CompanyThemeUpdatePayload,
  companyId?: string
): Promise<CompanyThemeResponse> => {
  const params = companyId ? { company_id: companyId } : undefined;
  const response = await api.put<CompanyThemeResponse>('/company-theme', data, { params });
  return response.data;
};

