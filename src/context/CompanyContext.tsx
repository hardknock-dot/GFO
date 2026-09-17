import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Company } from '../types';
import { getCompanies } from '../services/company';
import {
  getCompanyTheme,
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
  },
];

interface CompanyContextType {
  currentCompany: Company;
  companies: Company[];
  selectedCompanyIds: string[];
  setSelectedCompanyIds: (ids: string[]) => void;
  setCompany: (companyId: string) => void;
}

export const applyCustomThemeVars = (colors: {
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
  color_1?: string | null;
  color_2?: string | null;
  color_3?: string | null;
  color_4?: string | null;
  color_5?: string | null;
}) => {
  const root = document.documentElement;
  const primary = colors.primary_color || colors.color_1;
  const primaryHover = colors.primary_hover;
  const secondary = colors.secondary_color || colors.color_2;
  const accent = colors.accent_color || colors.color_3;
  const accentSoft = colors.accent_soft;
  const bg = colors.background_color || colors.color_4;
  const surface = colors.surface_color || colors.color_4;
  const darkNeutral = colors.dark_neutral;
  const text = colors.text_color || colors.color_5;
  const border = colors.border_color;

  if (primary) root.style.setProperty('--color-primary', primary);
  if (primaryHover) root.style.setProperty('--color-primary-hover', primaryHover);
  if (secondary) root.style.setProperty('--color-secondary', secondary);
  if (accent) root.style.setProperty('--color-accent', accent);
  if (accentSoft) root.style.setProperty('--color-accent-soft', accentSoft);
  if (bg) root.style.setProperty('--color-bg', bg);
  if (surface) root.style.setProperty('--color-card', surface);
  if (darkNeutral) {
    root.style.setProperty('--color-dark-neutral', darkNeutral);
    root.style.setProperty('--color-sidebar', darkNeutral);
  }
  if (text) {
    root.style.setProperty('--color-text', text);
    root.style.setProperty('--color-text-primary', text);
  }
  if (border) root.style.setProperty('--color-border', border);
};

export const applyEngineerTheme = () => {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', '#6B9080');
  root.style.setProperty('--color-primary-hover', '#527364');
  root.style.setProperty('--color-secondary', '#A4C3B2');
  root.style.setProperty('--color-accent', '#6B9080');
  root.style.setProperty('--color-accent-soft', '#EAF4F4');
  root.style.setProperty('--color-dark-accent', '#6B9080');
  root.style.setProperty('--color-dark-neutral', '#253830');
  root.style.setProperty('--color-bg', '#F6FFF8');
  root.style.setProperty('--color-card', '#EAF4F4');
  root.style.setProperty('--color-sidebar', '#6B9080');
  root.style.setProperty('--color-sidebar-active', 'rgba(255, 255, 255, 0.2)');
  root.style.setProperty('--color-sidebar-text', '#FFFFFF');
  root.style.setProperty('--color-sidebar-text-muted', 'rgba(255, 255, 255, 0.8)');
  root.style.setProperty('--color-sidebar-border', '#CCE3DE');
  root.style.setProperty('--color-sidebar-hover', 'rgba(255, 255, 255, 0.12)');
  root.style.setProperty('--color-text', '#253830');
  root.style.setProperty('--color-text-primary', '#253830');
  root.style.setProperty('--color-text-secondary', '#527364');
  root.style.setProperty('--color-text-accent', '#6B9080');
  root.style.setProperty('--color-border', '#CCE3DE');
  root.style.setProperty('--color-stat-1-bg', '#CCE3DE');
  root.style.setProperty('--color-stat-1-text', '#253830');
  root.style.setProperty('--color-stat-2-bg', '#6B9080');
  root.style.setProperty('--color-stat-2-text', '#FFFFFF');
  root.style.setProperty('--color-stat-3-bg', '#A4C3B2');
  root.style.setProperty('--color-stat-3-text', '#253830');
  root.style.setProperty('--color-stat-4-bg', '#527364');
  root.style.setProperty('--color-stat-4-text', '#FFFFFF');
};

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>(PRESET_COMPANIES);
  const [currentCompany, setCurrentCompany] = useState<Company>(PRESET_COMPANIES[0]);
  const [selectedCompanyIds, setSelectedCompanyIdsState] = useState<string[]>([]);

  const applyCompanyTheme = (company?: Company | null) => {
    // Check if current user is Field Engineer / Engineer
    let isEngineer = false;
    try {
      const savedUser = localStorage.getItem('ormp_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.role === 'Field Engineer' || parsed.role === 'Engineer') {
          isEngineer = true;
        }
      }
    } catch (_e) { }

    if (isEngineer) {
      applyEngineerTheme();
      return;
    }

    const theme = getCompanyTheme(company?.company_id || company?.id || company?.name);
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.primaryColor);
    root.style.setProperty('--color-primary-hover', theme.primaryHover);
    root.style.setProperty('--color-secondary', theme.secondaryColor);
    root.style.setProperty('--color-accent', theme.accentColor);
    root.style.setProperty('--color-accent-soft', theme.accentSoft);
    root.style.setProperty('--color-dark-accent', theme.darkAccent);
    root.style.setProperty('--color-dark-neutral', theme.darkNeutral);
    root.style.setProperty('--color-bg', theme.backgroundColor);
    root.style.setProperty('--color-card', theme.cardColor);
    root.style.setProperty('--color-sidebar', theme.sidebarColor);
    root.style.setProperty('--color-sidebar-active', theme.sidebarActiveColor);
    root.style.setProperty('--color-sidebar-text', theme.sidebarTextColor);
    root.style.setProperty('--color-sidebar-text-muted', theme.sidebarTextMuted);
    root.style.setProperty('--color-sidebar-border', theme.sidebarBorderColor);
    root.style.setProperty('--color-sidebar-hover', theme.sidebarHoverColor);
    root.style.setProperty('--color-text', theme.textColor);
    root.style.setProperty('--color-text-primary', theme.textColor);
    root.style.setProperty('--color-text-secondary', theme.textMutedColor);
    root.style.setProperty('--color-text-accent', theme.textSecondaryAccent);
    root.style.setProperty('--color-border', theme.borderColor);
    root.style.setProperty('--color-stat-1-bg', theme.statCard1Bg);
    root.style.setProperty('--color-stat-1-text', theme.statCard1Text);
    root.style.setProperty('--color-stat-2-bg', theme.statCard2Bg);
    root.style.setProperty('--color-stat-2-text', theme.statCard2Text);
    root.style.setProperty('--color-stat-3-bg', theme.statCard3Bg);
    root.style.setProperty('--color-stat-3-text', theme.statCard3Text);
    root.style.setProperty('--color-stat-4-bg', theme.statCard4Bg);
    root.style.setProperty('--color-stat-4-text', theme.statCard4Text);
  };

  useEffect(() => {
    applyCompanyTheme(currentCompany);
  }, [currentCompany]);

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

