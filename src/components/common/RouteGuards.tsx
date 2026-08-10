import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

interface GuardProps {
  children?: React.ReactElement;
}

export const GuestRoute: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    // Persistent active company check
    const activeCompany = localStorage.getItem('ormp_active_company');
    if (activeCompany === 'all-data') {
      return <Navigate to="/all-data" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children ? children : <Outlet />;
};

export const ProtectedRoute: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
};

interface RoleGuardProps extends GuardProps {
  allowedRoles: UserRole[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Global Admin always has access to all routes
  const isAllowed = user?.role === 'Global Admin' || (user && allowedRoles.includes(user.role));

  if (!isAllowed) {
    return <Navigate to="/403" replace />;
  }

  return children ? children : <Outlet />;
};

// Admin Guard
export const AdminRoute: React.FC<GuardProps> = ({ children }) => {
  return <RoleGuard allowedRoles={['Global Admin', 'Company Admin']}>{children}</RoleGuard>;
};

// Manager Guard
export const ManagerRoute: React.FC<GuardProps> = ({ children }) => {
  return <RoleGuard allowedRoles={['Global Admin', 'Company Admin', 'Resource Manager']}>{children}</RoleGuard>;
};

// Viewer Guard
export const ViewerRoute: React.FC<GuardProps> = ({ children }) => {
  return <RoleGuard allowedRoles={['Global Admin', 'Company Admin', 'Resource Manager', 'Field Engineer', 'Viewer']}>{children}</RoleGuard>;
};
