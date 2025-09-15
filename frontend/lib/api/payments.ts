/**
 * Payment API Service - Καθαρή και αξιόπιστη διαχείριση πληρωμών
 */

import { apiClient } from '@/lib/apiClient';

export interface Payment {
  id: number;
  apartment: number;
  amount: string;
  date: string;
  method: 'cash' | 'bank_transfer' | 'check' | 'card';
  reference_number?: string;
  notes?: string;
  receipt?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentAllocation {
  common_expenses?: string;
  previous_obligations?: string;
  reserve_fund?: string;
  other?: string;
}

export interface CreatePaymentData {
  apartment: number;
  amount: string;
  date: string;
  method: string;
  reference_number?: string;
  notes?: string;
  allocations?: PaymentAllocation;
}

export interface ApartmentBalance {
  apartment_id: number;
  apartment_number: string;
  owner_name: string;
  total_charges: string;
  total_payments: string;
  balance: string;
  has_debt: boolean;
  debt_amount: string;
  credit_amount: string;
}

export interface MonthlyBalance {
  apartment_id: number;
  apartment_number: string;
  owner_name: string;
  year: number;
  month: number;
  previous_balance: string;
  month_charges: string;
  month_payments: string;
  ending_balance: string;
  carry_over_to_next: string;
}

export interface MonthlySummary {
  month: string;
  apartments: MonthlyBalance[];
  totals: {
    total_charges: string;
    total_payments: string;
    total_debt: string;
    collection_rate: number;
  };
}

export interface PaymentValidation {
  is_valid: boolean;
  errors?: string[];
  validation_data?: any;
}

class PaymentService {
  /**
   * Λήψη όλων των πληρωμών με φίλτρα
   */
  async getPayments(params?: {
    building_id?: number;
    month?: string;
    apartment?: number;
  }): Promise<Payment[]> {
    const response = await apiClient.get('/financial/payments/', { params });
    return response.data.results || response.data;
  }

  /**
   * Δημιουργία νέας πληρωμής
   */
  async createPayment(data: CreatePaymentData): Promise<Payment> {
    const response = await apiClient.post('/financial/payments/', data);
    return response.data;
  }

  /**
   * Ενημέρωση πληρωμής
   */
  async updatePayment(id: number, data: Partial<CreatePaymentData>): Promise<Payment> {
    const response = await apiClient.put(`/financial/payments/${id}/`, data);
    return response.data;
  }

  /**
   * Διαγραφή πληρωμής
   */
  async deletePayment(id: number): Promise<void> {
    await apiClient.delete(`/financial/payments/${id}/`);
  }

  /**
   * Λήψη υπολοίπων όλων των διαμερισμάτων
   */
  async getBalances(buildingId: number): Promise<ApartmentBalance[]> {
    const response = await apiClient.get('/financial/payments/balances/', {
      params: { building_id: buildingId }
    });
    return response.data;
  }

  /**
   * Λήψη μηνιαίας σύνοψης
   */
  async getMonthlySummary(buildingId: number, month: string): Promise<MonthlySummary> {
    const response = await apiClient.get('/financial/payments/monthly_summary/', {
      params: { building_id: buildingId, month }
    });
    return response.data;
  }

  /**
   * Επικύρωση υπολοίπου διαμερίσματος
   */
  async validateBalance(apartmentId: number): Promise<PaymentValidation> {
    const response = await apiClient.post('/financial/payments/validate_balance/', {
      apartment_id: apartmentId
    });
    return response.data;
  }

  /**
   * Επικύρωση πληρωμής
   */
  async validatePayment(paymentId: number): Promise<PaymentValidation> {
    const response = await apiClient.post(`/financial/payments/${paymentId}/validate_payment/`);
    return response.data;
  }

  /**
   * Ανανέωση υπολοίπων από transactions
   */
  async refreshBalances(buildingId: number): Promise<{
    success: boolean;
    updated_apartments: number;
    message: string;
  }> {
    const response = await apiClient.post('/financial/payments/refresh_balances/', {
      building_id: buildingId
    });
    return response.data;
  }

  /**
   * Λήψη διαθέσιμων μεθόδων πληρωμής
   */
  async getPaymentMethods(): Promise<Array<{ value: string; label: string }>> {
    const response = await apiClient.get('/financial/payments/methods/');
    return response.data;
  }

  /**
   * Upload απόδειξης πληρωμής
   */
  async uploadReceipt(paymentId: number, file: File): Promise<Payment> {
    const formData = new FormData();
    formData.append('receipt', file);

    const response = await apiClient.patch(
      `/financial/payments/${paymentId}/`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
    return response.data;
  }
}

// Singleton instance
export const paymentService = new PaymentService();

// Export για χρήση με React Query
export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (filters: any) => [...paymentKeys.lists(), filters] as const,
  details: () => [...paymentKeys.all, 'detail'] as const,
  detail: (id: number) => [...paymentKeys.details(), id] as const,
  balances: (buildingId: number) => ['balances', buildingId] as const,
  monthlySummary: (buildingId: number, month: string) =>
    ['monthly-summary', buildingId, month] as const,
};