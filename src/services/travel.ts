import api from './axios';
import type { Travel } from '../types';
import type { PaginatedResponse } from './engineers';
import { getEngineers, getEngineerById } from './engineers';

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

export const getTravelRecords = async (params?: any): Promise<PaginatedResponse<Travel>> => {
  try {
    let list: Travel[] = [];
    if (params?.engineerId) {
      list = await getEngineerTravel(params.engineerId);
    } else {
      const engs = await getEngineers();
      const travelPromises = engs.data.map(e => getEngineerTravel(e.id));
      const nestedTravel = await Promise.all(travelPromises);
      list = nestedTravel.flat();
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (t) =>
          t.engineerName.toLowerCase().includes(q) ||
          t.destinationCountry.toLowerCase().includes(q) ||
          t.purpose.toLowerCase().includes(q)
      );
    }
    if (params?.status && params.status !== 'All') {
      list = list.filter((t) => t.status.toLowerCase().includes(params.status.toLowerCase()));
    }

    return {
      data: list,
      total: list.length,
      page: params?.page || 1,
      totalPages: 1,
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

export const createTravelRecord = async (data: Partial<Travel>): Promise<Travel> => {
  const res = await api.post('/travel', data);
  return res.data;
};

export const updateTravelRecord = async (id: string, data: Partial<Travel>): Promise<Travel> => {
  const res = await api.put(`/travel/${id}`, data);
  return res.data;
};

export const deleteTravelRecord = async (id: string): Promise<{ success: boolean }> => {
  await api.delete(`/travel/${id}`);
  return { success: true };
};
