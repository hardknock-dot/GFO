import api from './axios';
import type { Skill } from '../types';
import type { PaginatedResponse } from './engineers';
import excelData from '../data/excelData.json';

const MOCK_SKILLS: Skill[] = (excelData as any).skills || [];

export const getSkills = async (params?: any): Promise<PaginatedResponse<Skill>> => {
  try {
    const res = await api.get('/skills', { params });
    if (res.data && Array.isArray(res.data.data)) {
      return res.data;
    }
  } catch (_err) {
    // API fallback
  }

  let list = [...MOCK_SKILLS];
  if (params?.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (s) =>
        s.toolModel.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.competencyLevel.toLowerCase().includes(q)
    );
  }
  return {
    data: list,
    total: list.length,
    page: params?.page || 1,
    totalPages: 1,
  };
};

export const getSkillById = async (id: string): Promise<Skill | null> => {
  try {
    const res = await api.get(`/skills/${id}`);
    if (res.data && typeof res.data === 'object') {
      return res.data;
    }
  } catch (_err) {
    // Fallback
  }
  return MOCK_SKILLS.find((s) => s.id === id) || null;
};

export const createSkill = async (data: Partial<Skill>): Promise<Skill> => {
  try {
    const res = await api.post('/skills', data);
    return res.data;
  } catch (_err) {
    // Fallback
  }
  return {
    ...MOCK_SKILLS[0],
    ...data,
    id: `skill-${Date.now()}`,
  } as Skill;
};

export const updateSkill = async (id: string, data: Partial<Skill>): Promise<Skill> => {
  try {
    const res = await api.put(`/skills/${id}`, data);
    return res.data;
  } catch (_err) {
    // Fallback
  }
  const found = MOCK_SKILLS.find((s) => s.id === id) || MOCK_SKILLS[0];
  return { ...found, ...data, id } as Skill;
};

export const deleteSkill = async (id: string): Promise<{ success: boolean }> => {
  try {
    await api.delete(`/skills/${id}`);
  } catch (_err) {
    // Fallback
  }
  return { success: true };
};

export const getEngineerSkills = async (engineerId: string): Promise<Skill[]> => {
  try {
    const res = await api.get(`/engineers/${engineerId}/skills`);
    return res.data;
  } catch (_err) {
    const q = engineerId.toLowerCase().replace('eng-', '');
    const found = MOCK_SKILLS.filter(
      (s) =>
        (s as any).engineerOrbitId?.toLowerCase() === q ||
        (s as any).engineerName?.toLowerCase().includes(q)
    );
    return found.length > 0 ? found : MOCK_SKILLS.slice(0, 4);
  }
};
