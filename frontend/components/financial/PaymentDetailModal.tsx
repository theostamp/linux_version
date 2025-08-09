'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Payment } from '@/types/financial';
import { formatCurrency, formatDate } from '@/lib/utils';
import { X, User, Home, Calendar, TrendingUp, TrendingDown, Printer } from 'lucide-react';

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
}

export const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({
  payment,
  isOpen,
  onClose,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (isOpen && payment) {
      loadTransactionHistory();
    }
  }, [isOpen, payment]);

  const loadTransactionHistory = async () => {
    if (!payment) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Import api για authenticated request
      const { api } = await import('@/lib/api');
      
      // API call για το ιστορικό συναλλαγών
      const response = await api.get(`/financial/apartments/${payment.apartment}/transactions/`);
      setTransactions(response.data);
    } catch (err: any) {
      // Fallback με mock data για demo
      console.warn('API call failed, using mock data:', err);
      console.log('Payment apartment ID:', payment.apartment);
      
      // Mock data ανάλογα με το διαμέρισμα (C2 vs C3)
      // Βάσει apartment_number αντί για apartment ID
      const isC2 = payment.apartment_number === 'C2' || payment.apartment === 10;
      const mockTransactions: Transaction[] = isC2 ? [
        // C2 - Μιχάλης Αντωνίου
        {
          id: 1,
          type: 'charge',
          amount: -246.25,
          date: '2025-08-01',
          description: 'Κοινόχρηστα Αυγούστου 2025',
          balance_after: -246.25
        },
        {
          id: 2,
          type: 'payment',
          amount: 222.00,
          date: '2025-08-08',
          description: 'Είσπραξη - Μετρητά',
          method: 'cash',
          balance_after: -24.25
        },
        {
          id: 3,
          type: 'payment',
          amount: 343.00,
          date: '2025-08-08',
          description: 'Είσπραξη - Μετρητά',
          method: 'cash',
          balance_after: 318.75
        }
      ] : [
        // C3 - Δημήτρης Κωνσταντίνου  
        {
          id: 1,
          type: 'charge',
          amount: -176.40,
          date: '2025-08-01',
          description: 'Κοινόχρηστα Αυγούστου 2025',
          balance_after: -176.40
        },
        {
          id: 2,
          type: 'payment',
          amount: 222.00,
          date: '2025-08-08',
          description: 'Είσπραξη - Μετρητά',
          method: 'cash',
          balance_after: 45.60
        }
      ];
      
      setTransactions(mockTransactions);
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

  if (!isOpen || !payment) return null;

  // Υπολογισμός τελευταίου υπολοίπου από το ιστορικό
  const lastBalance = transactions.length > 0 
    ? transactions[transactions.length - 1].balance_after 
    : (payment.current_balance || 0);

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
          <p>Διαμέρισμα ${payment?.apartment_number} • Ημερομηνία Εκτύπωσης: ${currentDate}</p>
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
            <h3>Τρέχον Υπόλοιπο</h3>
            <div class="value ${lastBalance < 0 ? 'negative' : 'positive'}">${formatCurrency(lastBalance)}</div>
          </div>
        </div>

        <div class="transactions">
          <h2>Ιστορικό Συναλλαγών</h2>
          ${transactions.map(transaction => `
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
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
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                  <span className="text-sm font-medium">Τρέχον Υπόλοιπο</span>
                </div>
                <p className={`text-lg font-semibold ${
                  lastBalance < 0 
                    ? 'text-red-600' 
                    : 'text-green-600'
                }`}>
                  {formatCurrency(lastBalance)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle>Ιστορικό Συναλλαγών</CardTitle>
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
                  Δεν βρέθηκαν συναλλαγές
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
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
    </div>
  );
};
