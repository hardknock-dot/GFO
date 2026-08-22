import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

interface GuardProps {
  children?: React.ReactElement;
}

export const GuestRoute: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    const activeCompany = localStorage.getItem('ormp_active_company');
    if (activeCompany === 'all-data') {
      return <Navigate to="/all-data" replace />;
    }
    if (user?.role === 'Field Engineer' || user?.role === 'Engineer') {
      return <Navigate to="/engineer/dashboard" replace />;
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

  // Main Admin always has global access
  const isAllowed = user?.role === 'Main Admin' || user?.role === 'Global Admin' || (user && allowedRoles.includes(user.role));

  if (!isAllowed) {
    return <Navigate to="/403" replace />;
  }

  return children ? children : <Outlet />;
};

// Main Admin Guard
export const MainAdminRoute: React.FC<GuardProps> = ({ children }) => {
  return <RoleGuard allowedRoles={['Main Admin', 'Global Admin']}>{children}</RoleGuard>;
};

// Admin Guard (alias)
export const AdminRoute: React.FC<GuardProps> = ({ children }) => {
  return <RoleGuard allowedRoles={['Main Admin', 'Global Admin', 'Manager', 'Company Admin']}>{children}</RoleGuard>;
};

// Manager Guard
export const ManagerRoute: React.FC<GuardProps> = ({ children }) => {
  return <RoleGuard allowedRoles={['Main Admin', 'Global Admin', 'Manager', 'Company Admin']}>{children}</RoleGuard>;
};

// Ops Executive Guard
export const OpsExecutiveRoute: React.FC<GuardProps> = ({ children }) => {
  return <RoleGuard allowedRoles={['Main Admin', 'Global Admin', 'Manager', 'Company Admin', 'Ops Executive', 'Resource Manager']}>{children}</RoleGuard>;
};

// Viewer Guard
export const ViewerRoute: React.FC<GuardProps> = ({ children }) => {
  return <RoleGuard allowedRoles={['Main Admin', 'Global Admin', 'Manager', 'Company Admin', 'Ops Executive', 'Resource Manager', 'Engineer', 'Field Engineer', 'Viewer']}>{children}</RoleGuard>;
};

// Engineer Guard
export const EngineerRoute: React.FC<GuardProps> = ({ children }) => {
  return <RoleGuard allowedRoles={['Main Admin', 'Global Admin', 'Manager', 'Company Admin', 'Ops Executive', 'Resource Manager', 'Engineer', 'Field Engineer']}>{children}</RoleGuard>;
};

// Non-Engineer Guard
export const NonEngineerRoute: React.FC<GuardProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (user?.role === 'Field Engineer' || user?.role === 'Engineer') {
    return <Navigate to="/engineer/dashboard" replace />;
  }

  return children ? children : <Outlet />;
};
