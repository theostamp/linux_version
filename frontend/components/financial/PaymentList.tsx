'use client';

import React, { useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Plus, Trash2 } from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';
import { Payment, PaymentMethod } from '@/types/financial';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PaymentDetailModal } from './PaymentDetailModal';
import { AddPaymentModal } from './AddPaymentModal';

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
  const { payments, isLoading, error, loadPayments, deletePayment } = usePayments(buildingId, selectedMonth);
  
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
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);

  // Handle payment deletion
  const handleDeletePayment = (payment: Payment) => {
    setPaymentToDelete(payment);
    setShowDeleteConfirmation(true);
  };

  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return;
    
    setIsDeletingPayment(true);
    try {
      const success = await deletePayment(paymentToDelete.id);
      if (success) {
        setShowDeleteConfirmation(false);
        setPaymentToDelete(null);
        // Refresh the list
        loadPayments();
        onRefresh?.();
        // Show success message
        console.log('Payment deleted successfully');
      } else {
        console.error('Failed to delete payment');
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
    } finally {
      setIsDeletingPayment(false);
    }
  };

  const cancelDeletePayment = () => {
    setShowDeleteConfirmation(false);
    setPaymentToDelete(null);
  };

  // Συγκεντρωτικά στοιχεία ανά διαμέρισμα/ενοίκο με φιλτραρίσμα
  const apartmentSummaries = useMemo(() => {
    // Χρησιμοποιούμε τα αρχικά payments από το API (που ήδη φιλτράρονται ανά μήνα)
    if (!payments) return [];

    // ΣΗΜΕΙΩΣΗ: Διόρθωση υπολογισμού υπολοίπου
    // Το current_balance από το API περιέχει μόνο τις καταχωρημένες συναλλαγές
    // Για να πάρουμε το σωστό υπόλοιπο, αφαιρούμε τη μηνιαία οφειλή (monthly_due)
    // Αποτέλεσμα: actualBalance = current_balance - monthly_due
    


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
      
      // Υπολογισμός σωστού υπολοίπου: current_balance - monthly_due
      // current_balance = συνολικές πληρωμές - καταχωρημένες χρεώσεις
      // monthly_due = τρέχουσα μηνιαία οφειλή
      const currentBalance = (latestPayment.current_balance || 0);
      const monthlyDue = (latestPayment.monthly_due || 0);
      
      // Το πραγματικό υπόλοιπο είναι: πληρωμές - συνολικές οφειλές
      // Αν monthly_due > 0, σημαίνει ότι υπάρχει εκκρεμής οφειλή που δεν έχει καταχωρηθεί ως transaction
      const actualBalance = currentBalance - monthlyDue;
      
      // Debug log για επαλήθευση της διόρθωσης
      if (monthlyDue > 0) {
        console.log(`[PaymentList] Balance calculation for apartment ${apartmentId}:`, {
          currentBalance,
          monthlyDue,
          actualBalance,
          apartment_number: latestPayment.apartment_number
        });
      }

      // Δημιουργία συγκεντρωτικής εγγραφής
      summaries.push({
        ...latestPayment, // Χρησιμοποιούμε τα στοιχεία της τελευταίας πληρωμής
        id: `apartment-summary-${apartmentId}` as any, // Σταθερό ID για κάθε διαμέρισμα
        amount: totalAmount, // Συνολικό ποσό όλων των πληρωμών
        date: oldestPayment.date, // Ημερομηνία πρώτης πληρωμής
        notes: `${sortedPayments.length} πληρωμ${sortedPayments.length === 1 ? 'ή' : 'ές'}`,
        progressiveBalance: actualBalance, // Σωστό υπόλοιπο: πληρωμές - οφειλές
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
    
    // Φιλτράρισμα ανά τύπο ενοίκου
    const filteredSummaries = sortedSummaries.filter((summary) => {
      // Φίλτρο αναζήτησης
      const matchesSearch = 
        summary.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.apartment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.owner_name?.toLowerCase().includes(searchTerm.toLowerCase());

              // Φίλτρο τύπου ενοίκου
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
        <CardTitle className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span>Λίστα Εισπράξεων</span>
            {selectedMonth && (
              <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
                📅 {new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:gap-4">
            <Button
              onClick={() => setShowAddPaymentModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Νέα Εισπραξη
            </Button>
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
                              <SelectValue placeholder="Τύπος Ενοίκου" />
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

        {/* Payments Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          {apartmentSummaries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Δεν βρέθηκαν εισπράξεις με τα επιλεγμένα κριτήρια.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 table-fixed lg:table-auto">
              {/* Table Header */}
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 lg:w-auto">
                    Διαμέρισμα
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 lg:w-auto">
                    Ενοίκος
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 lg:w-auto hidden sm:table-cell">
                    Πληρωμές
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24 lg:w-auto">
                    Τελ. Καταβολή
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 lg:w-auto hidden md:table-cell">
                    Ημερομηνία
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24 lg:w-auto">
                    Μην. Οφειλή
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28 lg:w-auto">
                    Υπόλοιπο
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 lg:w-auto">
                    Ενέργειες
                  </th>
                </tr>
              </thead>
              
              {/* Table Body */}
              <tbody className="bg-white divide-y divide-gray-200">
                {apartmentSummaries.map((summary, index) => (
                  <tr
                key={`${summary.id}-${index}`}
                    className={`hover:bg-blue-50 transition-colors duration-150 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    {/* Διαμέρισμα */}
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-blue-600">
                          {summary.apartment_number || `Διαμέρισμα ${summary.apartment}`}
                    </div>
                      </div>
                    </td>
                    
                    {/* Ενοίκος */}
                    <td className="px-3 lg:px-6 py-4">
                      <div className="text-sm text-gray-900">
                          {summary.tenant_name && summary.tenant_name.trim() !== '' ? (
                          <div className="flex flex-col space-y-1">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs w-fit">
                                Ενοικιαστής
                              </Badge>
                            <span className="text-blue-600 font-medium text-xs lg:text-sm truncate" title={summary.tenant_name}>
                              {summary.tenant_name}
                            </span>
                          </div>
                          ) : summary.owner_name && summary.owner_name.trim() !== '' ? (
                          <div className="flex flex-col space-y-1">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs w-fit">
                                Ιδιοκτήτης
                              </Badge>
                            <span className="text-green-600 font-medium text-xs lg:text-sm truncate" title={summary.owner_name}>
                              {summary.owner_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Μη καταχωρημένος</span>
                          )}
                        </div>
                    </td>
                    
                    {/* Πληρωμές */}
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        {summary.notes}
                      </Badge>
                    </td>
                    
                    {/* Τελευταία Καταβολή */}
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-xs lg:text-sm font-semibold text-green-600">
                        {formatCurrency(typeof summary.amount === 'string' ? parseFloat(summary.amount) : Number(summary.amount))}
                      </div>
                    </td>
                    
                    {/* Ημερομηνία */}
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="text-xs lg:text-sm text-gray-900">
                        {formatDate(summary.date)}
                      </div>
                    </td>
                    
                    {/* Μηνιαία Οφειλή */}
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-xs lg:text-sm font-medium text-orange-600">
                          {summary.monthly_due ? formatCurrency(summary.monthly_due) : '-'}
                      </div>
                    </td>
                    
                    {/* Υπόλοιπο */}
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex flex-col items-end space-y-1">
                        <div className={`text-xs lg:text-sm font-semibold ${
                          summary.progressiveBalance < 0 
                            ? 'text-red-600' 
                            : summary.progressiveBalance > 0 
                              ? 'text-green-600' 
                              : 'text-gray-600'
                        }`}>
                          {formatCurrency(summary.progressiveBalance)}
                        </div>
                        <div className={`text-xs ${
                          summary.progressiveBalance < 0 
                            ? 'text-red-500' 
                            : summary.progressiveBalance > 0 
                              ? 'text-green-500' 
                              : 'text-gray-500'
                        }`}>
                          {summary.progressiveBalance < 0 
                            ? 'Χρεωστικό' 
                            : summary.progressiveBalance > 0 
                              ? 'Πιστωτικό' 
                              : 'Εξοφλημένο'
                          }
                        </div>
                      </div>
                    </td>
                    
                    {/* Ενέργειες */}
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1 lg:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPayment(summary);
                        setShowDetailModal(true);
                      }}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 text-xs lg:text-sm px-1 lg:px-2"
                        >
                          <span className="hidden lg:inline">Καρτέλα</span>
                          <span className="lg:hidden">📄</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePayment(summary);
                          }}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 text-xs lg:text-sm px-1 lg:px-2"
                          title="Διαγραφή εισπραξής"
                        >
                          <Trash2 className="w-3 h-3 lg:w-4 lg:h-4" />
                          <span className="hidden xl:inline ml-1">Διαγραφή</span>
                    </Button>
                  </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              
              {/* Table Footer - Summary */}
              <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={3} className="px-3 lg:px-6 py-3 text-left font-semibold text-gray-700">
                    Σύνολο ({apartmentSummaries.length} διαμερίσματα)
                  </td>
                  <td className="px-3 lg:px-6 py-3 text-right font-semibold text-green-700">
                    {formatCurrency(totalAmount)}
                  </td>
                  <td className="px-3 lg:px-6 py-3 hidden md:table-cell"></td>
                  <td className="px-3 lg:px-6 py-3 text-right font-semibold text-orange-700">
                    {formatCurrency(apartmentSummaries.reduce((sum, summary) => {
                      const amount = summary.monthly_due || 0;
                      return sum + amount;
                    }, 0))}
                  </td>
                  <td className="px-3 lg:px-6 py-3 text-right font-semibold text-gray-700">
                    {formatCurrency(apartmentSummaries.reduce((sum, summary) => {
                      return sum + summary.progressiveBalance;
                    }, 0))}
                  </td>
                  <td className="px-3 lg:px-6 py-3"></td>
                </tr>
              </tfoot>
            </table>
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
      onPaymentDeleted={() => {
        loadPayments();
        onRefresh?.();
        setShowDetailModal(false);
        setSelectedPayment(null);
      }}
    />

    {/* Add Payment Modal */}
    <AddPaymentModal
      buildingId={buildingId}
      isOpen={showAddPaymentModal}
      onClose={() => setShowAddPaymentModal(false)}
      onPaymentAdded={() => {
        loadPayments();
        onRefresh?.();
      }}
    />

    {/* Delete Confirmation Modal */}
    {showDeleteConfirmation && paymentToDelete && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Διαγραφή Εισπραξής
              </h3>
              <p className="text-sm text-gray-600">
                Η ενέργεια αυτή δεν μπορεί να αναιρεθεί
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              Είστε σίγουροι ότι θέλετε να διαγράψετε την εισπραξή;
            </p>
            
            {/* Payment Details */}
            <div className="bg-gray-50 rounded-lg p-3 border">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Διαμέρισμα:</span>
                  <p className="font-medium text-blue-600">
                    {paymentToDelete.apartment_number || `Διαμέρισμα ${paymentToDelete.apartment}`}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Ποσό:</span>
                  <p className="font-medium text-green-600">
                    {formatCurrency(typeof paymentToDelete.amount === 'string' ? parseFloat(paymentToDelete.amount) : Number(paymentToDelete.amount))}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Ημερομηνία:</span>
                  <p className="font-medium">
                    {formatDate(paymentToDelete.date)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Ενοίκος:</span>
                  <p className="font-medium">
                    {paymentToDelete.tenant_name || paymentToDelete.owner_name || 'Μη καταχωρημένος'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={cancelDeletePayment}
              disabled={isDeletingPayment}
            >
              Ακύρωση
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeletePayment}
              disabled={isDeletingPayment}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingPayment ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Διαγραφή...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Διαγραφή Εισπραξής
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
});

PaymentList.displayName = 'PaymentList';