import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { useCompany } from './CompanyContext';
import { login as authLogin, logout as authLogout, getCurrentUser } from '../services/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  canEdit: boolean;
  login: (email?: string, password?: string) => Promise<void>;
  logout: () => void;
  selectCompany: (companyId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const { setCompany } = useCompany();

  const canEdit = !!user && ['Main Admin', 'Global Admin', 'Manager', 'Company Admin', 'Ops Executive', 'Resource Manager'].includes(user.role);

  // Load user from service (which checks localStorage first) on mount
  useEffect(() => {
    const initAuth = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        // Persist active company selection
        const activeCompany = localStorage.getItem('ormp_active_company');
        if (activeCompany) {
          setCompany(activeCompany);
        } else {
          setCompany(currentUser.currentCompanyId);
          localStorage.setItem('ormp_active_company', currentUser.currentCompanyId);
        }
      }
    };
    initAuth();

    // Listen for global logout events (like 401 refresh failure)
    const handleGlobalLogout = () => {
      setUser(null);
    };
    window.addEventListener('ormp_logout', handleGlobalLogout);
    return () => {
      window.removeEventListener('ormp_logout', handleGlobalLogout);
    };
  }, [setCompany]);

  const login = async (email?: string, password?: string) => {
    const result = await authLogin(email, password);
    setUser(result.user);
    
    let activeCompany = result.user.currentCompanyId;
    if (result.user.role === 'Main Admin' || result.user.role === 'Global Admin') {
      const savedCompany = localStorage.getItem('ormp_active_company');
      if (savedCompany && result.user.accessibleCompanies.includes(savedCompany)) {
        activeCompany = savedCompany;
      }
    }
    
    setCompany(activeCompany);
    localStorage.setItem('ormp_active_company', activeCompany);
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
  };

  const selectCompany = (companyId: string) => {
    if (user) {
      const updatedUser = { ...user, currentCompanyId: companyId };
      setUser(updatedUser);
      localStorage.setItem('ormp_user', JSON.stringify(updatedUser));
      localStorage.setItem('ormp_active_company', companyId);
      setCompany(companyId);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        canEdit,
        login,
        logout,
        selectCompany,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
