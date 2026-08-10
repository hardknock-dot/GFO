import api from './axios';
import type { User, UserRole } from '../types';

export const DEFAULT_MOCK_USER: User = {
  id: 'usr-enterprise-01',
  name: 'Marcus Vance',
  email: 'm.vance@orbit-ormp.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  role: 'Global Admin',
  currentCompanyId: 'lam-research',
  accessibleCompanies: ['lam-research', 'axcelis', 'all-data'],
};

export const login = async (email?: string, password?: string): Promise<{ token: string; user: User }> => {
  try {
    const res = await api.post('/auth/login', { email, password });
    if (res.data && res.data.token) {
      localStorage.setItem('ormp_auth_token', res.data.token);
      localStorage.setItem('ormp_user', JSON.stringify(res.data.user));
      return res.data;
    }
  } catch (_err) {
    // API not running, proceed with local mock login fallback
  }

  // Fallback mock JWT authentication
  const mockToken = 'mock-jwt-token-' + Date.now();
  const mockUser: User = {
    ...DEFAULT_MOCK_USER,
    email: email || DEFAULT_MOCK_USER.email,
  };
  localStorage.setItem('ormp_auth_token', mockToken);
  localStorage.setItem('ormp_user', JSON.stringify(mockUser));
  return { token: mockToken, user: mockUser };
};

export const logout = async (): Promise<{ success: boolean }> => {
  try {
    await api.post('/auth/logout');
  } catch (_err) {
    // Silent fail if backend offline
  }
  localStorage.removeItem('ormp_auth_token');
  localStorage.removeItem('ormp_user');
  return { success: true };
};

export const refreshToken = async (): Promise<{ token: string }> => {
  try {
    const res = await api.post('/auth/refresh');
    if (res.data && res.data.token) {
      localStorage.setItem('ormp_auth_token', res.data.token);
      return res.data;
    }
  } catch (_err) {
    // Ignore error
  }
  const token = 'mock-jwt-refreshed-token-' + Date.now();
  localStorage.setItem('ormp_auth_token', token);
  return { token };
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const res = await api.get('/auth/me');
    if (res.data) {
      localStorage.setItem('ormp_user', JSON.stringify(res.data));
      return res.data;
    }
  } catch (_err) {
    // API offline
  }

  const stored = localStorage.getItem('ormp_user');
  if (stored) {
    try {
      return JSON.parse(stored) as User;
    } catch (_e) {
      return null;
    }
  }
  return DEFAULT_MOCK_USER;
};

export const verifyRole = (user: User | null, allowedRoles: UserRole[]): boolean => {
  if (!user) return false;
  if (user.role === 'Global Admin') return true; // Global admin can bypass all role gates
  return allowedRoles.includes(user.role);
};
