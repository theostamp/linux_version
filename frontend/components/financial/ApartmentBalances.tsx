'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinancialDashboard } from '@/hooks/useFinancialDashboard';
import { ApartmentBalance } from '@/types/financial';
import { formatCurrency } from '@/lib/utils';

interface ApartmentBalancesProps {
  buildingId: number;
  onApartmentSelect?: (apartmentId: number) => void;
  showActions?: boolean;
}

export const ApartmentBalances: React.FC<ApartmentBalancesProps> = ({
  buildingId,
  onApartmentSelect,
  showActions = true,
}) => {
  const { apartmentBalances, isLoading, error } = useFinancialDashboard(buildingId);
  const [searchTerm, setSearchTerm] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('balance');

  const filteredAndSortedBalances = useMemo(() => {
    if (!apartmentBalances) return [];

    const filtered = apartmentBalances.filter((balance) => {
      // Search filter
      const matchesSearch = 
        balance.apartment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        balance.owner_name?.toLowerCase().includes(searchTerm.toLowerCase());

      // Balance filter
      let matchesBalance = true;
      switch (balanceFilter) {
        case 'positive':
          matchesBalance = balance.current_balance > 0;
          break;
        case 'negative':
          matchesBalance = balance.current_balance < 0;
          break;
        case 'zero':
          matchesBalance = balance.current_balance === 0;
          break;
        case 'overdue':
          matchesBalance = balance.current_balance < -50; // Threshold for overdue
          break;
      }

      return matchesSearch && matchesBalance;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'balance':
          return b.current_balance - a.current_balance;
        case 'balance_asc':
          return a.current_balance - b.current_balance;
        case 'apartment':
          return a.apartment_number.localeCompare(b.apartment_number);
        case 'owner':
          return (a.owner_name || '').localeCompare(b.owner_name || '');
        case 'mills':
          return b.participation_mills - a.participation_mills;
        default:
          return 0;
      }
    });

    return filtered;
  }, [apartmentBalances, searchTerm, balanceFilter, sortBy]);

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-green-600';
    if (balance < -50) return 'text-red-600';
    if (balance < 0) return 'text-orange-600';
    return 'text-gray-600';
  };

  const getBalanceBadge = (balance: number) => {
    if (balance > 0) {
      return <Badge className="bg-green-100 text-green-800">Πιστωτικό</Badge>;
    }
    if (balance < -50) {
      return <Badge className="bg-red-100 text-red-800">Καθυστέρηση</Badge>;
    }
    if (balance < 0) {
      return <Badge className="bg-orange-100 text-orange-800">Οφειλή</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800">Εξοφλημένο</Badge>;
  };

  const totalBalance = filteredAndSortedBalances.reduce((sum, balance) => sum + balance.current_balance, 0);
  const totalDebt = filteredAndSortedBalances.reduce((sum, balance) => sum + Math.min(0, balance.current_balance), 0);
  const totalCredit = filteredAndSortedBalances.reduce((sum, balance) => sum + Math.max(0, balance.current_balance), 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
            Σφάλμα κατά τη φόρτωση των υπολοίπων: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Κατάσταση Οφειλών</span>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">
              {filteredAndSortedBalances.length} διαμερίσματα
            </Badge>
            <Badge variant="outline" className="text-green-600">
              Σύνολο: {formatCurrency(totalBalance)}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Συνολικό Υπόλοιπο</p>
                <p className={`text-2xl font-bold ${getBalanceColor(totalBalance)}`}>
                  {formatCurrency(totalBalance)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Συνολικές Οφειλές</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(Math.abs(totalDebt))}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Συνολικό Πιστωτικό</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalCredit)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Input
            placeholder="Αναζήτηση διαμερίσματος..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:col-span-2"
          />
          <Select value={balanceFilter} onValueChange={setBalanceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Κατάσταση" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλες οι καταστάσεις</SelectItem>
              <SelectItem value="positive">Πιστωτικό</SelectItem>
              <SelectItem value="negative">Οφειλή</SelectItem>
              <SelectItem value="zero">Εξοφλημένο</SelectItem>
              <SelectItem value="overdue">Καθυστέρηση</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Ταξινόμηση" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="balance">Υπόλοιπο (Φθίνουσα)</SelectItem>
              <SelectItem value="balance_asc">Υπόλοιπο (Αύξουσα)</SelectItem>
              <SelectItem value="apartment">Αριθμός Διαμερίσματος</SelectItem>
              <SelectItem value="owner">Ιδιοκτήτης</SelectItem>
              <SelectItem value="mills">Χιλιοστά</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Balances List */}
        <div className="space-y-4">
          {filteredAndSortedBalances.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Δεν βρέθηκαν διαμερίσματα με τα επιλεγμένα κριτήρια
            </div>
          ) : (
            filteredAndSortedBalances.map((balance) => (
              <div
                key={balance.apartment_id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onApartmentSelect?.(balance.apartment_id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">
                        Διαμέρισμα {balance.apartment_number}
                      </h3>
                      {getBalanceBadge(balance.current_balance)}
                      {balance.participation_mills > 0 && (
                        <Badge variant="outline">
                          {balance.participation_mills} χιλιοστά
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Τρέχον Υπόλοιπο:</span>
                        <span className={`ml-1 font-semibold ${getBalanceColor(balance.current_balance)}`}>
                          {formatCurrency(balance.current_balance)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Ιδιοκτήτης:</span>
                        <span className="ml-1">
                          {balance.owner_name || 'Δεν έχει καταχωρηθεί'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Συνολικές Εισπράξεις:</span>
                        <span className="ml-1 font-semibold text-green-600">
                          {formatCurrency(balance.total_payments || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Συνολικές Δαπάνες:</span>
                        <span className="ml-1 font-semibold text-red-600">
                          {formatCurrency(balance.total_expenses || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Payment History Summary */}
                    {balance.recent_payments && balance.recent_payments.length > 0 && (
                      <div className="mt-2 text-sm text-gray-500">
                        <span className="font-medium">Πρόσφατες εισπράξεις:</span>
                        <div className="flex gap-2 mt-1">
                          {balance.recent_payments.slice(0, 3).map((payment, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {formatCurrency(payment.amount)} - {payment.payment_date}
                            </Badge>
                          ))}
                          {balance.recent_payments.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{balance.recent_payments.length - 3} ακόμα
                            </Badge>
                          )}
                        </div>
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
                          onApartmentSelect?.(balance.apartment_id);
                        }}
                      >
                        Λεπτομέρειες
                      </Button>
                      {balance.current_balance < 0 && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Open payment form for this apartment
                          }}
                        >
                                                      Είσπραξη
                        </Button>
                      )}
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