import api from './axios';
import type { EngineerDeletionRequest } from '../types';

const mapApiDeletionRequestToFrontend = (item: any): EngineerDeletionRequest => {
  return {
    requestId: item.request_id,
    engineerId: item.engineer_id,
    engineerName: item.engineer_name || 'Engineer',
    orbitId: item.orbit_id || 'N/A',
    requestedBy: item.requested_by,
    requestedByName: item.requested_by_name || 'User',
    companyId: item.company_id,
    companyName: item.company_name || 'Company',
    reason: item.reason || '',
    status: item.status || 'PENDING',
    reviewedBy: item.reviewed_by,
    reviewedAt: item.reviewed_at,
    reviewComment: item.review_comment,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
};

export const getEngineerDeletionRequests = async (companyId?: string, status?: string): Promise<EngineerDeletionRequest[]> => {
  const params: any = {};
  if (companyId) params.company_id = companyId;
  if (status) params.status = status;
  const res = await api.get('/engineer-deletion-requests', { params });
  return (res.data || []).map(mapApiDeletionRequestToFrontend);
};

export const requestEngineerDeletion = async (engineerId: string, reason?: string): Promise<EngineerDeletionRequest> => {
  const res = await api.post('/engineer-deletion-requests', { engineer_id: engineerId, reason });
  return mapApiDeletionRequestToFrontend(res.data);
};

export const approveEngineerDeletionRequest = async (requestId: string): Promise<EngineerDeletionRequest> => {
  const res = await api.post(`/engineer-deletion-requests/${requestId}/approve`);
  return mapApiDeletionRequestToFrontend(res.data);
};

export const rejectEngineerDeletionRequest = async (requestId: string, reviewComment?: string): Promise<EngineerDeletionRequest> => {
  const res = await api.post(`/engineer-deletion-requests/${requestId}/reject`, { review_comment: reviewComment });
  return mapApiDeletionRequestToFrontend(res.data);
};
