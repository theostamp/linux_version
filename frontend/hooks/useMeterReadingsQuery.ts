import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MeterReading, PaginatedResponse } from '@/types/financial';

interface MeterReadingParams {
  building_id?: number;
  meter_type?: string;
  reading_date_after?: string;
  reading_date_before?: string;
  apartment_id?: number;
}

export const useMeterReadings = (
  params: MeterReadingParams,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['meterReadings', params],
    queryFn: async () => {
      if (!params.building_id) {
        return [];
      }

      const queryParams = new URLSearchParams();

      if (params.building_id) queryParams.append('building_id', params.building_id.toString());
      if (params.meter_type) queryParams.append('meter_type', params.meter_type);
      if (params.reading_date_after) queryParams.append('reading_date_after', params.reading_date_after);
      if (params.reading_date_before) queryParams.append('reading_date_before', params.reading_date_before);
      if (params.apartment_id) queryParams.append('apartment_id', params.apartment_id.toString());

      const response = await api.get(`/financial/meter-readings/?${queryParams.toString()}`);
      const data: PaginatedResponse<MeterReading> = response.data;
      return data.results || [];
    },
    enabled: options?.enabled !== false && !!params.building_id,
  });
};