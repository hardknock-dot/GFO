import api from './axios';
import type { Skill } from '../types';
import type { PaginatedResponse } from './engineers';
import { getEngineers } from './engineers';

const mapApiSkillToFrontend = (apiSkill: any): Skill => {
  return {
    id: apiSkill.skill_id,
    engineerId: apiSkill.engineer_id,
    toolModel: apiSkill.tool_model || '',
    category: apiSkill.category || 'Etch',
    competencyLevel: apiSkill.competency_level || 'L2 Specialist',
    certified: apiSkill.certified || false,
    lastAssessedDate: apiSkill.last_assessed_date || '',
    certificationAuthority: apiSkill.certification_authority || '',
  };
};

export const getEngineerSkills = async (engineerId: string): Promise<Skill[]> => {
  try {
    const res = await api.get(`/engineers/${engineerId}/skills`);
    if (res.data && Array.isArray(res.data)) {
      return res.data.map(mapApiSkillToFrontend);
    }
    return [];
  } catch (err) {
    console.error(`Error fetching skills for engineer ${engineerId}:`, err);
    throw err;
  }
};

export const getSkills = async (params?: any): Promise<PaginatedResponse<Skill>> => {
  try {
    let list: Skill[] = [];
    if (params?.engineerId) {
      list = await getEngineerSkills(params.engineerId);
    } else {
      const engs = await getEngineers();
      const skillsPromises = engs.data.map(e => getEngineerSkills(e.id));
      const nestedSkills = await Promise.all(skillsPromises);
      list = nestedSkills.flat();
    }

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
  } catch (err) {
    console.error('Error fetching global skills:', err);
    throw err;
  }
};

export const getSkillById = async (id: string): Promise<Skill | null> => {
  const res = await api.get(`/skills/${id}`);
  return res.data ? mapApiSkillToFrontend(res.data) : null;
};

export const createSkill = async (data: Partial<Skill>): Promise<Skill> => {
  const res = await api.post('/skills', data);
  return res.data;
};

export const updateSkill = async (id: string, data: Partial<Skill>): Promise<Skill> => {
  const res = await api.put(`/skills/${id}`, data);
  return res.data;
};

export const deleteSkill = async (id: string): Promise<{ success: boolean }> => {
  await api.delete(`/skills/${id}`);
  return { success: true };
};
