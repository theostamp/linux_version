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
import { ModalPortal } from '@/components/ui/ModalPortal';

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
      // The api.get returns data directly
      const response = await api.get(`/apartments/${payment.apartment}/`);
      setCurrentApartmentBalance(response.current_balance || 0);
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
      // The api.get returns data directly
      const url = `/financial/apartments/${payment.apartment}/transactions/${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get(url);
      
      // Handle both array and object with results property
      const transactionsData = Array.isArray(response) ? response : (response.results || response.data || []);
      
      // Filter transactions by date if date range is provided
      let filteredTransactions = transactionsData;
      
      if (startDate || endDate) {
        const startDateObj = startDate ? new Date(startDate) : new Date(0); // If no start date, use earliest possible
        const endDateObj = endDate ? new Date(endDate) : new Date(8640000000000000); // If no end date, use latest possible
        
        // Set time to start and end of day for proper comparison
        startDateObj.setHours(0, 0, 0, 0);
        endDateObj.setHours(23, 59, 59, 999);
        
        filteredTransactions = transactionsData.filter((transaction: any) => {
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
      'cash': 'bg-[#E6FFF5] text-[#005f40]',
      'bank_transfer': 'bg-[#d6dce8] text-[#1D293D]',
      'check': 'bg-purple-100 text-purple-800',
      'card': 'bg-orange-100 text-orange-800',
    };
    return colors[method] || 'bg-[#f5f6f9] text-[#3e4a68]';
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
            color: #0B1225;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #1D293D;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            color: #00BC7D;
          }
          .header p {
            margin: 5px 0;
            color: #3e4a68;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          .summary-card {
            border: 1px solid #d6dce8;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
          }
          .summary-card h3 {
            margin: 0 0 10px 0;
            color: #1D293D;
            font-size: 14px;
          }
          .summary-card .value {
            font-size: 18px;
            font-weight: bold;
          }
          .positive { color: #00BC7D; }
          .negative { color: #e11d48; }
          .neutral { color: #1D293D; }
          .transactions {
            margin-top: 30px;
          }
          .transactions h2 {
            border-bottom: 1px solid #d6dce8;
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
            background: #f5f6f9;
          }
          .transaction.payment {
            border-left-color: #00BC7D;
            background: #e6fff5;
          }
          .transaction.charge {
            border-left-color: #e11d48;
            background: #ffe4e6;
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
            color: #3e4a68;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #3e4a68;
            border-top: 1px solid #d6dce8;
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
            ? `<div style="text-align: center; padding: 20px; color: #3e4a68;">
                ${isFiltered 
                  ? `Δεν βρέθηκαν συναλλαγές για την περίοδο ${startDate ? new Date(startDate).toLocaleDateString('el-GR') : ''} ${startDate && endDate ? '-' : ''} ${endDate ? new Date(endDate).toLocaleDateString('el-GR') : ''}`
                  : 'Δεν βρέθηκαν συναλλαγές'
                }
              </div>`
            : transactions.map(transaction => `
            <div class="transaction ${transaction.type}">
              <div class="transaction-info">
                <div><strong>${transaction.description}</strong></div>
                <div style="font-size: 12px; color: #3e4a68;">${formatDate(transaction.date)}</div>
                ${transaction.method ? `<div style="font-size: 12px; color: #3e4a68;">Τρόπος: ${getMethodLabel(transaction.method)}</div>` : ''}
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
    <ModalPortal>
    <div 
      className="fixed inset-0 flex items-center justify-center z-[120] p-4 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/60 backdrop-blur-sm transition-colors"
      onClick={onClose}
    >
      <div 
        className="bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] border border-gray-300 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{
            backgroundColor: 'hsl(var(--muted) / 0.25)',
            borderColor: 'hsl(var(--border))',
          }}
        >
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-[hsl(var(--primary))]" />
            <div>
              <h2 className="text-xl font-semibold">
                Καρτέλα Ενοίκου - {payment.tenant_name || payment.owner_name}
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Διαμέρισμα {payment.apartment_number} • Ιστορικό Συναλλαγών
                {isFiltered && (
                  <>
                    {startDate && endDate && (
                      <span className="ml-2 text-[hsl(var(--primary))]">
                        • Περίοδος: {new Date(startDate).toLocaleDateString('el-GR')} - {new Date(endDate).toLocaleDateString('el-GR')}
                      </span>
                    )}
                    {startDate && !endDate && (
                      <span className="ml-2 text-[hsl(var(--primary))]">
                        • Από: {new Date(startDate).toLocaleDateString('el-GR')}
                      </span>
                    )}
                    {!startDate && endDate && (
                      <span className="ml-2 text-[hsl(var(--primary))]">
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
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[hsl(var(--primary))] mr-2"></div>
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
          <div
            className="px-6 py-4 border-b"
            style={{
              backgroundColor: 'hsl(var(--muted) / 0.2)',
              borderColor: 'hsl(var(--border))',
            }}
          >
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
                  <Home className="h-4 w-4 text-[hsl(var(--primary))]" />
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
                  <Euro className="h-4 w-4 text-[hsl(var(--primary))]" />
                  <span className="text-sm font-medium">Ποσό Εισπράξεως</span>
                </div>
                <p className="text-lg font-semibold text-[hsl(var(--primary))]">
                  {formatCurrency(payment.amount)}
                </p>
                {payment.reserve_fund_amount && payment.reserve_fund_amount > 0 && (
                  <p className="text-xs text-[hsl(var(--primary))]">
                    Αποθεματικό: {formatCurrency(payment.reserve_fund_amount)}
                  </p>
                )}
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-600">
                  {error}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
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
                          ? 'border-l-[hsl(var(--success))] bg-[#E6FFF5]' 
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
        <div
          className="px-6 py-4 border-t flex justify-between"
          style={{
            backgroundColor: 'hsl(var(--muted) / 0.2)',
            borderColor: 'hsl(var(--border))',
          }}
        >
          <Button 
            variant="outline" 
            onClick={handlePrint}
            disabled={isPrinting}
          >
            {isPrinting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[hsl(var(--primary))] mr-2"></div>
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
        <ModalPortal>
        <div 
          className="fixed inset-0 flex items-center justify-center z-[130] p-4 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/60 backdrop-blur-sm transition-colors"
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
              <p className="text-[hsl(var(--card-foreground))] mb-4">
                Είστε σίγουροι ότι θέλετε να διαγράψετε την εισπραξή;
              </p>
              
              {/* Payment Details */}
              <div
                className="rounded-lg p-3 border"
                style={{
                  backgroundColor: 'hsl(var(--muted) / 0.2)',
                  borderColor: 'hsl(var(--border))',
                }}
              >
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[hsl(var(--muted-foreground))]">Διαμέρισμα:</span>
                    <p className="font-medium text-[hsl(var(--primary))]">
                      {payment.apartment_number || `Διαμέρισμα ${payment.apartment}`}
                    </p>
                  </div>
                  <div>
                    <span className="text-[hsl(var(--muted-foreground))]">Ποσό:</span>
                    <p className="font-medium text-[hsl(var(--primary))]">
                      {formatCurrency(typeof payment.amount === 'string' ? parseFloat(payment.amount) : Number(payment.amount))}
                    </p>
                  </div>
                  <div>
                    <span className="text-[hsl(var(--muted-foreground))]">Ημερομηνία:</span>
                    <p className="font-medium">
                      {formatDate(payment.date)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[hsl(var(--muted-foreground))]">Ενοίκος:</span>
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
        </ModalPortal>
      )}
    </div>
    </ModalPortal>
  );
};
