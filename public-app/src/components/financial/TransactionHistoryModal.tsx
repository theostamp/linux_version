'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Calendar, Euro, TrendingUp, TrendingDown, Receipt, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { api } from '@/lib/api';
import { ModalPortal } from '@/components/ui/ModalPortal';

export interface TransactionItem {
  id: number;
  date: string;
  amount: number;
  type: string;
  type_display: string;
  description: string;
  balance_before: number;
  balance_after: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
}

export interface MonthlyData {
  month: string;
  month_display: string;
  charges: TransactionItem[];
  payments: TransactionItem[];
  total_charges: number;
  total_payments: number;
  net_amount: number;
}

export interface TransactionHistoryData {
  apartment: {
    id: number;
    number: string;
    owner_name: string;
    current_balance: number;
  };
  months: MonthlyData[];
  summary: {
    total_charges: number;
    total_payments: number;
    net_amount: number;
    months_with_activity: number;
  };
}

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  apartmentId: number;
  buildingId: number;
  apartmentNumber: string;
  ownerName: string;
}

export const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({
  isOpen,
  onClose,
  apartmentId,
  buildingId,
  apartmentNumber,
  ownerName,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TransactionHistoryData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  useEffect(() => {
    if (isOpen && apartmentId && buildingId) {
      loadTransactionHistory();
    }
  }, [isOpen, apartmentId, buildingId]);

  const loadTransactionHistory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        building_id: buildingId.toString(),
        apartment_id: apartmentId.toString(),
        months_back: '6'
      });
      
      const response = await api.get(`/financial/dashboard/apartment_transaction_history/?${params}`);
      setData(response.data);
    } catch (err: any) {
      console.error('Error loading transaction history:', err);
      setError(err.response?.data?.detail || err.message || 'Σφάλμα φόρτωσης ιστορικού');
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    if (type.includes('payment') || type.includes('received')) {
      return <ArrowUpRight className="w-4 h-4 text-green-600" />;
    } else {
      return <ArrowDownRight className="w-4 h-4 text-red-600" />;
    }
  };

  const getTransactionBadgeVariant = (type: string) => {
    if (type.includes('payment') || type.includes('received')) {
      return 'default' as const;
    } else {
      return 'destructive' as const;
    }
  };

  const filteredMonths = selectedMonth === 'all' 
    ? data?.months || []
    : data?.months.filter(m => m.month === selectedMonth) || [];

  if (!isOpen) {
    return null;
  }

  return (
    <ModalPortal>
    <div 
      className="fixed inset-0 flex items-center justify-center z-[120] p-4 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/60 backdrop-blur-sm transition-colors"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Receipt className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">Ιστορικό Κινήσεων</h2>
              <p className="text-sm text-gray-600">
                Διαμέρισμα {apartmentNumber} • {ownerName}
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

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Φόρτωση ιστορικού...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-gray-600">Συνολικές Χρεώσεις</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {formatCurrency(data.summary.total_charges)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Συνολικές Πληρωμές</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(data.summary.total_payments)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Καθαρό Ποσό</span>
                  </div>
                  <p className={`text-2xl font-bold mt-1 ${
                    data.summary.net_amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(data.summary.net_amount)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">Μήνες με Δραστηριότητα</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {data.summary.months_with_activity}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Month Filter */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Φίλτρο Μήνα:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Όλοι οι μήνες</option>
                {data.months.map((month) => (
                  <option key={month.month} value={month.month}>
                    {month.month_display}
                  </option>
                ))}
              </select>
            </div>

            {/* Transaction History */}
            <Tabs defaultValue="monthly" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="monthly">Ανά Μήνα</TabsTrigger>
                <TabsTrigger value="detailed">Λεπτομερές Ιστορικό</TabsTrigger>
              </TabsList>

              <TabsContent value="monthly" className="space-y-4">
                {filteredMonths.map((monthData) => (
                  <Card key={monthData.month}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          {monthData.month_display}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-red-600">
                            💸 Χρεώσεις: {formatCurrency(monthData.total_charges)}
                          </span>
                          <span className="text-green-600">
                            💰 Πληρωμές: {formatCurrency(monthData.total_payments)}
                          </span>
                          <span className={`font-semibold ${
                            monthData.net_amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            📊 Καθαρό: {formatCurrency(monthData.net_amount)}
                          </span>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Charges */}
                        <div>
                          <h4 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                            <TrendingDown className="h-4 w-4" />
                            Χρεώσεις ({monthData.charges.length})
                          </h4>
                          {monthData.charges.length > 0 ? (
                            <div className="space-y-2">
                              {monthData.charges.map((charge) => (
                                <div key={charge.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    {getTransactionIcon(charge.type)}
                                    <div>
                                      <p className="text-sm font-medium">{charge.description}</p>
                                      <p className="text-xs text-gray-600">{formatDate(charge.date)}</p>
                                    </div>
                                  </div>
                                  <Badge variant={getTransactionBadgeVariant(charge.type)} className="text-xs">
                                    {charge.type_display}
                                  </Badge>
                                  <span className="font-semibold text-red-600">
                                    -{formatCurrency(charge.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">Δεν υπάρχουν χρεώσεις</p>
                          )}
                        </div>

                        {/* Payments */}
                        <div>
                          <h4 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Πληρωμές ({monthData.payments.length})
                          </h4>
                          {monthData.payments.length > 0 ? (
                            <div className="space-y-2">
                              {monthData.payments.map((payment) => (
                                <div key={payment.id} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    {getTransactionIcon(payment.type)}
                                    <div>
                                      <p className="text-sm font-medium">{payment.description}</p>
                                      <p className="text-xs text-gray-600">{formatDate(payment.date)}</p>
                                    </div>
                                  </div>
                                  <Badge variant={getTransactionBadgeVariant(payment.type)} className="text-xs">
                                    {payment.type_display}
                                  </Badge>
                                  <span className="font-semibold text-green-600">
                                    +{formatCurrency(payment.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">Δεν υπάρχουν πληρωμές</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="detailed" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      Λεπτομερές Ιστορικό Κινήσεων
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4">Ημερομηνία</th>
                            <th className="text-left py-3 px-4">Τύπος</th>
                            <th className="text-left py-3 px-4">Περιγραφή</th>
                            <th className="text-left py-3 px-4">Ποσό</th>
                            <th className="text-left py-3 px-4">Υπόλοιπο Πριν</th>
                            <th className="text-left py-3 px-4">Υπόλοιπο Μετά</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMonths.flatMap(month => 
                            [...month.charges, ...month.payments]
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          ).map((transaction) => (
                            <tr key={transaction.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium">
                                    {formatDate(transaction.date)}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant={getTransactionBadgeVariant(transaction.type)} className="text-xs">
                                  {transaction.type_display}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm">{transaction.description}</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`font-semibold ${
                                  transaction.type.includes('payment') || transaction.type.includes('received')
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}>
                                  {transaction.type.includes('payment') || transaction.type.includes('received') ? '+' : '-'}
                                  {formatCurrency(transaction.amount)}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm text-gray-600">
                                  {formatCurrency(transaction.balance_before)}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm font-medium">
                                  {formatCurrency(transaction.balance_after)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Δεν βρέθηκαν δεδομένα ιστορικού</p>
          </div>
        )}
      </div>
    </div>
    </ModalPortal>
  );
};
