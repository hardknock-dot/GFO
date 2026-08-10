import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import type { User } from '../types';

interface UserContextType {
  user: User | null;
  hasPermission: (requiredRole: string) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const hasPermission = (requiredRole: string) => {
    if (!user) return false;
    if (user.role === 'Global Admin') return true;
    return user.role === requiredRole;
  };

  return (
    <UserContext.Provider value={{ user, hasPermission }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
