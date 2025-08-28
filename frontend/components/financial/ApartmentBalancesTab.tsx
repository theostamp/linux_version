import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Users, 
  TrendingDown, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Euro,
  Calculator,
  RefreshCw,
  Eye,
  Printer,
  CreditCard
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface ApartmentBalance {
  apartment_id: number;
  apartment_number: string;
  owner_name: string;
  participation_mills: number;
  current_balance: number;
  previous_balance: number;
  expense_share: number;
  total_obligations: number;
  total_payments: number;
  net_obligation: number;
  status: string;
  expense_breakdown: ExpenseBreakdown[];
  payment_breakdown: PaymentBreakdown[];
}

interface ExpenseBreakdown {
  expense_id: number;
  expense_title: string;
  expense_amount: number;
  share_amount: number;
  distribution_type: string;
  date: string;
  month: string;
  month_display: string;
  mills?: number;
  total_mills?: number;
}

interface PaymentBreakdown {
  payment_id: number;
  payment_date: string;
  payment_amount: number;
  payer_name: string;
}

interface ApartmentBalancesTabProps {
  buildingId: number;
  selectedMonth?: string;
  onOpenPaymentModal?: (apartment: ApartmentBalance) => void;
}

export const ApartmentBalancesTab: React.FC<ApartmentBalancesTabProps> = ({
  buildingId,
  selectedMonth,
  onOpenPaymentModal
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apartmentBalances, setApartmentBalances] = useState<ApartmentBalance[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<ApartmentBalance | null>(null);

  useEffect(() => {
    loadApartmentBalances();
  }, [buildingId, selectedMonth]);

  const loadApartmentBalances = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Loading apartment balances for building:', buildingId);
      
      const params = new URLSearchParams({
        building_id: buildingId.toString(),
        ...(selectedMonth && { month: selectedMonth })
      });
      
      const response = await api.get(`/financial/dashboard/apartment_balances/?${params}`);
      setApartmentBalances(response.data.apartments || []);
      setSummary(response.data.summary || {});
      
    } catch (err) {
      console.error('❌ Error loading apartment balances:', err);
      setError('Σφάλμα κατά τη φόρτωση των ισοζυγίων διαμερισμάτων');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Ενήμερο':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'Καθυστέρηση':
        return <Clock className="h-3 w-3 text-yellow-600" />;
      case 'Κρίσιμο':
        return <AlertTriangle className="h-3 w-3 text-red-600" />;
      case 'Πιστωτικό':
        return <TrendingUp className="h-3 w-3 text-blue-600" />;
      default:
        return <CheckCircle className="h-3 w-3 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Ενήμερο':
        return 'default';
      case 'Καθυστέρηση':
        return 'secondary';
      case 'Κρίσιμο':
        return 'destructive';
      case 'Πιστωτικό':
        return 'outline';
      default:
        return 'default';
    }
  };

  const handleShowDetails = (apartment: ApartmentBalance) => {
    setSelectedApartment(apartment);
    setShowDetailsModal(true);
  };

  const handlePrintStatement = (apartment: ApartmentBalance) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Καρτέλα Κινήσεων - Διαμέρισμα ${apartment.apartment_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .apartment-info { margin-bottom: 20px; }
            .balance-summary { margin-bottom: 20px; }
            .expenses-section { margin-bottom: 20px; }
            .payments-section { margin-bottom: 20px; }
            .expense-item { margin: 5px 0; padding: 5px; border-left: 3px solid #007bff; }
            .payment-item { margin: 5px 0; padding: 5px; border-left: 3px solid #28a745; }
            .total { font-weight: bold; margin-top: 10px; padding-top: 10px; border-top: 1px solid #ccc; }
            .negative { color: #dc3545; }
            .positive { color: #28a745; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Καρτέλα Κινήσεων</h1>
            <h2>Διαμέρισμα ${apartment.apartment_number}</h2>
            <p>Ημερομηνία εκτύπωσης: ${new Date().toLocaleDateString('el-GR')}</p>
          </div>
          
          <div class="apartment-info">
            <h3>Στοιχεία Διαμερίσματος</h3>
            <p><strong>Ιδιοκτήτης:</strong> ${apartment.owner_name}</p>
            <p><strong>Χιλιοστά:</strong> ${apartment.participation_mills}</p>
            <p><strong>Κατάσταση:</strong> ${apartment.status}</p>
          </div>
          
          <div class="balance-summary">
            <h3>Οικονομική Σύνοψη</h3>
            <p><strong>Προηγούμενο Υπόλοιπο:</strong> ${formatCurrency(apartment.previous_balance)}</p>
            <p><strong>Μερίδιο Δαπανών:</strong> ${formatCurrency(apartment.expense_share)}</p>
            <p><strong>Καθαρή Οφειλή:</strong> <span class="${apartment.net_obligation > 0 ? 'negative' : 'positive'}">${formatCurrency(apartment.net_obligation)}</span></p>
          </div>
          
          <div class="expenses-section">
            <h3>Breakdown Δαπανών</h3>
            ${apartment.expense_breakdown.map(expense => `
              <div class="expense-item">
                <strong>${expense.expense_title}</strong> - ${expense.month_display}<br>
                Ποσό: ${formatCurrency(expense.share_amount)}
              </div>
            `).join('')}
          </div>
          
          <div class="payments-section">
            <h3>Breakdown Πληρωμών</h3>
            ${apartment.payment_breakdown.length > 0 ? 
              apartment.payment_breakdown.map(payment => `
                <div class="payment-item">
                  <strong>${payment.payer_name}</strong> - ${new Date(payment.payment_date).toLocaleDateString('el-GR')}<br>
                  Ποσό: ${formatCurrency(payment.payment_amount)}
                </div>
              `).join('') : 
              '<p>Δεν υπάρχουν καταγεγραμμένες πληρωμές</p>'
            }
          </div>
          
          <div class="total">
            <h3>Συνοπτικά</h3>
            <p><strong>Συνολικές Υποχρεώσεις:</strong> ${formatCurrency(apartment.total_obligations)}</p>
            <p><strong>Συνολικές Πληρωμές:</strong> ${formatCurrency(apartment.total_payments)}</p>
            <p><strong>Τελική Καθαρή Οφειλή:</strong> <span class="${apartment.net_obligation > 0 ? 'negative' : 'positive'}">${formatCurrency(apartment.net_obligation)}</span></p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handlePayment = (apartment: ApartmentBalance) => {
    // Close the details modal first
    setShowDetailsModal(false);
    setSelectedApartment(null);
    
    // Open payment modal with pre-filled data
    if (onOpenPaymentModal) {
      onOpenPaymentModal(apartment);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-green-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">Ενήμερο</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-green-800 mt-2">
              {summary?.active_count || 0}
            </div>
            <div className="text-xs text-green-600 mt-1">
              διαμερίσματα
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-yellow-100 bg-gradient-to-r from-yellow-50 to-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700">Καθυστέρηση</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-yellow-800 mt-2">
              {summary?.delay_count || 0}
            </div>
            <div className="text-xs text-yellow-600 mt-1">
              διαμερίσματα
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-100 bg-gradient-to-r from-red-50 to-pink-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-700">Κρίσιμο</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-red-800 mt-2">
              {summary?.critical_count || 0}
            </div>
            <div className="text-xs text-red-600 mt-1">
              διαμερίσματα
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Πιστωτικό</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-800 mt-2">
              {summary?.credit_count || 0}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              διαμερίσματα
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Apartment Balances Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Λεπτομερή Αποτελέσματα
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadApartmentBalances}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Ενημέρωση
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-700 w-16">Διαμέρισμα</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700 w-32">Ένοικοι</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700 w-16">Χιλιοστά</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700 w-24">Προηγούμενο Υπόλοιπο</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700 w-24">Μερίδιο Δαπανών</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700 w-24">Συνολικό Οφειλόμενο</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700 w-20">Κατάσταση</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700 w-20">Λεπτομέρειες</th>
                </tr>
              </thead>
              <tbody>
                {apartmentBalances.map((apartment) => (
                  <tr key={apartment.apartment_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2">
                      <div className="font-medium text-gray-900 text-xs">
                        {apartment.apartment_number}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="text-xs text-gray-600">
                        Ιδιοκτήτης
                      </div>
                      <div className="text-xs font-medium text-gray-900 truncate" title={apartment.owner_name}>
                        {apartment.owner_name}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="text-xs font-medium text-gray-900">
                        {apartment.participation_mills}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className={`text-xs font-medium ${
                        apartment.previous_balance > 0 ? 'text-red-600' : 
                        apartment.previous_balance < 0 ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {formatCurrency(apartment.previous_balance)}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="text-xs font-medium text-gray-900">
                        {formatCurrency(apartment.expense_share)}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className={`text-xs font-medium ${
                        apartment.net_obligation > 0 ? 'text-red-600' : 
                        apartment.net_obligation < 0 ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {formatCurrency(apartment.net_obligation)}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(apartment.status)}
                        <Badge variant={getStatusBadgeVariant(apartment.status)} className="text-xs px-1 py-0">
                          {apartment.status}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShowDetails(apartment)}
                        className="h-6 px-2 text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Λεπτομέρειες
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>



      {/* Details Modal */}
      {selectedApartment && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setShowDetailsModal(false);
            setSelectedApartment(null);
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Λεπτομέρειες: Διαμέρισμα {selectedApartment.apartment_number}
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintStatement(selectedApartment)}
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Εκτύπωση
                </Button>
                {selectedApartment.net_obligation > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handlePayment(selectedApartment)}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <CreditCard className="h-4 w-4" />
                    Πληρωμή
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedApartment(null);
                  }}
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Apartment Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Ιδιοκτήτης:</span>
                  <div className="font-medium">{selectedApartment.owner_name}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Χιλιοστά:</span>
                  <div className="font-medium">{selectedApartment.participation_mills}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Κατάσταση:</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedApartment.status)}
                    <Badge variant={getStatusBadgeVariant(selectedApartment.status)}>
                      {selectedApartment.status}
                    </Badge>
                  </div>
                </div>

              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Προηγούμενο Υπόλοιπο:</span>
                  <div className="font-medium">{formatCurrency(selectedApartment.previous_balance)}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Μερίδιο Δαπανών:</span>
                  <div className="font-medium">{formatCurrency(selectedApartment.expense_share)}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Καθαρή Οφειλή:</span>
                  <div className={`font-medium ${
                    selectedApartment.net_obligation > 0 ? 'text-red-600' : 
                    selectedApartment.net_obligation < 0 ? 'text-green-600' : 'text-gray-900'
                  }`}>
                    {formatCurrency(selectedApartment.net_obligation)}
                  </div>
                </div>
              </div>

                             {/* Expense Breakdown */}
               {selectedApartment.expense_breakdown.length > 0 && (
                 <div>
                   <h4 className="font-medium text-gray-900 mb-2">Breakdown Δαπανών:</h4>
                   <div className="space-y-3 max-h-40 overflow-y-auto">
                     {(() => {
                       // Group expenses by month
                       const groupedExpenses = selectedApartment.expense_breakdown.reduce((groups, expense) => {
                         const month = expense.month;
                         if (!groups[month]) {
                           groups[month] = {
                             month: month,
                             month_display: expense.month_display,
                             expenses: []
                           };
                         }
                         groups[month].expenses.push(expense);
                         return groups;
                       }, {} as { [key: string]: { month: string; month_display: string; expenses: any[] } });
                       
                       return Object.values(groupedExpenses).map((group, groupIndex) => (
                         <div key={groupIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                           <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
                             <h5 className="text-sm font-semibold text-gray-700">{group.month_display}</h5>
                           </div>
                           <div className="space-y-1 p-2">
                             {group.expenses.map((expense, index) => (
                               <div key={index} className="flex justify-between text-sm py-1">
                                 <span className="text-gray-600">{expense.expense_title}</span>
                                 <span className="font-medium">{formatCurrency(expense.share_amount)}</span>
                               </div>
                             ))}
                             <div className="border-t border-gray-200 pt-1 mt-1">
                               <div className="flex justify-between text-sm font-semibold">
                                 <span className="text-gray-700">Σύνολο {group.month_display}:</span>
                                 <span className="text-blue-600">
                                   {formatCurrency(group.expenses.reduce((sum, exp) => sum + exp.share_amount, 0))}
                                 </span>
                               </div>
                             </div>
                           </div>
                         </div>
                       ));
                     })()}
                   </div>
                 </div>
               )}

              {/* Payment Breakdown */}
              {selectedApartment.payment_breakdown.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Breakdown Πληρωμών:</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedApartment.payment_breakdown.map((payment, index) => (
                      <div key={index} className="flex justify-between text-sm p-2 bg-green-50 rounded">
                        <span className="text-gray-600">{payment.payer_name} ({payment.payment_date})</span>
                        <span className="font-medium text-green-600">{formatCurrency(payment.payment_amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
