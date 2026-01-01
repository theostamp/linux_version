import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { MeterReading, MeterReadingFormData, ApiResponse, PaginatedResponse } from '../types/financial';

import { api } from '@/lib/api';

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

      const response = await api.get(`/financial/meter-readings/?${params}`);

      const data: PaginatedResponse<MeterReading> = response.data;
      setReadings(data.results);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Άγνωστο σφάλμα';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [buildingId]);

  // Δημιουργία νέας μετρήσης
  const createReading = useCallback(async (data: MeterReadingFormData): Promise<MeterReading | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/financial/meter-readings/', data);
      await fetchReadings(); // Refresh readings list
      toast.success('Η μέτρηση δημιουργήθηκε επιτυχώς');
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη δημιουργία της μέτρησης';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchReadings]);

  // Ενημέρωση μέτρησης
  const updateReading = useCallback(async (id: number, data: Partial<MeterReadingFormData>): Promise<MeterReading | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.patch(`/financial/meter-readings/${id}/`, data);
      await fetchReadings(); // Refresh readings list
      toast.success('Η μέτρηση ενημερώθηκε επιτυχώς');
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά την ενημέρωση της μέτρησης';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchReadings]);

  // Διαγραφή μέτρησης
  const deleteReading = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await api.delete(`/financial/meter-readings/${id}/`);
      await fetchReadings(); // Refresh readings list
      toast.success('Η μέτρηση διαγράφηκε επιτυχώς');
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη διαγραφή της μέτρησης';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchReadings]);

  // Λήψη στατιστικών
  const fetchStatistics = useCallback(async () => {
    if (!buildingId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/financial/meter-readings/statistics/?building_id=${buildingId}`);
      setStatistics(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη λήψη στατιστικών';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [buildingId]);

  // Λήψη τύπων μετρητών
  const fetchMeterTypes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/financial/meter-readings/types/');
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Σφάλμα κατά τη λήψη τύπων μετρητών';
      setError(errorMessage);
      toast.error(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Αυτόματη φόρτωση μετρήσεων όταν αλλάζει το buildingId
  useEffect(() => {
    if (buildingId) {
      fetchReadings();
      fetchStatistics();
    }
  }, [buildingId, fetchReadings, fetchStatistics]);

  // Καθαρισμός σφάλματος
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    readings,
    loading,
    error,
    statistics,
    fetchReadings,
    createReading,
    updateReading,
    deleteReading,
    fetchStatistics,
    fetchMeterTypes,
    clearError,
  };
};
