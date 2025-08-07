'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePayments } from '@/hooks/usePayments';
import { Payment, PaymentMethod } from '@/types/financial';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PaymentListProps {
  buildingId: number;
  onPaymentSelect?: (payment: Payment) => void;
  showActions?: boolean;
  apartmentFilter?: string;
  selectedMonth?: string; // Add selectedMonth prop
}

export const PaymentList: React.FC<PaymentListProps> = ({
  buildingId,
  onPaymentSelect,
  showActions = true,
  apartmentFilter,
  selectedMonth,
}) => {
  const { payments, isLoading, error } = usePayments(buildingId, selectedMonth);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const filteredPayments = useMemo(() => {
    if (!payments) return [];

    return payments.filter((payment) => {
      // Apartment filter
      if (apartmentFilter && payment.apartment !== apartmentFilter) {
        return false;
      }

      // Search filter
      const matchesSearch = 
        payment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.apartment_number?.toLowerCase().includes(searchTerm.toLowerCase());

      // Method filter
      const matchesMethod = methodFilter === 'all' || payment.method === methodFilter;

      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const paymentDate = new Date(payment.date);
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

      return matchesSearch && matchesMethod && matchesDate;
    });
  }, [payments, searchTerm, methodFilter, dateFilter, apartmentFilter]);

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      'cash': 'bg-green-100 text-green-800',
      'bank_transfer': 'bg-blue-100 text-blue-800',
      'check': 'bg-purple-100 text-purple-800',
      'card': 'bg-orange-100 text-orange-800',
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'cash': 'Μετρητά',
      'bank_transfer': 'Τραπεζική Μεταφορά',
      'check': 'Επιταγή',
      'card': 'Κάρτα',
    };
    return labels[method] || method;
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
            Σφάλμα κατά τη φόρτωση των εισπράξεων: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Λίστα Εισπράξεων</span>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">
              {filteredPayments.length} από {payments?.length || 0}
            </Badge>
            <Badge variant="outline" className="text-green-600">
              Σύνολο: {formatCurrency(totalAmount)}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Input
            placeholder="Αναζήτηση εισπράξεως..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:col-span-2"
          />
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Τρόπος Πληρωμής" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλοι οι τρόποι</SelectItem>
              <SelectItem value="cash">Μετρητά</SelectItem>
              <SelectItem value="bank_transfer">Τραπεζική Μεταφορά</SelectItem>
              <SelectItem value="check">Επιταγή</SelectItem>
              <SelectItem value="card">Κάρτα</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Περίοδος" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλες οι ημερομηνίες</SelectItem>
              <SelectItem value="today">Σήμερα</SelectItem>
              <SelectItem value="this_month">Αυτός ο μήνας</SelectItem>
              <SelectItem value="last_month">Προηγούμενος μήνας</SelectItem>
              <SelectItem value="this_year">Αυτό το έτος</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payments List */}
        <div className="space-y-4">
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Δεν βρέθηκαν εισπράξεις με τα επιλεγμένα κριτήρια
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
                        Είσπραξη - {payment.apartment_number || `Διαμέρισμα ${payment.apartment}`}
                      </h3>
                      <Badge className={getMethodColor(payment.method)}>
                        {getMethodLabel(payment.method)}
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
                        <span className="ml-1">{formatDate(payment.date)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Διαμέρισμα:</span>
                        <span className="ml-1">{payment.apartment_number || payment.apartment}</span>
                      </div>
                      <div>
                        <span className="font-medium">Δημιουργήθηκε:</span>
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