import React, { createContext, useContext } from 'react';
import { useCompany } from './CompanyContext';
import type { Company } from '../types';

interface ThemeTokens {
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  background: string;
  card: string;
  sidebar: string;
  sidebarActive: string;
  text: string;
  textMuted: string;
  border: string;
}

interface ThemeContextType {
  theme: ThemeTokens;
  company: Company;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentCompany } = useCompany();

  const theme: ThemeTokens = {
    primary: currentCompany.primaryColor,
    primaryHover: currentCompany.primaryHover,
    secondary: currentCompany.secondaryColor,
    accent: currentCompany.accentColor,
    background: currentCompany.backgroundColor,
    card: currentCompany.cardColor,
    sidebar: currentCompany.sidebarColor,
    sidebarActive: currentCompany.sidebarActiveColor,
    text: currentCompany.textColor,
    textMuted: currentCompany.textMutedColor,
    border: currentCompany.borderColor,
  };

  return (
    <ThemeContext.Provider value={{ theme, company: currentCompany }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
