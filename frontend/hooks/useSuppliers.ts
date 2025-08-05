import { useState, useEffect } from 'react';
import { Supplier } from '@/types/financial';
import { apiClient } from '@/lib/apiClient';

interface UseSuppliersOptions {
  buildingId?: number;
  category?: string;
  isActive?: boolean;
}

interface UseSuppliersReturn {
  suppliers: Supplier[];
  loading: boolean;
  error: string | null;
  createSupplier: (data: Partial<Supplier>) => Promise<Supplier>;
  updateSupplier: (id: number, data: Partial<Supplier>) => Promise<Supplier>;
  deleteSupplier: (id: number) => Promise<void>;
  refreshSuppliers: () => Promise<void>;
}

export const useSuppliers = (options: UseSuppliersOptions = {}): UseSuppliersReturn => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (options.buildingId) {
        params.append('building_id', options.buildingId.toString());
      }
      if (options.category) {
        params.append('category', options.category);
      }
      if (options.isActive !== undefined) {
        params.append('is_active', options.isActive.toString());
      }

      const response = await apiClient.get(`/financial/suppliers/?${params.toString()}`);
      const apiData = response.data;
      setSuppliers(Array.isArray(apiData) ? apiData : apiData?.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Σφάλμα κατά τη φόρτωση προμηθευτών');
    } finally {
      setLoading(false);
    }
  };

  const createSupplier = async (data: Partial<Supplier>): Promise<Supplier> => {
    try {
      const response = await apiClient.post('/financial/suppliers/', data);
      await fetchSuppliers(); // Refresh the list
      return response.data;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Σφάλμα κατά τη δημιουργία προμηθευτή');
    }
  };

  const updateSupplier = async (id: number, data: Partial<Supplier>): Promise<Supplier> => {
    try {
      const response = await apiClient.put(`/financial/suppliers/${id}/`, data);
      await fetchSuppliers(); // Refresh the list
      return response.data;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Σφάλμα κατά την ενημέρωση προμηθευτή');
    }
  };

  const deleteSupplier = async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/financial/suppliers/${id}/`);
      await fetchSuppliers(); // Refresh the list
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Σφάλμα κατά τη διαγραφή προμηθευτή');
    }
  };

  const refreshSuppliers = async () => {
    await fetchSuppliers();
  };

  useEffect(() => {
    fetchSuppliers();
  }, [options.buildingId, options.category, options.isActive]);

  return {
    suppliers,
    loading,
    error,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    refreshSuppliers,
  };
};

// Hook για λήψη κατηγοριών προμηθευτών
export const useSupplierCategories = () => {
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/financial/suppliers/categories/');
      const apiData = response.data;
      setCategories(Array.isArray(apiData) ? apiData : apiData?.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Σφάλμα κατά τη φόρτωση κατηγοριών');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    refreshCategories: fetchCategories,
  };
};

// Hook για λήψη προμηθευτών ανά κατηγορία
export const useSuppliersByCategory = (buildingId: number, category?: string) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliersByCategory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('building_id', buildingId.toString());
      if (category) {
        params.append('category', category);
      }

      const response = await apiClient.get(`/financial/suppliers/by_category/?${params.toString()}`);
      const apiData = response.data;
      setSuppliers(Array.isArray(apiData) ? apiData : apiData?.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Σφάλμα κατά τη φόρτωση προμηθευτών');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (buildingId) {
      fetchSuppliersByCategory();
    }
  }, [buildingId, category]);

  return {
    suppliers,
    loading,
    error,
    refreshSuppliers: fetchSuppliersByCategory,
  };
}; 