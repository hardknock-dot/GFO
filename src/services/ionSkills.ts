import api from './axios';
import type {
  IonSkillTool,
  IonSkillExperience,
  IonSkillExperienceCreatePayload,
  IonSkillExperienceUpdatePayload,
  IonEngineerSkillSummary,
  IonSkillHistoryItem,
  IonSkillQueryParams,
} from '../types';
import type { PaginatedResponse } from './engineers';

export const getIonTools = async (activeOnly: boolean = true): Promise<IonSkillTool[]> => {
  const res = await api.get<IonSkillTool[]>('/ion-skills/tools', {
    params: { active_only: activeOnly },
  });
  return res.data;
};

export const getIonExperiences = async (
  params?: IonSkillQueryParams
): Promise<PaginatedResponse<IonSkillExperience>> => {
  const queryParams: Record<string, any> = {
    page: params?.page || 1,
    page_size: params?.page_size || 20,
  };
  if (params?.engineer_id) queryParams.engineer_id = params.engineer_id;
  if (params?.tool_id) queryParams.tool_id = params.tool_id;
  if (params?.skill_level) queryParams.skill_level = params.skill_level;
  if (params?.min_skill_level) queryParams.min_skill_level = params.min_skill_level;
  if (params?.search) queryParams.search = params.search;
  if (params?.where_location) queryParams.where_location = params.where_location;
  if (params?.start_date) queryParams.start_date = params.start_date;
  if (params?.end_date) queryParams.end_date = params.end_date;

  const res = await api.get<any>('/ion-skills/experiences', {
    params: queryParams,
  });
  const raw = res.data;
  if (raw && Array.isArray(raw.items)) {
    return {
      data: raw.items,
      total: raw.total,
      page: raw.page,
      pageSize: raw.page_size,
      totalPages: raw.total_pages,
    };
  }
  if (raw && Array.isArray(raw.data)) {
    return raw;
  }
  if (Array.isArray(raw)) {
    return {
      data: raw,
      total: raw.length,
      page: 1,
      pageSize: raw.length || 20,
      totalPages: 1,
    };
  }
  return {
    data: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  };
};

export const getIonExperienceById = async (id: string): Promise<IonSkillExperience> => {
  const res = await api.get<IonSkillExperience>(`/ion-skills/experiences/${id}`);
  return res.data;
};

export const createIonExperience = async (
  payload: IonSkillExperienceCreatePayload
): Promise<IonSkillExperience> => {
  const res = await api.post<IonSkillExperience>('/ion-skills/experiences', payload);
  return res.data;
};

export const updateIonExperience = async (
  id: string,
  payload: IonSkillExperienceUpdatePayload
): Promise<IonSkillExperience> => {
  const res = await api.put<IonSkillExperience>(`/ion-skills/experiences/${id}`, payload);
  return res.data;
};

export const deleteIonExperience = async (id: string): Promise<{ success: boolean }> => {
  await api.delete(`/ion-skills/experiences/${id}`);
  return { success: true };
};

export const deleteIonAssessment = async (assessmentId: string): Promise<{ success: boolean }> => {
  await api.delete(`/ion-skills/assessments/${assessmentId}`);
  return { success: true };
};

export const getEngineerIonCurrentSummary = async (
  engineerId: string
): Promise<IonEngineerSkillSummary> => {
  const res = await api.get<IonEngineerSkillSummary>(
    `/ion-skills/engineers/${engineerId}/current-summary`
  );
  return res.data;
};

export const getEngineerIonHistory = async (
  engineerId: string,
  toolId?: string
): Promise<IonSkillHistoryItem[]> => {
  const res = await api.get<IonSkillHistoryItem[]>(
    `/ion-skills/engineers/${engineerId}/history`,
    {
      params: toolId ? { tool_id: toolId } : {},
    }
  );
  return res.data;
};

export const getIonCompanySummary = async (params?: {
  search?: string;
  tool_id?: string;
  min_level?: number;
}): Promise<IonEngineerSkillSummary[]> => {
  const res = await api.get<IonEngineerSkillSummary[]>('/ion-skills/summary', {
    params,
  });
  return res.data;
};
