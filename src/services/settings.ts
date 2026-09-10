import api from './axios';

export interface CompanySettings {
  setting_id: string;
  company_id: string;
  visa_expiration_days: number;
  visa_alerts_enabled: boolean;
  deployment_alerts_enabled: boolean;
  travel_alerts_enabled: boolean;
  leave_alerts_enabled: boolean;
  missed_schedule_alerts_enabled: boolean;
  operational_remark_alerts_enabled: boolean;
  performance_alerts_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CompanySettingsUpdate {
  company_id?: string;
  visa_expiration_days?: number;
  visa_alerts_enabled?: boolean;
  deployment_alerts_enabled?: boolean;
  travel_alerts_enabled?: boolean;
  leave_alerts_enabled?: boolean;
  missed_schedule_alerts_enabled?: boolean;
  operational_remark_alerts_enabled?: boolean;
  performance_alerts_enabled?: boolean;
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  setting_id: 'default-settings',
  company_id: '11b9d863-b83c-4af3-8db5-b6e773f78235',
  visa_expiration_days: 30,
  visa_alerts_enabled: true,
  deployment_alerts_enabled: true,
  travel_alerts_enabled: true,
  leave_alerts_enabled: true,
  missed_schedule_alerts_enabled: true,
  operational_remark_alerts_enabled: true,
  performance_alerts_enabled: true,
};

export const getCompanySettings = async (companyId?: string): Promise<CompanySettings> => {
  try {
    const url = companyId && companyId !== 'all-data' ? `/settings/company/${companyId}` : '/settings';
    const res = await api.get(url);
    if (res.data) {
      localStorage.setItem(`ormp_settings_${companyId || 'current'}`, JSON.stringify(res.data));
      return res.data;
    }
  } catch (err) {
    console.warn(`[Settings Service] Direct fetch failed for companyId "${companyId}", attempting root fallback:`, err);
    try {
      const fallbackRes = await api.get('/settings');
      if (fallbackRes.data) {
        return fallbackRes.data;
      }
    } catch (_fallbackErr) {
      console.warn('[Settings Service] Root settings fetch also failed, checking localStorage cache');
    }
  }

  // Check localStorage cache
  const cached = localStorage.getItem(`ormp_settings_${companyId || 'current'}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (_e) {
      // ignore
    }
  }

  // Return safe default configuration if offline or cold start
  return {
    ...DEFAULT_COMPANY_SETTINGS,
    company_id: companyId || DEFAULT_COMPANY_SETTINGS.company_id,
  };
};

export const updateCompanySettings = async (payload: CompanySettingsUpdate): Promise<CompanySettings> => {
  try {
    const res = await api.put('/settings', payload);
    if (res.data) {
      localStorage.setItem(`ormp_settings_${payload.company_id || 'current'}`, JSON.stringify(res.data));
      return res.data;
    }
  } catch (err) {
    console.warn('[Settings Service] PUT /settings failed, caching locally:', err);
    // If backend is temporarily unreachable, simulate local save and update cache
    const existingStr = localStorage.getItem(`ormp_settings_${payload.company_id || 'current'}`);
    const existing = existingStr ? JSON.parse(existingStr) : DEFAULT_COMPANY_SETTINGS;
    const updated: CompanySettings = {
      ...existing,
      ...payload,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(`ormp_settings_${payload.company_id || 'current'}`, JSON.stringify(updated));
    return updated;
  }

  return {
    ...DEFAULT_COMPANY_SETTINGS,
    ...payload,
    setting_id: 'local-updated',
    updated_at: new Date().toISOString(),
  } as CompanySettings;
};
