import api from './axios';

export interface CompanyThemeData {
  company_theme_id: string;
  company_id: string;
  color_1?: string | null;
  color_2?: string | null;
  color_3?: string | null;
  color_4?: string | null;
  color_5?: string | null;
  primary_color?: string | null;
  primary_hover?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  accent_soft?: string | null;
  background_color?: string | null;
  surface_color?: string | null;
  dark_neutral?: string | null;
  text_color?: string | null;
  border_color?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyThemeUpdatePayload {
  primary_color?: string;
  primary_hover?: string;
  secondary_color?: string;
  accent_color?: string;
  accent_soft?: string;
  background_color?: string;
  surface_color?: string;
  dark_neutral?: string;
  text_color?: string;
  border_color?: string;
  color_1?: string;
  color_2?: string;
  color_3?: string;
  color_4?: string;
  color_5?: string;
}

export const getCompanyThemeSettings = async (companyId?: string): Promise<CompanyThemeData> => {
  const params = companyId ? { company_id: companyId } : undefined;
  const response = await api.get<CompanyThemeData>('/company-theme', { params });
  return response.data;
};

export const updateCompanyThemeSettings = async (
  data: CompanyThemeUpdatePayload,
  companyId?: string
): Promise<CompanyThemeData> => {
  const params = companyId ? { company_id: companyId } : undefined;
  const response = await api.put<CompanyThemeData>('/company-theme', data, { params });
  return response.data;
};
