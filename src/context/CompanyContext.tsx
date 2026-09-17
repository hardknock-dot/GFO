import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Company } from '../types';
import { getCompanies } from '../services/company';
import {
  applyThemePreset,
  applyEngineerTheme,
  DEFAULT_THEME,
  LAM_THEME,
  AXCELIS_THEME,
  VISHAY_THEME,
} from '../config/companyThemes';

export const PRESET_COMPANIES: Company[] = [
  {
    id: '11b9d863-b83c-4af3-8db5-b6e773f78235',
    name: 'LAM Research',
    code: 'LAM',
    company_id: '11b9d863-b83c-4af3-8db5-b6e773f78235',
    company_name: 'LAM Research',
    short_name: 'LAM',
    logo: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=120&auto=format&fit=crop&q=80',
    tagline: 'Semiconductor Equipment & Service Leader',
    primaryColor: LAM_THEME.primaryColor,
    primaryHover: LAM_THEME.primaryHover,
    secondaryColor: LAM_THEME.secondaryColor,
    accentColor: LAM_THEME.accentColor,
    accentTransparent: 'rgba(193, 18, 31, 0.15)',
    backgroundColor: LAM_THEME.backgroundColor,
    cardColor: LAM_THEME.cardColor,
    sidebarColor: LAM_THEME.sidebarColor,
    sidebarActiveColor: LAM_THEME.sidebarActiveColor,
    textColor: LAM_THEME.textColor,
    textMutedColor: LAM_THEME.textMutedColor,
    textSecondaryAccent: LAM_THEME.textSecondaryAccent,
    textOnPrimary: '#FFFFFF',
    textMainReverse: '#FFFFFF',
    borderColor: LAM_THEME.borderColor,
    theme_key: 'lam',
  },
  {
    id: 'f81bd16c-2f63-4818-a653-7486fe3f45ec',
    name: 'Axcelis Technologies(ION)',
    code: 'AXCELIS',
    company_id: 'f81bd16c-2f63-4818-a653-7486fe3f45ec',
    company_name: 'Axcelis Technologies(ION)',
    short_name: 'AXCELIS',
    logo: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=120&auto=format&fit=crop&q=80',
    tagline: 'Ion Implantation Solutions for Semiconductor Fabrication',
    primaryColor: AXCELIS_THEME.primaryColor,
    primaryHover: AXCELIS_THEME.primaryHover,
    secondaryColor: AXCELIS_THEME.secondaryColor,
    accentColor: AXCELIS_THEME.accentColor,
    accentTransparent: 'rgba(162, 210, 255, 0.2)',
    backgroundColor: AXCELIS_THEME.backgroundColor,
    cardColor: AXCELIS_THEME.cardColor,
    sidebarColor: AXCELIS_THEME.sidebarColor,
    sidebarActiveColor: AXCELIS_THEME.sidebarActiveColor,
    textColor: AXCELIS_THEME.textColor,
    textMutedColor: AXCELIS_THEME.textMutedColor,
    textSecondaryAccent: AXCELIS_THEME.textSecondaryAccent,
    textOnPrimary: '#1E293B',
    textMainReverse: '#1E293B',
    borderColor: AXCELIS_THEME.borderColor,
    theme_key: 'axcelis',
  },
  {
    id: '34d51cd0-fb63-4684-96a3-662477298678',
    name: 'Vishay Semiconductor',
    code: 'VISHAY',
    company_id: '34d51cd0-fb63-4684-96a3-662477298678',
    company_name: 'Vishay Semiconductor',
    short_name: 'VISHAY',
    logo: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=120&auto=format&fit=crop&q=80',
    tagline: 'Discrete Semiconductors & Passive Electronic Components',
    primaryColor: VISHAY_THEME.primaryColor,
    primaryHover: VISHAY_THEME.primaryHover,
    secondaryColor: VISHAY_THEME.secondaryColor,
    accentColor: VISHAY_THEME.accentColor,
    accentTransparent: 'rgba(73, 88, 103, 0.15)',
    backgroundColor: VISHAY_THEME.backgroundColor,
    cardColor: VISHAY_THEME.cardColor,
    sidebarColor: VISHAY_THEME.sidebarColor,
    sidebarActiveColor: VISHAY_THEME.sidebarActiveColor,
    textColor: VISHAY_THEME.textColor,
    textMutedColor: VISHAY_THEME.textMutedColor,
    textSecondaryAccent: VISHAY_THEME.textSecondaryAccent,
    textOnPrimary: '#FFFFFF',
    textMainReverse: '#FFFFFF',
    borderColor: VISHAY_THEME.borderColor,
    theme_key: 'vishay',
  },
  {
    id: 'all-data',
    name: 'Master All Data',
    code: 'ALL',
    company_id: 'all-data',
    company_name: 'Master All Data',
    short_name: 'ALL',
    logo: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=120&auto=format&fit=crop&q=80',
    tagline: 'Aggregated Semiconductor Field Operations & Workforce Dataset',
    primaryColor: DEFAULT_THEME.primaryColor,
    primaryHover: DEFAULT_THEME.primaryHover,
    secondaryColor: DEFAULT_THEME.secondaryColor,
    accentColor: DEFAULT_THEME.accentColor,
    accentTransparent: 'rgba(221, 161, 94, 0.15)',
    backgroundColor: DEFAULT_THEME.backgroundColor,
    cardColor: DEFAULT_THEME.cardColor,
    sidebarColor: DEFAULT_THEME.sidebarColor,
    sidebarActiveColor: DEFAULT_THEME.sidebarActiveColor,
    textColor: DEFAULT_THEME.textColor,
    textMutedColor: DEFAULT_THEME.textMutedColor,
    textSecondaryAccent: DEFAULT_THEME.textSecondaryAccent,
    textOnPrimary: '#FFFFFF',
    textMainReverse: '#FFFFFF',
    borderColor: DEFAULT_THEME.borderColor,
    theme_key: 'default',
  },
];

interface CompanyContextType {
  currentCompany: Company;
  companies: Company[];
  selectedCompanyIds: string[];
  setSelectedCompanyIds: (ids: string[]) => void;
  setCompany: (companyId: string) => void;
  updateCompanyThemeState: (companyId: string, themeKey: string) => void;
}

export const applyCustomThemeVars = (themeKey?: string | null) => {
  applyThemePreset(themeKey || 'default');
};

export { applyEngineerTheme };

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>(PRESET_COMPANIES);
  const [currentCompany, setCurrentCompany] = useState<Company>(PRESET_COMPANIES[0]);
  const [selectedCompanyIds, setSelectedCompanyIdsState] = useState<string[]>([]);

  const applyCompanyTheme = (company?: Company | null) => {
    let key = company?.theme_key;

    if (!key) {
      const cid = company?.company_id || company?.id;
      if (cid === '11b9d863-b83c-4af3-8db5-b6e773f78235') key = 'lam';
      else if (cid === 'f81bd16c-2f63-4818-a653-7486fe3f45ec') key = 'axcelis';
      else if (cid === '34d51cd0-fb63-4684-96a3-662477298678') key = 'vishay';
      else key = 'default';
    }

    applyThemePreset(key);
  };

  useEffect(() => {
    applyCompanyTheme(currentCompany);
  }, [currentCompany]);

  const updateCompanyThemeState = (companyId: string, themeKey: string) => {
    setCompanies((prev) =>
      prev.map((c) =>
        c.company_id === companyId || c.id === companyId ? { ...c, theme_key: themeKey } : c
      )
    );
    setCurrentCompany((prev) => {
      if (prev.company_id === companyId || prev.id === companyId) {
        const updated = { ...prev, theme_key: themeKey };
        applyCompanyTheme(updated);
        return updated;
      }
      return prev;
    });
  };

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const list = await getCompanies();
        if (list && list.length > 0) {
          const allDataPreset = PRESET_COMPANIES.find((c) => c.id === 'all-data');
          const hasAllData = list.some((c) => c.id === 'all-data' || c.company_id === 'all-data');
          const combined = !hasAllData && allDataPreset ? [...list, allDataPreset] : list;
          setCompanies(combined);

          const activeId = localStorage.getItem('ormp_active_company');
          const found = combined.find(
            (c) =>
              c.company_id === activeId ||
              c.id === activeId ||
              c.code?.toLowerCase() === activeId?.toLowerCase() ||
              c.name?.toLowerCase() === activeId?.toLowerCase()
          );
          if (found) {
            setCurrentCompany(found);
            applyCompanyTheme(found);
          } else {
            setCurrentCompany(combined[0]);
            applyCompanyTheme(combined[0]);
          }

          const savedSelected = localStorage.getItem('ormp_selected_company_ids');
          if (savedSelected) {
            try {
              const parsed = JSON.parse(savedSelected);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setSelectedCompanyIdsState(parsed);
              }
            } catch (_e) {
              // Ignore invalid JSON
            }
          }
        }
      } catch (err) {
        console.error('Failed to load companies in provider:', err);
      }
    };
    loadCompanies();
  }, []);

  const setSelectedCompanyIds = (ids: string[]) => {
    setSelectedCompanyIdsState(ids);
    localStorage.setItem('ormp_selected_company_ids', JSON.stringify(ids));
  };

  const setCompany = (companyId: string) => {
    const found = companies.find(
      (c) =>
        c.id === companyId ||
        c.company_id === companyId ||
        c.code.toLowerCase() === companyId.toLowerCase() ||
        c.name.toLowerCase() === companyId.toLowerCase()
    );
    if (found) {
      setCurrentCompany(found);
      applyCompanyTheme(found);
      localStorage.setItem('ormp_active_company', found.company_id || found.id);
    }
  };

  return (
    <CompanyContext.Provider
      value={{
        currentCompany,
        companies,
        selectedCompanyIds,
        setSelectedCompanyIds,
        setCompany,
        updateCompanyThemeState,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};


export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

