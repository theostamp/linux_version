'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePayments } from '@/hooks/usePayments';
import { Payment, PaymentMethod, PaymentType } from '@/types/financial';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PaymentListProps {
  buildingId: number;
  onPaymentSelect?: (payment: Payment) => void;
  showActions?: boolean;
  apartmentFilter?: number;
}

export const PaymentList: React.FC<PaymentListProps> = ({
  buildingId,
  onPaymentSelect,
  showActions = true,
  apartmentFilter,
}) => {
  const { payments, isLoading, error } = usePayments(buildingId);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const filteredPayments = useMemo(() => {
    if (!payments) return [];

    return payments.filter((payment) => {
      // Apartment filter
      if (apartmentFilter && payment.apartment_id !== apartmentFilter) {
        return false;
      }

      // Search filter
      const matchesSearch = 
        payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.apartment_number?.toLowerCase().includes(searchTerm.toLowerCase());

      // Method filter
      const matchesMethod = methodFilter === 'all' || payment.payment_method === methodFilter;

      // Type filter
      const matchesType = typeFilter === 'all' || payment.payment_type === typeFilter;

      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const paymentDate = new Date(payment.payment_date);
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfYear = new Date(today.getFullYear(), 0, 1);

        switch (dateFilter) {
          case 'today':
            matchesDate = paymentDate.toDateString() === today.toDateString();
            break;
          case 'this_month':
            matchesDate = paymentDate >= startOfMonth;
            break;
          case 'this_year':
            matchesDate = paymentDate >= startOfYear;
            break;
          case 'last_month':
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            matchesDate = paymentDate >= lastMonth && paymentDate <= endOfLastMonth;
            break;
        }
      }

      return matchesSearch && matchesMethod && matchesType && matchesDate;
    });
  }, [payments, searchTerm, methodFilter, typeFilter, dateFilter, apartmentFilter]);

  const getMethodColor = (method: PaymentMethod) => {
    const colors: Record<PaymentMethod, string> = {
      [PaymentMethod.CASH]: 'bg-green-100 text-green-800',
      [PaymentMethod.BANK_TRANSFER]: 'bg-blue-100 text-blue-800',
      [PaymentMethod.CHECK]: 'bg-purple-100 text-purple-800',
      [PaymentMethod.CREDIT_CARD]: 'bg-orange-100 text-orange-800',
      [PaymentMethod.DEBIT_CARD]: 'bg-cyan-100 text-cyan-800',
      [PaymentMethod.OTHER]: 'bg-gray-100 text-gray-800',
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: PaymentType) => {
    const colors: Record<PaymentType, string> = {
      [PaymentType.COMMON_EXPENSE]: 'bg-blue-100 text-blue-800',
      [PaymentType.RESERVE_FUND]: 'bg-green-100 text-green-800',
      [PaymentType.SPECIAL_EXPENSE]: 'bg-orange-100 text-orange-800',
      [PaymentType.ADVANCE]: 'bg-purple-100 text-purple-800',
      [PaymentType.OTHER]: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getMethodLabel = (method: PaymentMethod) => {
    const labels: Record<PaymentMethod, string> = {
      [PaymentMethod.CASH]: 'Μετρητά',
      [PaymentMethod.BANK_TRANSFER]: 'Τραπεζική Μεταφορά',
      [PaymentMethod.CHECK]: 'Επιταγή',
      [PaymentMethod.CREDIT_CARD]: 'Πιστωτική Κάρτα',
      [PaymentMethod.DEBIT_CARD]: 'Χρεωστική Κάρτα',
      [PaymentMethod.OTHER]: 'Άλλο',
    };
    return labels[method];
  };

  const getTypeLabel = (type: PaymentType) => {
    const labels: Record<PaymentType, string> = {
      [PaymentType.COMMON_EXPENSE]: 'Κοινόχρηστα',
      [PaymentType.RESERVE_FUND]: 'Ταμείο Εφεδρείας',
      [PaymentType.SPECIAL_EXPENSE]: 'Ειδική Δαπάνη',
      [PaymentType.ADVANCE]: 'Προκαταβολή',
      [PaymentType.OTHER]: 'Άλλο',
    };
    return labels[type];
  };

  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Σφάλμα κατά τη φόρτωση των πληρωμών: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Λίστα Πληρωμών</span>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">
              {filteredPayments.length} πληρωμές
            </Badge>
            <Badge variant="outline" className="text-green-600">
              Σύνολο: {formatCurrency(totalAmount)}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Input
            placeholder="Αναζήτηση πληρωμής..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:col-span-2"
          />
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Μέθοδος" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλες οι μέθοδοι</SelectItem>
              {Object.values(PaymentMethod).map((method) => (
                <SelectItem key={method} value={method}>
                  {getMethodLabel(method)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Τύπος" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλοι οι τύποι</SelectItem>
              {Object.values(PaymentType).map((type) => (
                <SelectItem key={type} value={type}>
                  {getTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Ημερομηνία" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλες οι ημερομηνίες</SelectItem>
              <SelectItem value="today">Σήμερα</SelectItem>
              <SelectItem value="this_month">Αυτόν τον μήνα</SelectItem>
              <SelectItem value="last_month">Τον προηγούμενο μήνα</SelectItem>
              <SelectItem value="this_year">Φέτος</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payments List */}
        <div className="space-y-4">
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Δεν βρέθηκαν πληρωμές με τα επιλεγμένα κριτήρια
            </div>
          ) : (
            filteredPayments.map((payment) => (
              <div
                key={payment.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onPaymentSelect?.(payment)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">
                        Διαμέρισμα {payment.apartment_number}
                      </h3>
                      <Badge className={getMethodColor(payment.payment_method)}>
                        {getMethodLabel(payment.payment_method)}
                      </Badge>
                      <Badge className={getTypeColor(payment.payment_type)}>
                        {getTypeLabel(payment.payment_type)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Ποσό:</span>
                        <span className="ml-1 font-semibold text-green-600">
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Ημερομηνία:</span>
                        <span className="ml-1">{formatDate(payment.payment_date)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Αναφορά:</span>
                        <span className="ml-1">
                          {payment.reference_number || 'Δεν υπάρχει'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Καταχωρήθηκε:</span>
                        <span className="ml-1">{formatDate(payment.created_at)}</span>
                      </div>
                    </div>

                    {payment.notes && (
                      <div className="mt-2 text-sm text-gray-500">
                        <span className="font-medium">Σημειώσεις:</span> {payment.notes}
                      </div>
                    )}
                  </div>

                  {showActions && (
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPaymentSelect?.(payment);
                        }}
                      >
                        Προβολή
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 