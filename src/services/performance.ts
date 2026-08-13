import api from './axios';
import type { Performance } from '../types';
import type { PaginatedResponse } from './engineers';
import { getEngineers, getEngineerById } from './engineers';

const mapApiPerformanceToFrontend = (apiPerf: any, engineerName?: string, orbitId?: string, engineerId?: string): Performance => {
  return {
    id: apiPerf.performance_id,
    engineerId: engineerId || apiPerf.engineer_id || 'eng-e150',
    engineerName: engineerName || 'Field Engineer',
    engineerOrbitId: orbitId || 'ORB001',
    rating: Number(apiPerf.score) || 5.0,
    projectsCompleted: 1,
    customerFeedbackScore: 95,
    onTimeArrivalRate: 98,
    reviewDate: apiPerf.actual_end_date || new Date().toISOString().split('T')[0],
    reviewer: 'Operations Manager',
    notes: apiPerf.feedback || apiPerf.escalation_reason || 'No comments',
    actualStartDate: apiPerf.actual_start_date || '',
    actualEndDate: apiPerf.actual_end_date || '',
    escalation: !!apiPerf.escalation,
    escalationReason: apiPerf.escalation_reason || '',
    feedback: apiPerf.feedback || '',
    score: apiPerf.score !== null && apiPerf.score !== undefined ? Number(apiPerf.score) : undefined,
    attachment: apiPerf.attachment || '',
    scheduleId: apiPerf.schedule_id,
    ownerId: apiPerf.owner_id || undefined,
  };
};

export const getEngineerPerformance = async (engineerId: string): Promise<Performance[]> => {
  try {
    const engineer = await getEngineerById(engineerId);
    const res = await api.get(`/engineers/${engineerId}/performance`);
    if (res.data && Array.isArray(res.data)) {
      return res.data.map(p => mapApiPerformanceToFrontend(p, engineer?.name, engineer?.orbitId, engineerId));
    }
    return [];
  } catch (err) {
    console.error(`Error fetching performance for engineer ${engineerId}:`, err);
    throw err;
  }
};

export const getSchedulePerformance = async (scheduleId: string): Promise<Performance[]> => {
  try {
    const res = await api.get(`/schedules/${scheduleId}/performance`);
    if (res.data && Array.isArray(res.data)) {
      return res.data.map(p => mapApiPerformanceToFrontend(p));
    }
    return [];
  } catch (err) {
    console.error(`Error fetching performance for schedule ${scheduleId}:`, err);
    throw err;
  }
};

export const getPerformanceRecords = async (params?: any): Promise<PaginatedResponse<Performance>> => {
  try {
    let list: Performance[] = [];
    if (params?.engineerId) {
      list = await getEngineerPerformance(params.engineerId);
    } else {
      const activeCompId = params?.companyId || params?.company_id;
      const engs = await getEngineers(activeCompId ? { company_id: activeCompId } : undefined);
      const perfPromises = engs.data.map(e => getEngineerPerformance(e.id));
      const nestedPerf = await Promise.all(perfPromises);
      list = nestedPerf.flat();
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.engineerName.toLowerCase().includes(q) ||
          p.reviewer.toLowerCase().includes(q)
      );
    }

    return {
      data: list,
      total: list.length,
      page: params?.page || 1,
      totalPages: 1,
    };
  } catch (err) {
    console.error('Error fetching global performance:', err);
    throw err;
  }
};

export const getPerformanceRecordById = async (id: string): Promise<Performance | null> => {
  const res = await api.get(`/performance/${id}`);
  return res.data ? mapApiPerformanceToFrontend(res.data) : null;
};

export const createPerformanceRecord = async (scheduleId: string, data: Partial<Performance>): Promise<Performance> => {
  const payload = {
    actual_start_date: data.actualStartDate || null,
    actual_end_date: data.actualEndDate || null,
    escalation: data.escalation || false,
    escalation_reason: data.escalationReason || null,
    feedback: data.feedback || null,
    score: data.score !== undefined ? Number(data.score) : null,
    attachment: data.attachment || null,
  };
  const res = await api.post(`/schedules/${scheduleId}/performance`, payload);
  return mapApiPerformanceToFrontend(res.data);
};

export const updatePerformanceRecord = async (id: string, data: Partial<Performance>): Promise<Performance> => {
  const payload = {
    actual_start_date: data.actualStartDate || null,
    actual_end_date: data.actualEndDate || null,
    escalation: data.escalation || false,
    escalation_reason: data.escalationReason || null,
    feedback: data.feedback || null,
    score: data.score !== undefined ? Number(data.score) : null,
    attachment: data.attachment || null,
  };
  const res = await api.put(`/performance/${id}`, payload);
  return mapApiPerformanceToFrontend(res.data);
};

export const deletePerformanceRecord = async (id: string): Promise<{ success: boolean }> => {
  await api.delete(`/performance/${id}`);
  return { success: true };
};
