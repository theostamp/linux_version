import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { MeterReading, MeterReadingFormData, ApiResponse, PaginatedResponse } from '../types/financial';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useMeterReadings = (buildingId?: number) => {
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<any>(null);

  // Λήψη όλων των μετρήσεων
  const fetchReadings = useCallback(async (filters?: {
    meter_type?: string;
    date_from?: string;
    date_to?: string;
    apartment_id?: number;
  }) => {
    if (!buildingId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        building_id: buildingId.toString(),
        ...(filters?.meter_type && { meter_type: filters.meter_type }),
        ...(filters?.date_from && { date_from: filters.date_from }),
        ...(filters?.date_to && { date_to: filters.date_to }),
        ...(filters?.apartment_id && { apartment_id: filters.apartment_id.toString() }),
      });

      const response = await fetch(`${API_BASE_URL}/api/financial/meter-readings/?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Σφάλμα στη λήψη μετρήσεων');
      }

      const data: PaginatedResponse<MeterReading> = await response.json();
      setReadings(data.results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Άγνωστο σφάλμα';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [buildingId]);

  // Δημιουργία νέας μετρήσης
  const createReading = useCallback(async (readingData: MeterReadingFormData): Promise<MeterReading | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/financial/meter-readings/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(readingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα στη δημιουργία μετρήσης');
      }

      const newReading: MeterReading = await response.json();
      setReadings(prev => [newReading, ...prev]);
      toast.success('Η μετρήση δημιουργήθηκε επιτυχώς');
      return newReading;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Άγνωστο σφάλμα';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Ενημέρωση μετρήσης
  const updateReading = useCallback(async (id: number, readingData: Partial<MeterReadingFormData>): Promise<MeterReading | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/financial/meter-readings/${id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(readingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα στην ενημέρωση μετρήσης');
      }

      const updatedReading: MeterReading = await response.json();
      setReadings(prev => prev.map(reading => 
        reading.id === id ? updatedReading : reading
      ));
      toast.success('Η μετρήση ενημερώθηκε επιτυχώς');
      return updatedReading;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Άγνωστο σφάλμα';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Διαγραφή μετρήσης
  const deleteReading = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/financial/meter-readings/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Σφάλμα στη διαγραφή μετρήσης');
      }

      setReadings(prev => prev.filter(reading => reading.id !== id));
      toast.success('Η μετρήση διαγράφηκε επιτυχώς');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Άγνωστο σφάλμα';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Λήψη τύπων μετρητών
  const fetchMeterTypes = useCallback(async (): Promise<Array<{value: string, label: string}>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/financial/meter-readings/types/`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Σφάλμα στη λήψη τύπων μετρητών');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Άγνωστο σφάλμα';
      toast.error(errorMessage);
      return [];
    }
  }, []);

  // Υπολογισμός κατανάλωσης κτιρίου
  const fetchBuildingConsumption = useCallback(async (params: {
    meter_type: string;
    date_from?: string;
    date_to?: string;
  }) => {
    if (!buildingId) return null;

    try {
      const queryParams = new URLSearchParams({
        building_id: buildingId.toString(),
        meter_type: params.meter_type,
        ...(params.date_from && { date_from: params.date_from }),
        ...(params.date_to && { date_to: params.date_to }),
      });

      const response = await fetch(`${API_BASE_URL}/api/financial/meter-readings/building-consumption/?${queryParams}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Σφάλμα στον υπολογισμό κατανάλωσης');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Άγνωστο σφάλμα';
      toast.error(errorMessage);
      return null;
    }
  }, [buildingId]);

  // Ιστορικό μετρήσεων διαμερίσματος
  const fetchApartmentHistory = useCallback(async (apartmentId: number, meterType?: string) => {
    try {
      const params = new URLSearchParams({
        apartment_id: apartmentId.toString(),
        ...(meterType && { meter_type: meterType }),
      });

      const response = await fetch(`${API_BASE_URL}/api/financial/meter-readings/apartment-history/?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Σφάλμα στη λήψη ιστορικού');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Άγνωστο σφάλμα';
      toast.error(errorMessage);
      return [];
    }
  }, []);

  // Μαζική εισαγωγή μετρήσεων
  const bulkImport = useCallback(async (readingsData: MeterReadingFormData[]): Promise<{
    created_count: number;
    errors: any[];
    created_readings: MeterReading[];
  } | null> => {
    if (!buildingId) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/financial/meter-readings/bulk-import/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          building_id: buildingId,
          readings: readingsData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα στη μαζική εισαγωγή');
      }

      const result = await response.json();
      
      if (result.created_count > 0) {
        setReadings(prev => [...result.created_readings, ...prev]);
        toast.success(`${result.created_count} μετρήσεις εισήχθησαν επιτυχώς`);
      }

      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} μετρήσεις απέτυχαν`);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Άγνωστο σφάλμα';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [buildingId]);

  // Λήψη στατιστικών
  const fetchStatistics = useCallback(async (meterType?: string) => {
    if (!buildingId) return;

    try {
      const params = new URLSearchParams({
        building_id: buildingId.toString(),
        ...(meterType && { meter_type: meterType }),
      });

      const response = await fetch(`${API_BASE_URL}/api/financial/meter-readings/statistics/?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Σφάλμα στη λήψη στατιστικών');
      }

      const data = await response.json();
      setStatistics(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Άγνωστο σφάλμα';
      toast.error(errorMessage);
    }
  }, [buildingId]);

  // Αυτόματη λήψη μετρήσεων όταν αλλάζει το buildingId
  useEffect(() => {
    if (buildingId) {
      fetchReadings();
      fetchStatistics();
    }
  }, [buildingId, fetchReadings, fetchStatistics]);

  return {
    readings,
    loading,
    error,
    statistics,
    fetchReadings,
    createReading,
    updateReading,
    deleteReading,
    fetchMeterTypes,
    fetchBuildingConsumption,
    fetchApartmentHistory,
    bulkImport,
    fetchStatistics,
  };
}; 