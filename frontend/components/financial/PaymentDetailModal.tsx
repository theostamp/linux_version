'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Payment } from '@/types/financial';
import { formatCurrency, formatDate } from '@/lib/utils';
import { X, User, Home, Calendar, TrendingUp, TrendingDown, Printer, Filter, Trash2, Euro } from 'lucide-react';

interface Transaction {
  id: number;
  type: 'payment' | 'charge';
  amount: number;
  date: string;
  description: string;
  method?: string;
  balance_after: number;
}

interface PaymentDetailModalProps {
  payment: Payment | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentDeleted?: () => void;
}

export const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({
  payment,
  isOpen,
  onClose,
  onPaymentDeleted,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showDateRange, setShowDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredBalance, setFilteredBalance] = useState<number | null>(null);
  const [isFiltered, setIsFiltered] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);
  const [currentApartmentBalance, setCurrentApartmentBalance] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && payment) {
      loadTransactionHistory();
      loadCurrentApartmentBalance();
    }
  }, [isOpen, payment, startDate, endDate]);

  const loadCurrentApartmentBalance = async () => {
    if (!payment) return;
    
    try {
      // Import api για authenticated request
      const { api } = await import('@/lib/api');
      
      // API call για το τρέχον υπόλοιπο του διαμερίσματος
      const response = await api.get(`/apartments/${payment.apartment}/`);
      setCurrentApartmentBalance(response.data.current_balance || 0);
    } catch (err: any) {
      console.error('Error loading apartment balance:', err);
      // Fallback to payment balance
      setCurrentApartmentBalance(payment.current_balance || 0);
    }
  };

  const loadTransactionHistory = async () => {
    if (!payment) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Import api για authenticated request
      const { api } = await import('@/lib/api');
      
      // Build query parameters for date range
      const params = new URLSearchParams();
      if (startDate) {
        params.append('start_date', startDate);
      }
      if (endDate) {
        params.append('end_date', endDate);
      }
      
      // Check if filtering is active
      const isFilteringActive = !!(startDate || endDate);
      setIsFiltered(isFilteringActive);
      
      // API call για το ιστορικό συναλλαγών
      const url = `/financial/apartments/${payment.apartment}/transactions/${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get(url);
      
      // Filter transactions by date if date range is provided
      let filteredTransactions = response.data;
      
      if (startDate || endDate) {
        const startDateObj = startDate ? new Date(startDate) : new Date(0); // If no start date, use earliest possible
        const endDateObj = endDate ? new Date(endDate) : new Date(8640000000000000); // If no end date, use latest possible
        
        // Set time to start and end of day for proper comparison
        startDateObj.setHours(0, 0, 0, 0);
        endDateObj.setHours(23, 59, 59, 999);
        
        filteredTransactions = response.data.filter(transaction => {
          const transactionDate = new Date(transaction.date);
          return transactionDate >= startDateObj && transactionDate <= endDateObj;
        });
      }
      
      // Set transactions
      setTransactions(filteredTransactions);
      
      // Calculate filtered balance if transactions exist
      if (filteredTransactions.length > 0) {
        const lastTransaction = filteredTransactions[filteredTransactions.length - 1];
        setFilteredBalance(lastTransaction.balance_after);
      } else if (isFilteringActive) {
        // If filtering is active but no transactions found, set filtered balance to 0
        // This represents the balance change within the filtered period
        setFilteredBalance(0);
      } else {
        // If no filtering and no transactions, use payment balance
        setFilteredBalance(null);
      }
    } catch (err: any) {
      console.error('Error loading transaction history:', err);
      setError('Σφάλμα κατά τη φόρτωση του ιστορικού συναλλαγών');
      setTransactions([]);
      setFilteredBalance(null);
    } finally {
      setIsLoading(false);
    }
  };

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

  const clearDateRange = () => {
    setStartDate('');
    setEndDate('');
    setIsFiltered(false);
    setFilteredBalance(null);
  };

  const setCurrentMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  };

  // Handle payment deletion
  const handleDeletePayment = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDeletePayment = async () => {
    if (!payment) return;
    
    setIsDeletingPayment(true);
    try {
      // Import api για authenticated request
      const { api } = await import('@/lib/api');
      
      // API call για διαγραφή πληρωμής
      await api.delete(`/financial/payments/${payment.id}/`);
      
      // Success - notify parent and close modal
      if (onPaymentDeleted) {
        onPaymentDeleted();
      }
      
      // Close modal
      setShowDeleteConfirmation(false);
      onClose();
    } catch (err: any) {
      console.error('Error deleting payment:', err);
      setError('Σφάλμα κατά τη διαγραφή της εισπραξής');
    } finally {
      setIsDeletingPayment(false);
    }
  };

  const cancelDeletePayment = () => {
    setShowDeleteConfirmation(false);
  };

  if (!isOpen || !payment) return null;

  // Υπολογισμός τελευταίου υπολοίπου - χρησιμοποιούμε το σωστό current_balance του διαμερίσματος
  const lastBalance = filteredBalance !== null 
    ? filteredBalance 
    : (currentApartmentBalance !== null ? currentApartmentBalance : (payment.current_balance || 0));

  const handlePrint = () => {
    setIsPrinting(true);
    
    try {
      const printContent = generatePrintableContent();
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Περιμένουμε να φορτωθεί το περιεχόμενο πριν εκτυπώσουμε
        printWindow.onload = () => {
          printWindow.focus();
          
          // Μικρή καθυστέρηση για να φορτωθούν τα styles
          setTimeout(() => {
            printWindow.print();
            
            // Κλείνουμε το παράθυρο μετά την εκτύπωση (ή ακύρωση)
            printWindow.onafterprint = () => {
              setIsPrinting(false);
              printWindow.close();
            };
            
            // Fallback: κλείσιμο μετά από 10 δευτερόλεπτα
            setTimeout(() => {
              if (!printWindow.closed) {
                setIsPrinting(false);
                printWindow.close();
              }
            }, 10000);
          }, 100);
        };
      } else {
        setIsPrinting(false);
        alert('Δεν μπόρεσε να ανοίξει το παράθυρο εκτύπωσης. Παρακαλώ επιτρέψτε τα pop-ups για αυτή τη σελίδα.');
      }
    } catch (error) {
      setIsPrinting(false);
      console.error('Σφάλμα κατά την εκτύπωση:', error);
      alert('Παρουσιάστηκε σφάλμα κατά την εκτύπωση. Παρακαλώ δοκιμάστε ξανά.');
    }
  };

  const generatePrintableContent = () => {
    const currentDate = new Date().toLocaleDateString('el-GR');
    
    // Format date range for display
    const dateRangeText = startDate && endDate 
      ? ` • Περίοδος: ${new Date(startDate).toLocaleDateString('el-GR')} - ${new Date(endDate).toLocaleDateString('el-GR')}`
      : startDate 
        ? ` • Από: ${new Date(startDate).toLocaleDateString('el-GR')}`
        : endDate 
          ? ` • Έως: ${new Date(endDate).toLocaleDateString('el-GR')}`
          : '';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Καρτέλα Ενοίκου - ${payment?.tenant_name || payment?.owner_name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            color: #2563eb;
          }
          .header p {
            margin: 5px 0;
            color: #666;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          .summary-card {
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
          }
          .summary-card h3 {
            margin: 0 0 10px 0;
            color: #374151;
            font-size: 14px;
          }
          .summary-card .value {
            font-size: 18px;
            font-weight: bold;
          }
          .positive { color: #16a34a; }
          .negative { color: #dc2626; }
          .neutral { color: #374151; }
          .transactions {
            margin-top: 30px;
          }
          .transactions h2 {
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .transaction {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            border-left: 4px solid;
            margin-bottom: 10px;
            background: #f9fafb;
          }
          .transaction.payment {
            border-left-color: #16a34a;
            background: #f0fdf4;
          }
          .transaction.charge {
            border-left-color: #dc2626;
            background: #fef2f2;
          }
          .transaction-info {
            flex: 1;
          }
          .transaction-amount {
            text-align: right;
            font-weight: bold;
          }
          .transaction-balance {
            font-size: 12px;
            color: #666;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          @media print {
            body { 
              margin: 0; 
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .summary { 
              page-break-inside: avoid; 
              margin-bottom: 20px;
            }
            .transaction { 
              page-break-inside: avoid; 
              margin-bottom: 8px;
            }
            .header {
              page-break-after: avoid;
            }
            .transactions {
              page-break-before: avoid;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Καρτέλα Ενοίκου</h1>
          <p><strong>${payment?.tenant_name || payment?.owner_name}</strong></p>
          <p>Διαμέρισμα ${payment?.apartment_number} • Ημερομηνία Εκτύπωσης: ${currentDate}${dateRangeText}</p>
        </div>

        <div class="summary">
          <div class="summary-card">
            <h3>Διαμέρισμα</h3>
            <div class="value neutral">${payment?.apartment_number}</div>
          </div>
          <div class="summary-card">
            <h3>Μηνιαία Οφειλή</h3>
            <div class="value neutral">${payment?.monthly_due ? formatCurrency(payment.monthly_due) : '-'}</div>
          </div>
          <div class="summary-card">
            <h3>${isFiltered ? 'Υπόλοιπο Περιόδου' : 'Τρέχον Υπόλοιπο'}</h3>
            <div class="value ${lastBalance < 0 ? 'negative' : 'positive'}">${formatCurrency(lastBalance)}</div>
            <div class="text-xs font-medium ${lastBalance < 0 ? 'negative' : 'positive'}">${lastBalance < 0 ? 'Χρεωστικό' : 'Πιστωτικό'}</div>
          </div>
        </div>

        <div class="transactions">
          <h2>${isFiltered ? 'Φιλτραρισμένο Ιστορικό Συναλλαγών' : 'Ιστορικό Συναλλαγών'}</h2>
          ${transactions.length === 0 
            ? `<div style="text-align: center; padding: 20px; color: #666;">
                ${isFiltered 
                  ? `Δεν βρέθηκαν συναλλαγές για την περίοδο ${startDate ? new Date(startDate).toLocaleDateString('el-GR') : ''} ${startDate && endDate ? '-' : ''} ${endDate ? new Date(endDate).toLocaleDateString('el-GR') : ''}`
                  : 'Δεν βρέθηκαν συναλλαγές'
                }
              </div>`
            : transactions.map(transaction => `
            <div class="transaction ${transaction.type}">
              <div class="transaction-info">
                <div><strong>${transaction.description}</strong></div>
                <div style="font-size: 12px; color: #666;">${formatDate(transaction.date)}</div>
                ${transaction.method ? `<div style="font-size: 12px; color: #666;">Τρόπος: ${getMethodLabel(transaction.method)}</div>` : ''}
              </div>
              <div class="transaction-amount">
                <div class="${transaction.type === 'payment' ? 'positive' : 'negative'}">
                  ${transaction.type === 'payment' ? '+' : ''}${formatCurrency(Math.abs(transaction.amount))}
                </div>
                <div class="transaction-balance">
                  Υπόλοιπο: ${formatCurrency(transaction.balance_after)}
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="footer">
          <p>Αυτό το έγγραφο δημιουργήθηκε αυτόματα από το σύστημα διαχείρισης κτιρίου στις ${currentDate}</p>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">
                Καρτέλα Ενοίκου - {payment.tenant_name || payment.owner_name}
              </h2>
              <p className="text-sm text-gray-600">
                Διαμέρισμα {payment.apartment_number} • Ιστορικό Συναλλαγών
                {isFiltered && (
                  <>
                    {startDate && endDate && (
                      <span className="ml-2 text-blue-600">
                        • Περίοδος: {new Date(startDate).toLocaleDateString('el-GR')} - {new Date(endDate).toLocaleDateString('el-GR')}
                      </span>
                    )}
                    {startDate && !endDate && (
                      <span className="ml-2 text-blue-600">
                        • Από: {new Date(startDate).toLocaleDateString('el-GR')}
                      </span>
                    )}
                    {!startDate && endDate && (
                      <span className="ml-2 text-blue-600">
                        • Έως: {new Date(endDate).toLocaleDateString('el-GR')}
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowDateRange(!showDateRange)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Χρονικό Εύρος
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrint}
              disabled={isPrinting}
            >
              {isPrinting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Εκτύπωση...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4 mr-2" />
                  Εκτύπωση
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDeletePayment}
              className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Διαγραφή
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Date Range Controls */}
        {showDateRange && (
          <div className="bg-gray-50 px-6 py-4 border-b">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="startDate" className="text-sm font-medium">Από:</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="endDate" className="text-sm font-medium">Έως:</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={setCurrentMonth}
              >
                Τρέχων Μήνας
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearDateRange}
                disabled={!startDate && !endDate}
              >
                Καθαρισμός
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className={`p-6 overflow-y-auto ${showDateRange ? 'max-h-[calc(90vh-180px)]' : 'max-h-[calc(90vh-120px)]'}`}>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Διαμέρισμα</span>
                </div>
                <p className="text-lg font-semibold">{payment.apartment_number}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Μηνιαία Οφειλή</span>
                </div>
                <p className="text-lg font-semibold text-orange-600">
                  {payment.monthly_due ? formatCurrency(payment.monthly_due) : '-'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Τρέχουσα μηνιαία υποχρέωση
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Ποσό Εισπράξεως</span>
                </div>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(payment.amount)}
                </p>
                {payment.reserve_fund_amount && payment.reserve_fund_amount > 0 && (
                  <p className="text-xs text-blue-600">
                    Αποθεματικό: {formatCurrency(payment.reserve_fund_amount)}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Συνολικό ποσό που εισπράχθηκε
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  {lastBalance < 0 ? (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  )}
                  <span className="text-sm font-medium">
                    {isFiltered ? 'Υπόλοιπο Περιόδου' : 'Τρέχον Υπόλοιπο'}
                  </span>
                </div>
                <p className={`text-lg font-semibold ${
                  lastBalance < 0 
                    ? 'text-red-600' 
                    : 'text-green-600'
                }`}>
                  {formatCurrency(lastBalance)}
                </p>
                <p className={`text-xs font-medium ${
                  lastBalance < 0 
                    ? 'text-red-600' 
                    : 'text-green-600'
                }`}>
                  {lastBalance < 0 ? 'Χρεωστικό' : 'Πιστωτικό'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isFiltered ? 'Φιλτραρισμένο Ιστορικό Συναλλαγών' : 'Ιστορικό Συναλλαγών'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-600">
                  {error}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {isFiltered 
                    ? `Δεν βρέθηκαν συναλλαγές για την περίοδο ${startDate ? new Date(startDate).toLocaleDateString('el-GR') : ''} ${startDate && endDate ? '-' : ''} ${endDate ? new Date(endDate).toLocaleDateString('el-GR') : ''}`
                    : 'Δεν βρέθηκαν συναλλαγές'
                  }
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction, index) => (
                    <div
                      key={`${transaction.id}-${index}`}
                      className={`p-4 rounded-lg border-l-4 ${
                        transaction.type === 'payment' 
                          ? 'border-l-green-500 bg-green-50' 
                          : 'border-l-red-500 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {transaction.description}
                            </span>
                            {transaction.method && (
                              <Badge className={getMethodColor(transaction.method)} variant="secondary">
                                {getMethodLabel(transaction.method)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatDate(transaction.date)}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className={`text-lg font-semibold ${
                            transaction.type === 'payment' 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {transaction.type === 'payment' ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                          </p>
                          <p className="text-sm text-gray-600">
                            Υπόλοιπο: <span className={`font-medium ${
                              transaction.balance_after < 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {formatCurrency(transaction.balance_after)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between">
          <Button 
            variant="outline" 
            onClick={handlePrint}
            disabled={isPrinting}
          >
            {isPrinting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Εκτύπωση...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" />
                Εκτύπωση Καρτέλας
              </>
            )}
          </Button>
          <Button onClick={onClose}>
            Κλείσιμο
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={cancelDeletePayment}
        >
          <div 
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
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
                      {payment.apartment_number || `Διαμέρισμα ${payment.apartment}`}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Ποσό:</span>
                    <p className="font-medium text-green-600">
                      {formatCurrency(typeof payment.amount === 'string' ? parseFloat(payment.amount) : Number(payment.amount))}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Ημερομηνία:</span>
                    <p className="font-medium">
                      {formatDate(payment.date)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Ενοίκος:</span>
                    <p className="font-medium">
                      {payment.tenant_name || payment.owner_name || 'Μη καταχωρημένος'}
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
    </div>
  );
};
