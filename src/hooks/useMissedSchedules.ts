import { useQuery } from '@tanstack/react-query';
import { getMissedSchedules } from '../services/missedSchedule';

export const useMissedSchedules = (params?: any) => {
  return useQuery({
    queryKey: ['missedSchedules', params],
    queryFn: () => getMissedSchedules(params),
    staleTime: 1000 * 60 * 5,
  });
};
