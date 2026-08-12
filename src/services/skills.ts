import api from './axios';
import type { Skill } from '../types';
import type { PaginatedResponse } from './engineers';
import { getEngineers } from './engineers';

const mapApiSkillToFrontend = (apiSkill: any): Skill => {
  return {
    id: apiSkill.skill_id,
    engineerId: apiSkill.engineer_id,
    country: apiSkill.country || '',
    fab: apiSkill.fab || '',
    waferSize: apiSkill.wafer_size || '',
    toolType: apiSkill.tool_type || '',
    startDate: apiSkill.start_date || '',
    endDate: apiSkill.end_date || '',
    numberOfTools: apiSkill.number_of_tools !== null && apiSkill.number_of_tools !== undefined ? Number(apiSkill.number_of_tools) : undefined,
    role: apiSkill.role || '',
    previousProcessStartup: apiSkill.previous_process_startup || false,
    previousCmPm: apiSkill.previous_cm_pm || false,
    readyForPrimaryRole: apiSkill.ready_for_primary_role || false,
    comments: apiSkill.comments || '',

    // Compatibility fields:
    toolModel: apiSkill.tool_type || '',
    category: (apiSkill.tool_type && ['Etch', 'Deposition', 'Clean', 'Metrology', 'Ion Implantation', 'Lithography'].includes(apiSkill.tool_type) ? apiSkill.tool_type : 'Etch') as any,
    competencyLevel: (apiSkill.role || 'L2 Specialist') as any,
    certified: apiSkill.ready_for_primary_role || false,
    lastAssessedDate: apiSkill.end_date || '',
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

export const createSkill = async (engineerId: string, data: Partial<Skill>): Promise<Skill> => {
  const payload = {
    country: data.country,
    fab: data.fab,
    wafer_size: data.waferSize,
    tool_type: data.toolType,
    start_date: data.startDate || null,
    end_date: data.endDate || null,
    number_of_tools: data.numberOfTools !== undefined && data.numberOfTools !== null && (data.numberOfTools as any) !== '' ? Number(data.numberOfTools) : null,
    role: data.role,
    previous_process_startup: data.previousProcessStartup || false,
    previous_cm_pm: data.previousCmPm || false,
    ready_for_primary_role: data.readyForPrimaryRole || false,
    comments: data.comments,
  };
  const res = await api.post(`/engineers/${engineerId}/skills`, payload);
  return mapApiSkillToFrontend(res.data);
};

export const updateSkill = async (id: string, data: Partial<Skill>): Promise<Skill> => {
  const payload = {
    country: data.country,
    fab: data.fab,
    wafer_size: data.waferSize,
    tool_type: data.toolType,
    start_date: data.startDate || null,
    end_date: data.endDate || null,
    number_of_tools: data.numberOfTools !== undefined && data.numberOfTools !== null && (data.numberOfTools as any) !== '' ? Number(data.numberOfTools) : null,
    role: data.role,
    previous_process_startup: data.previousProcessStartup,
    previous_cm_pm: data.previousCmPm,
    ready_for_primary_role: data.readyForPrimaryRole,
    comments: data.comments,
  };
  const res = await api.put(`/skills/${id}`, payload);
  return mapApiSkillToFrontend(res.data);
};

export const deleteSkill = async (id: string): Promise<{ success: boolean }> => {
  await api.delete(`/skills/${id}`);
  return { success: true };
};
