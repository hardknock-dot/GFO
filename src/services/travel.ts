import api from './axios';
import type { Travel } from '../types';
import type { PaginatedResponse } from './engineers';
import { getEngineerById } from './engineers';

const mapApiTravelToFrontend = (apiTrv: any, engineerName?: string, orbitId?: string, engineerId?: string): Travel => {
  return {
    id: apiTrv.travel_id,
    engineerId: engineerId || apiTrv.engineer_id || 'eng-e150',
    engineerName: engineerName || 'Field Engineer',
    engineerOrbitId: orbitId || 'ORB001',
    originCountry: 'USA',
    destinationCountry: 'Taiwan',
    departureDate: apiTrv.travel_date || '',
    returnDate: apiTrv.travel_date || '',
    visaRequired: false,
    status: 'Confirmed',
    flightNumber: 'SQ362',
    hotelBooking: apiTrv.comments || 'Hilton Fab City',
    purpose: apiTrv.purpose || 'Deployment Assignment',
    bookingDate: apiTrv.booking_date || '',
    travelDate: apiTrv.travel_date || '',
    comments: apiTrv.comments || '',
    scheduleId: apiTrv.schedule_id,
    ownerId: apiTrv.owner_id || undefined,
  };
};

export const getEngineerTravel = async (engineerId: string): Promise<Travel[]> => {
  try {
    const engineer = await getEngineerById(engineerId);
    const res = await api.get(`/engineers/${engineerId}/travel`);
    if (res.data && Array.isArray(res.data)) {
      return res.data.map(t => mapApiTravelToFrontend(t, engineer?.name, engineer?.orbitId, engineerId));
    }
    return [];
  } catch (err) {
    console.error(`Error fetching travel for engineer ${engineerId}:`, err);
    throw err;
  }
};

export const getScheduleTravel = async (scheduleId: string): Promise<Travel[]> => {
  try {
    const res = await api.get(`/schedules/${scheduleId}/travel`);
    if (res.data && Array.isArray(res.data)) {
      return res.data.map(t => mapApiTravelToFrontend(t));
    }
    return [];
  } catch (err) {
    console.error(`Error fetching travel for schedule ${scheduleId}:`, err);
    throw err;
  }
};

export const getTravelRecords = async (params?: any): Promise<PaginatedResponse<Travel>> => {
  try {
    const queryParams: any = {
      page: params?.page || 1,
      page_size: params?.pageSize || params?.page_size || 20,
    };
    const compId = params?.companyId || params?.company_id;
    if (compId && compId !== 'all-data') queryParams.company_id = compId;
    if (params?.scheduleId) queryParams.schedule_id = params.scheduleId;
    if (params?.engineerId) queryParams.engineer_id = params.engineerId;
    if (params?.search) queryParams.search = params.search;

    const res = await api.get('/travel', { params: queryParams });
    const raw = res.data;
    if (raw && Array.isArray(raw.items)) {
      return {
        data: raw.items.map((t: any) => mapApiTravelToFrontend(t)),
        total: raw.total,
        page: raw.page,
        pageSize: raw.page_size,
        totalPages: raw.total_pages,
      };
    }
    if (Array.isArray(raw)) {
      const data = raw.map((t: any) => mapApiTravelToFrontend(t));
      return {
        data,
        total: data.length,
        page: 1,
        pageSize: data.length || 20,
        totalPages: 1,
      };
    }
    return {
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    };
  } catch (err) {
    console.error('Error fetching global travel:', err);
    throw err;
  }
};

export const getTravelRecordById = async (id: string): Promise<Travel | null> => {
  const res = await api.get(`/travel/${id}`);
  return res.data ? mapApiTravelToFrontend(res.data) : null;
};

export const createTravelRecord = async (scheduleId: string, data: Partial<Travel>): Promise<Travel> => {
  const payload = {
    booking_date: data.bookingDate || null,
    travel_date: data.travelDate || null,
    purpose: data.purpose || null,
    comments: data.comments || null,
  };
  const res = await api.post(`/schedules/${scheduleId}/travel`, payload);
  return mapApiTravelToFrontend(res.data);
};

export const updateTravelRecord = async (id: string, data: Partial<Travel>): Promise<Travel> => {
  const payload = {
    booking_date: data.bookingDate || null,
    travel_date: data.travelDate || null,
    purpose: data.purpose || null,
    comments: data.comments || null,
  };
  const res = await api.put(`/travel/${id}`, payload);
  return mapApiTravelToFrontend(res.data);
};

export const deleteTravelRecord = async (id: string): Promise<{ success: boolean }> => {
  await api.delete(`/travel/${id}`);
  return { success: true };
};
