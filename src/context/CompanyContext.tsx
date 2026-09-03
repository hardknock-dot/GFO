import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Company } from '../types';
import { getCompanies } from '../services/company';

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
    primaryColor: '#527E3A',
    primaryHover: '#43682F',
    secondaryColor: '#527E3A',
    accentColor: '#F1A67E',
    accentTransparent: 'rgba(241, 166, 126, 0.15)',
    backgroundColor: '#FFFFFF',
    cardColor: '#FEFADC',
    sidebarColor: '#F1A67E',
    sidebarActiveColor: '#E5956D',
    textColor: '#1C1917',
    textMutedColor: '#57534E',
    textSecondaryAccent: '#527E3A',
    textOnPrimary: '#FFFFFF',
    textMainReverse: '#FFFFFF',
    borderColor: '#E8DEC8',
  },
  {
    id: 'f81bd16c-2f63-4818-a653-7486fe3f45ec',
    name: 'Axcelis Technologies',
    code: 'AXCELIS',
    company_id: 'f81bd16c-2f63-4818-a653-7486fe3f45ec',
    company_name: 'Axcelis Technologies',
    short_name: 'AXCELIS',
    logo: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=120&auto=format&fit=crop&q=80',
    tagline: 'Ion Implantation Solutions for Semiconductor Fabrication',
    primaryColor: '#527E3A',
    primaryHover: '#43682F',
    secondaryColor: '#527E3A',
    accentColor: '#F1A67E',
    accentTransparent: 'rgba(241, 166, 126, 0.15)',
    backgroundColor: '#FFFFFF',
    cardColor: '#FEFADC',
    sidebarColor: '#F1A67E',
    sidebarActiveColor: '#E5956D',
    textColor: '#1C1917',
    textMutedColor: '#57534E',
    borderColor: '#E8DEC8',
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
    primaryColor: '#527E3A',
    primaryHover: '#43682F',
    secondaryColor: '#527E3A',
    accentColor: '#F1A67E',
    accentTransparent: 'rgba(241, 166, 126, 0.15)',
    backgroundColor: '#FFFFFF',
    cardColor: '#FEFADC',
    sidebarColor: '#F1A67E',
    sidebarActiveColor: '#E5956D',
    textColor: '#1C1917',
    textMutedColor: '#57534E',
    borderColor: '#E8DEC8',
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
    primaryColor: '#527E3A',
    primaryHover: '#43682F',
    secondaryColor: '#527E3A',
    accentColor: '#F1A67E',
    accentTransparent: 'rgba(241, 166, 126, 0.15)',
    backgroundColor: '#FFFFFF',
    cardColor: '#FEFADC',
    sidebarColor: '#F1A67E',
    sidebarActiveColor: '#E5956D',
    textColor: '#1C1917',
    textMutedColor: '#57534E',
    textSecondaryAccent: '#527E3A',
    textOnPrimary: '#FFFFFF',
    textMainReverse: '#FFFFFF',
    borderColor: '#E8DEC8',
  },
];

interface CompanyContextType {
  currentCompany: Company;
  companies: Company[];
  selectedCompanyIds: string[];
  setSelectedCompanyIds: (ids: string[]) => void;
  setCompany: (companyId: string) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>(PRESET_COMPANIES);
  const [currentCompany, setCurrentCompany] = useState<Company>(PRESET_COMPANIES[0]);
  const [selectedCompanyIds, setSelectedCompanyIdsState] = useState<string[]>([]);

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
          } else {
            setCurrentCompany(combined[0]);
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

  const applyCompanyTheme = (company: Company) => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', company.primaryColor);
    root.style.setProperty('--color-primary-hover', company.primaryHover);
    root.style.setProperty('--color-secondary', company.secondaryColor);
    root.style.setProperty('--color-accent', company.accentColor);
    root.style.setProperty('--color-accent-transparent', company.accentTransparent);
    root.style.setProperty('--color-bg', company.backgroundColor);
    root.style.setProperty('--color-card', company.cardColor);
    root.style.setProperty('--color-sidebar', company.sidebarColor);
    root.style.setProperty('--color-sidebar-active', company.sidebarActiveColor);
    root.style.setProperty('--color-text', company.textColor);
    root.style.setProperty('--color-text-muted', company.textMutedColor);
    root.style.setProperty('--color-border', company.borderColor);

    if (company.textSecondaryAccent) {
      root.style.setProperty('--color-text-secondary-accent', company.textSecondaryAccent);
    }
    if (company.textOnPrimary) {
      root.style.setProperty('--color-text-on-primary', company.textOnPrimary);
    }
    if (company.textMainReverse) {
      root.style.setProperty('--color-text-main-reverse', company.textMainReverse);
    }
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
