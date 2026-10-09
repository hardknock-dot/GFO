import api from './axios';
import type { User, UserRole } from '../types';

export const normalizeUser = (userData: any): User => {
  if (!userData) return userData;
  const accessibleSet = new Set<string>();

  if (Array.isArray(userData.accessibleCompanies)) {
    userData.accessibleCompanies.forEach((id: any) => id && accessibleSet.add(String(id).toLowerCase()));
  }
  if (Array.isArray(userData.accessible_company_ids)) {
    userData.accessible_company_ids.forEach((id: any) => id && accessibleSet.add(String(id).toLowerCase()));
  }
  if (Array.isArray(userData.companies)) {
    userData.companies.forEach((c: any) => {
      if (c.company_id) accessibleSet.add(String(c.company_id).toLowerCase());
      if (c.id) accessibleSet.add(String(c.id).toLowerCase());
    });
  }
  if (userData.currentCompanyId) {
    accessibleSet.add(String(userData.currentCompanyId).toLowerCase());
  }
  if (userData.company_id) {
    accessibleSet.add(String(userData.company_id).toLowerCase());
  }

  return {
    ...userData,
    accessibleCompanies: Array.from(accessibleSet),
  };
};

export const login = async (email?: string, password?: string): Promise<{ token: string; user: User }> => {
  const res = await api.post('/auth/login', { email, password });
  if (res.data && res.data.token) {
    const user = normalizeUser(res.data.user);
    localStorage.setItem('ormp_auth_token', res.data.token);
    localStorage.setItem('ormp_user', JSON.stringify(user));
    return { ...res.data, user };
  }
  throw new Error('Authentication failed. No token received.');
};

export const logout = async (): Promise<{ success: boolean }> => {
  try {
    await api.post('/auth/logout');
  } catch (_err) {
    // Silent fail if backend offline
  }
  localStorage.removeItem('ormp_auth_token');
  localStorage.removeItem('ormp_user');
  localStorage.removeItem('ormp_active_company');
  return { success: true };
};

export const refreshToken = async (): Promise<{ token: string }> => {
  const res = await api.post('/auth/refresh');
  if (res.data && res.data.token) {
    localStorage.setItem('ormp_auth_token', res.data.token);
    return res.data;
  }
  throw new Error('Failed to refresh token.');
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const res = await api.get('/auth/me');
    if (res.data) {
      const user = normalizeUser(res.data);
      localStorage.setItem('ormp_user', JSON.stringify(user));
      return user;
    }
  } catch (err: any) {
    if (err.status === 401) {
      localStorage.removeItem('ormp_auth_token');
      localStorage.removeItem('ormp_user');
      localStorage.removeItem('ormp_active_company');
      return null;
    }
  }

  const stored = localStorage.getItem('ormp_user');
  if (stored) {
    try {
      return normalizeUser(JSON.parse(stored));
    } catch (_e) {
      return null;
    }
  }
  return null;
};

export const verifyRole = (user: User | null, allowedRoles: UserRole[]): boolean => {
  if (!user) return false;
  if (user.role === 'Main Admin' || user.role === 'Global Admin') return true;
  return allowedRoles.includes(user.role);
};

export interface ManagedUser {
  user_id: string;
  company_id: string;
  company_name?: string;
  full_name: string;
  email: string;
  role: string;
  engineer_id?: string | null;
  is_active: boolean;
  accessible_company_ids?: string[];
  companies?: { company_id: string; company_name: string; short_name?: string }[];
}

export const getAllUsers = async (): Promise<ManagedUser[]> => {
  try {
    const res = await api.get('/users');
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.warn('getAllUsers /users failed, trying /admin/users fallback:', err);
    try {
      const resAdmin = await api.get('/admin/users');
      return Array.isArray(resAdmin.data) ? resAdmin.data : [];
    } catch (errAdmin) {
      console.error('getAllUsers /admin/users also failed:', errAdmin);
      throw errAdmin;
    }
  }
};

export const createUserAccount = async (payload: {
  email: string;
  full_name: string;
  company_id?: string;
  company_ids?: string[];
  role: string;
  password: string;
  engineer_id?: string | null;
  accessible_company_ids?: string[];
}): Promise<ManagedUser> => {
  const res = await api.post('/users', payload);
  return res.data;
};

export const updateUserAccount = async (
  userId: string,
  payload: {
    full_name?: string;
    role?: string;
    company_id?: string;
    company_ids?: string[];
    engineer_id?: string | null;
    is_active?: boolean;
    password?: string;
    accessible_company_ids?: string[];
  }
): Promise<ManagedUser> => {
  const res = await api.put(`/users/${userId}`, payload);
  return res.data;
};


export const deleteUserAccount = async (userId: string): Promise<void> => {
  await api.delete(`/users/${userId}`);
};

export interface UserProfileUpdate {
  full_name?: string;
  goes_by?: string;
  avatar_url?: string;
}

export const getCurrentUserProfile = async (): Promise<User> => {
  const res = await api.get('/users/me');
  if (res.data) {
    const existing = localStorage.getItem('ormp_user');
    let merged = res.data;
    if (existing) {
      try {
        merged = { ...JSON.parse(existing), ...res.data };
      } catch (_e) {
        // ignore
      }
    }
    localStorage.setItem('ormp_user', JSON.stringify(merged));
  }
  return res.data;
};

export const updateCurrentUserProfile = async (payload: UserProfileUpdate): Promise<User> => {
  const res = await api.put('/users/me', payload);
  if (res.data) {
    const existing = localStorage.getItem('ormp_user');
    let merged = res.data;
    if (existing) {
      try {
        merged = { ...JSON.parse(existing), ...res.data };
      } catch (_e) {
        // ignore
      }
    }
    localStorage.setItem('ormp_user', JSON.stringify(merged));
  }
  return res.data;
};
