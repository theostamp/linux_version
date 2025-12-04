'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Calendar, Euro, CreditCard, Receipt } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { api } from '@/lib/api';
import { ModalPortal } from '@/components/ui/ModalPortal';

export interface PaymentHistoryItem {
  id: number;
  amount: number;
  date: string;
  method: string;
  method_display?: string;
  payment_type: string;
  payment_type_display?: string;
  reference_number?: string;
  notes?: string;
  payer_name?: string;
}

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  apartment: {
    apartment_id: number;
    apartment_number: string;
    owner_name: string;
    payment_breakdown?: PaymentHistoryItem[]; // Κάνε το optional
  } | null;
}

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  apartment,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentHistoryItem[]>([]);

  useEffect(() => {
    if (isOpen && apartment) {
      loadPaymentHistory();
    }
  }, [isOpen, apartment?.apartment_id]);

  const loadPaymentHistory = async () => {
    if (!apartment) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get the building ID from localStorage or context
      const buildingId = localStorage.getItem('selectedBuildingId') || '1';
      
      console.log('🔍 Loading payment history for apartment:', apartment.apartment_id);
      
      // Call API to get payments for this apartment
      // Use the same pattern as other financial endpoints
      const params = new URLSearchParams({
        apartment_id: apartment.apartment_id.toString(),
        building_id: buildingId,
        limit: '100'
      });
      
      console.log('📡 API call:', `/financial/payments/?apartment=${apartment.apartment_id}&ordering=-date&limit=100`);
      const response = await api.get(`/financial/payments/?apartment=${apartment.apartment_id}&ordering=-date&limit=100`);
      
      // Transform the response data to match our interface
      const payments: PaymentHistoryItem[] = (response.data.results || response.data || []).map((payment: any) => ({
        id: payment.id,
        amount: payment.amount,
        date: payment.date,
        method: payment.method || 'cash',
        method_display: payment.method === 'bank_transfer' ? 'Τραπεζική Κατάθεση' : 
                        payment.method === 'card' ? 'Κάρτα' : 'Μετρητά',
        payment_type: payment.payment_type || 'common_expense',
        payment_type_display: payment.payment_type === 'common_expense' ? 'Κοινόχρηστα' :
                             payment.payment_type === 'reserve_fund' ? 'Αποθεματικό' : 
                             payment.payment_type === 'previous_obligations' ? 'Παλαιότερες Οφειλές' : 'Άλλο',
        reference_number: payment.reference_number,
        notes: payment.notes,
        payer_name: payment.payer_name
      }));
      
      console.log('✅ Payments loaded:', payments.length, 'items');
      setPaymentBreakdown(payments);
    } catch (err: any) {
      console.error('❌ Error loading payment history:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError('Σφάλμα κατά τη φόρτωση του ιστορικού πληρωμών');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !apartment) {
    return null;
  }

  const totalPayments = paymentBreakdown.reduce((sum, payment) => sum + payment.amount, 0);
  const paymentCount = paymentBreakdown.length;

  return (
    <ModalPortal>
    <div 
      className="fixed inset-0 flex items-center justify-center z-[120] p-4 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/60 backdrop-blur-sm transition-colors"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Receipt className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">Ιστορικό Πληρωμών</h2>
              <p className="text-sm text-gray-600">
                Διαμέρισμα {apartment.apartment_number} • {apartment.owner_name}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-gray-600">Σύνολο Πληρωμών</span>
              </div>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(totalPayments)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-600">Αριθμός Πληρωμών</span>
              </div>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {paymentCount}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-600">Τελευταία Πληρωμή</span>
              </div>
              <p className="text-lg font-semibold text-purple-600 mt-1">
                {paymentBreakdown.length > 0 
                  ? formatDate(paymentBreakdown[0].date)
                  : 'Δεν υπάρχουν πληρωμές'
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Λεπτομερές Ιστορικό Πληρωμών
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Φόρτωση ιστορικού...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
              </div>
            ) : paymentBreakdown.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Δεν βρέθηκαν πληρωμές για αυτό το διαμέρισμα</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Ημερομηνία</th>
                      <th className="text-left py-3 px-4">Ποσό</th>
                      <th className="text-left py-3 px-4">Μέθοδος</th>
                      <th className="text-left py-3 px-4">Τύπος</th>
                      <th className="text-left py-3 px-4">Αριθμός Αναφοράς</th>
                      <th className="text-left py-3 px-4">Σημειώσεις</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentBreakdown.map((payment, index) => (
                      <tr key={`${payment.id}-${payment.date}-${index}`} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">
                              {formatDate(payment.date)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-green-600">
                            {formatCurrency(payment.amount)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs">
                            {payment.method_display || payment.method}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary" className="text-xs">
                            {payment.payment_type_display || payment.payment_type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600">
                            {payment.reference_number || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600 max-w-xs truncate">
                            {payment.notes || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Close Button */}
        <div className="flex justify-end mt-6">
          <Button onClick={onClose} variant="outline">
            Κλείσιμο
          </Button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
