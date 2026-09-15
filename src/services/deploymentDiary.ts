import api from './axios';
import type {
  DeploymentDiary,
  DeploymentDiaryCreatePayload,
  DeploymentDiaryUpdatePayload
} from '../types';

export interface DeploymentDiaryPaginatedResponse {
  items: DeploymentDiary[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export const getDeploymentDiary = async (params?: {
  company_id?: string;
  engineer_id?: string;
  schedule_id?: string;
  entry_date?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<DeploymentDiaryPaginatedResponse> => {
  const response = await api.get<DeploymentDiaryPaginatedResponse>('/deployment-diary', { params });
  return response.data;
};

export const getDeploymentDiaryEntry = async (id: string): Promise<DeploymentDiary> => {
  const response = await api.get<DeploymentDiary>(`/deployment-diary/${id}`);
  return response.data;
};

export const createDeploymentDiary = async (data: DeploymentDiaryCreatePayload): Promise<DeploymentDiary> => {
  const response = await api.post<DeploymentDiary>('/deployment-diary', data);
  return response.data;
};

export const updateDeploymentDiary = async (
  id: string,
  data: DeploymentDiaryUpdatePayload
): Promise<DeploymentDiary> => {
  const response = await api.put<DeploymentDiary>(`/deployment-diary/${id}`, data);
  return response.data;
};

export const deleteDeploymentDiary = async (id: string): Promise<void> => {
  await api.delete(`/deployment-diary/${id}`);
};
