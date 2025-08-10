'use client';

import React, { useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';
import { Payment, PaymentMethod } from '@/types/financial';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PaymentDetailModal } from './PaymentDetailModal';

interface PaymentWithProgressiveBalance extends Payment {
  progressiveBalance: number;
  paymentCount?: number; // Για συγκεντρωτικές εγγραφές
}

interface PaymentListProps {
  buildingId: number;
  onPaymentSelect?: (payment: Payment) => void;
  showActions?: boolean;
  apartmentFilter?: string;
  selectedMonth?: string; // Add selectedMonth prop
  onRefresh?: () => void; // Add onRefresh prop
}

export const PaymentList = forwardRef<{ refresh: () => void }, PaymentListProps>(({
  buildingId,
  onPaymentSelect,
  showActions = true,
  apartmentFilter,
  selectedMonth,
  onRefresh,
}, ref) => {
  const { payments, isLoading, error, loadPayments } = usePayments(buildingId, selectedMonth);
  
  // Expose refresh method to parent component
  useImperativeHandle(ref, () => ({
    refresh: () => {
      console.log('PaymentList refresh called');
      loadPayments();
      onRefresh?.();
    }
  }));

  // Auto-refresh when selectedMonth changes
  React.useEffect(() => {
    if (buildingId && selectedMonth) {
      loadPayments();
    }
  }, [buildingId, selectedMonth, loadPayments]);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [payerFilter, setPayerFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);



  // Συγκεντρωτικά στοιχεία ανά διαμέρισμα/ενοίκο με φιλτραρίσμα
  const apartmentSummaries = useMemo(() => {
    // Χρησιμοποιούμε τα αρχικά payments από το API (που ήδη φιλτράρονται ανά μήνα)
    if (!payments) return [];
    


    // Ομαδοποίηση πληρωμών ανά διαμέρισμα
    const paymentsByApartment = payments.reduce((acc, payment) => {
      const key = payment.apartment;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(payment);
      return acc;
    }, {} as Record<number, Payment[]>);

    // Δημιουργία συγκεντρωτικών εγγραφών ανά διαμέρισμα
    const summaries: PaymentWithProgressiveBalance[] = [];

    Object.entries(paymentsByApartment).forEach(([apartmentId, apartmentPayments]) => {
      // Ταξινόμηση κατά ημερομηνία για σωστό υπολογισμό
      const sortedPayments = apartmentPayments.sort((a, b) => {
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare === 0) {
          return a.id - b.id;
        }
        return dateCompare;
      });

      // Υπολογισμός συγκεντρωτικών στοιχείων
      const totalAmount = sortedPayments.reduce((sum, payment) => {
        const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : Number(payment.amount);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      // Χρησιμοποιούμε τα στοιχεία της πιο πρόσφατης πληρωμής ως βάση
      const latestPayment = sortedPayments[sortedPayments.length - 1];
      const oldestPayment = sortedPayments[0];
      
      // Χρησιμοποιούμε απευθείας το current_balance από το API
      // Αυτό θα πρέπει να είναι το τρέχον υπόλοιπο του διαμερίσματος
      const currentBalance = latestPayment.current_balance || 0;

      // Δημιουργία συγκεντρωτικής εγγραφής
      summaries.push({
        ...latestPayment, // Χρησιμοποιούμε τα στοιχεία της τελευταίας πληρωμής
        id: `apartment-summary-${apartmentId}` as any, // Σταθερό ID για κάθε διαμέρισμα
        amount: totalAmount, // Συνολικό ποσό όλων των πληρωμών
        date: oldestPayment.date, // Ημερομηνία πρώτης πληρωμής
        notes: `${sortedPayments.length} πληρωμ${sortedPayments.length === 1 ? 'ή' : 'ές'}`,
        progressiveBalance: currentBalance, // Τρέχον υπόλοιπο από το API
        paymentCount: sortedPayments.length, // Πλήθος πληρωμών για την καρτέλα
        // Διασφαλίζουμε ότι έχουμε τα σωστά δεδομένα διαμερίσματος
        apartment_number: latestPayment.apartment_number || `Διαμέρισμα ${latestPayment.apartment}`,
        owner_name: latestPayment.owner_name && latestPayment.owner_name.trim() !== '' ? latestPayment.owner_name : null,
        tenant_name: latestPayment.tenant_name && latestPayment.tenant_name.trim() !== '' ? latestPayment.tenant_name : null
      });
    });

    // Ταξινόμηση κατά διαμέρισμα
    const sortedSummaries = summaries.sort((a, b) => {
      const apartmentA = a.apartment_number || `C${a.apartment}`;
      const apartmentB = b.apartment_number || `C${b.apartment}`;
      return apartmentA.localeCompare(apartmentB);
    });
    
    // Φιλτράρισμα ανά τύπο πληρωτή
    const filteredSummaries = sortedSummaries.filter((summary) => {
      // Φίλτρο αναζήτησης
      const matchesSearch = 
        summary.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.apartment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.owner_name?.toLowerCase().includes(searchTerm.toLowerCase());

      // Φίλτρο τύπου πληρωτή
      let matchesPayer = true;
      if (payerFilter !== 'all') {
        switch (payerFilter) {
          case 'tenant':
            matchesPayer = summary.tenant_name && summary.tenant_name.trim() !== '';
            break;
          case 'owner':
            matchesPayer = summary.owner_name && summary.owner_name.trim() !== '' && (!summary.tenant_name || summary.tenant_name.trim() === '');
            break;
          case 'unregistered':
            matchesPayer = (!summary.tenant_name || summary.tenant_name.trim() === '') && (!summary.owner_name || summary.owner_name.trim() === '');
            break;
        }
      }

      return matchesSearch && matchesPayer;
    });
    
    return filteredSummaries;
  }, [payments, searchTerm, payerFilter]);

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

  const totalAmount = apartmentSummaries.reduce((sum, summary) => {
    // Ensure proper number conversion - handle both string and number inputs
    const amount = typeof summary.amount === 'string' ? parseFloat(summary.amount) : Number(summary.amount);
    const validAmount = isNaN(amount) ? 0 : amount;
    return sum + validAmount;
  }, 0);

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
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Λίστα Εισπράξεων</span>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadPayments();
                onRefresh?.();
              }}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Ανανέωση
            </Button>
            <Badge variant="secondary">
              {apartmentSummaries.length} ενοίκο{apartmentSummaries.length === 1 ? 'ς' : 'ι'}
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
            placeholder="Αναζήτηση εισπράξεως..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:col-span-2"
          />
          <Select value={payerFilter} onValueChange={setPayerFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Τύπος Πληρωτή" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλοι οι πληρωτές</SelectItem>
              <SelectItem value="tenant">Ενοικιαστές</SelectItem>
              <SelectItem value="owner">Ιδιοκτήτες</SelectItem>
              <SelectItem value="unregistered">Μη καταχωρημένοι</SelectItem>
            </SelectContent>
          </Select>
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

        {/* Apartments Summary List */}
        <div className="space-y-4">
          {apartmentSummaries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Δεν βρέθηκαν εισπράξεις με τα επιλεγμένα κριτήρια
            </div>
          ) : (
            apartmentSummaries.map((summary, index) => (
              <div
                key={`${summary.id}-${index}`}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">
                        <span className="text-blue-600">{summary.apartment_number || `Διαμέρισμα ${summary.apartment}`}</span>
                      </h3>
                      <Badge className="bg-blue-100 text-blue-800">
                        {summary.notes} {/* Εμφανίζει "X πληρωμές" */}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm text-gray-600">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Τελευταία Καταβολή:</div>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(typeof summary.amount === 'string' ? parseFloat(summary.amount) : Number(summary.amount))}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Ημερομηνία:</div>
                        <span>{formatDate(summary.date)}</span>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Ενοίκος:</div>
                        <div className="flex flex-col gap-1">
                          {summary.tenant_name && summary.tenant_name.trim() !== '' ? (
                            <>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">
                                Ενοικιαστής
                              </Badge>
                              <span className="text-blue-600 font-medium">{summary.tenant_name}</span>
                            </>
                          ) : summary.owner_name && summary.owner_name.trim() !== '' ? (
                            <>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                                Ιδιοκτήτης
                              </Badge>
                              <span className="text-green-600 font-medium">{summary.owner_name}</span>
                            </>
                          ) : (
                            <span className="text-gray-400 italic">Μη καταχωρημένο</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Κατοικία:</div>
                        <span className="text-blue-600">
                          {summary.apartment_number || `Διαμέρισμα ${summary.apartment}`}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Μηνιαία Οφειλή:</div>
                        <span className="text-orange-600 font-medium">
                          {summary.monthly_due ? formatCurrency(summary.monthly_due) : '-'}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          Τρέχον Υπόλοιπο {summary.progressiveBalance < 0 ? '(χρεωστικό)' : summary.progressiveBalance > 0 ? '(πιστωτικό)' : ''}:
                        </div>
                        <span className={`font-medium ${
                          summary.progressiveBalance < 0 
                            ? 'text-red-600' 
                            : summary.progressiveBalance > 0 
                              ? 'text-green-600' 
                              : 'text-gray-600'
                        }`}>
                          {formatCurrency(summary.progressiveBalance)}
                        </span>
                      </div>
                    </div>

                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPayment(summary);
                        setShowDetailModal(true);
                      }}
                    >
                      Καρτέλα
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
    
    {/* Payment Detail Modal */}
    <PaymentDetailModal
      payment={selectedPayment}
      isOpen={showDetailModal}
      onClose={() => {
        setShowDetailModal(false);
        setSelectedPayment(null);
      }}
    />
    </>
  );
});

PaymentList.displayName = 'PaymentList';