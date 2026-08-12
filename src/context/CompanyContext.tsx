import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Company } from '../types';
import { getCompanies } from '../services/company';

export const PRESET_COMPANIES: Company[] = [
  {
    id: 'lam-research',
    name: 'LAM Research',
    code: 'LAM',
    company_id: 'lam-research',
    company_name: 'LAM Research',
    short_name: 'LAM',
    logo: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=120&auto=format&fit=crop&q=80',
    tagline: 'Semiconductor Equipment & Service Leader',
    primaryColor: '#0F172A',
    primaryHover: '#1E293B',
    secondaryColor: '#0F172A',
    accentColor: '#0F172A',
    accentTransparent: 'rgba(15, 23, 42, 0.08)',
    backgroundColor: '#F1F5F9',
    cardColor: '#E0F2FE',
    sidebarColor: '#FFFFFF',
    sidebarActiveColor: '#F1F5F9',
    textColor: '#0F172A',
    textMutedColor: '#475569',
    textSecondaryAccent: '#334155',
    textOnPrimary: '#FFFFFF',
    textMainReverse: '#FFFFFF',
    borderColor: '#BAE6FD',
  },
  {
    id: 'axcelis',
    name: 'Axcelis Technologies',
    code: 'AXCL',
    company_id: 'axcelis',
    company_name: 'Axcelis Technologies',
    short_name: 'AXCL',
    logo: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=120&auto=format&fit=crop&q=80',
    tagline: 'Ion Implantation Solutions for Semiconductor Fabrication',
    primaryColor: '#0F172A',
    primaryHover: '#1E293B',
    secondaryColor: '#0F172A',
    accentColor: '#0F172A',
    accentTransparent: 'rgba(15, 23, 42, 0.08)',
    backgroundColor: '#F1F5F9',
    cardColor: '#E0F2FE',
    sidebarColor: '#FFFFFF',
    sidebarActiveColor: '#F1F5F9',
    textColor: '#0F172A',
    textMutedColor: '#475569',
    borderColor: '#BAE6FD',
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
    primaryColor: '#0F172A',
    primaryHover: '#1E293B',
    secondaryColor: '#0F172A',
    accentColor: '#0F172A',
    accentTransparent: 'rgba(15, 23, 42, 0.08)',
    backgroundColor: '#F1F5F9',
    cardColor: '#E0F2FE',
    sidebarColor: '#FFFFFF',
    sidebarActiveColor: '#F1F5F9',
    textColor: '#0F172A',
    textMutedColor: '#475569',
    textSecondaryAccent: '#334155',
    textOnPrimary: '#FFFFFF',
    textMainReverse: '#FFFFFF',
    borderColor: '#BAE6FD',
  },
];

interface CompanyContextType {
  currentCompany: Company;
  companies: Company[];
  setCompany: (companyId: string) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>(PRESET_COMPANIES);
  const [currentCompany, setCurrentCompany] = useState<Company>(PRESET_COMPANIES[0]);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const list = await getCompanies();
        if (list && list.length > 0) {
          const allDataPreset = PRESET_COMPANIES.find((c) => c.id === 'all-data');
          const combined = allDataPreset ? [...list, allDataPreset] : list;
          setCompanies(combined);
          
          const activeId = localStorage.getItem('ormp_active_company');
          const found = combined.find(
            (c) =>
              c.company_id === activeId ||
              c.id === activeId ||
              c.code.toLowerCase() === activeId?.toLowerCase() ||
              c.name.toLowerCase() === activeId?.toLowerCase()
          );
          if (found) {
            setCurrentCompany(found);
          } else {
            setCurrentCompany(combined[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load companies in provider:', err);
      }
    };
    loadCompanies();
  }, []);

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
    root.style.setProperty('--color-text-primary', company.textColor);
    root.style.setProperty('--color-text-secondary', company.textMutedColor);
    root.style.setProperty('--color-text-accent', company.textSecondaryAccent || '#E8DAB2');
    root.style.setProperty('--color-border', company.borderColor);
  };

  useEffect(() => {
    applyCompanyTheme(currentCompany);
  }, [currentCompany]);

  const setCompany = (companyId: string) => {
    const target = companies.find((c) => c.company_id === companyId || c.id === companyId);
    if (target) {
      setCurrentCompany(target);
      applyCompanyTheme(target);
    }
  };

  return (
    <CompanyContext.Provider value={{ currentCompany, companies, setCompany }}>
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
