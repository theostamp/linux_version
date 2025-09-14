import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  CreditCard,
  Trash2,
  Info,
  History
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, roundToCents } from '@/lib/utils';
import { PaymentForm } from './PaymentForm';
import PaymentNotificationModal from './PaymentNotificationModal';
import { PaymentHistoryModal, PaymentHistoryItem } from './PaymentHistoryModal';
import { TransactionHistoryModal } from './TransactionHistoryModal';
import { 
  validateFinancialDataMonth, 
  getValidationMessage, 
  formatMonthDisplay,
  type DateValidationResult 
} from '@/lib/dateValidation';
import { ApartmentBalance } from '@/types/financial';

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

interface ApartmentBalanceWithDetails {
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
  expense_breakdown?: ExpenseBreakdown[];
  payment_breakdown?: PaymentHistoryItem[];
}

interface ApartmentBalancesTabProps {
  buildingId: number;
  selectedMonth?: string;
}

export const ApartmentBalancesTab: React.FC<ApartmentBalancesTabProps> = ({
  buildingId,
  selectedMonth
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apartmentBalances, setApartmentBalances] = useState<ApartmentBalanceWithDetails[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [dateValidation, setDateValidation] = useState<DateValidationResult | null>(null);
  const [showPaymentNotificationModal, setShowPaymentNotificationModal] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<ApartmentBalanceWithDetails | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalData, setPaymentModalData] = useState<{
    apartment_id: number;
    common_expense_amount: number;
    previous_obligations_amount: number;
  } | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [apartmentToDelete, setApartmentToDelete] = useState<ApartmentBalanceWithDetails | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedApartmentForHistory, setSelectedApartmentForHistory] = useState<ApartmentBalanceWithDetails | null>(null);
  const [showTransactionHistoryModal, setShowTransactionHistoryModal] = useState(false);
  const [selectedApartmentForTransactionHistory, setSelectedApartmentForTransactionHistory] = useState<ApartmentBalanceWithDetails | null>(null);

  useEffect(() => {
    loadApartmentBalances();
  }, [buildingId, selectedMonth]);

  const loadApartmentBalances = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    setDateValidation(null);

    try {
      console.log('🔍 Loading apartment balances for building:', buildingId);
      
      const params = new URLSearchParams({
        building_id: buildingId.toString(),
        ...(selectedMonth && { month: selectedMonth })
      });
      
      const response = await api.get(`/financial/dashboard/apartment_balances/?${params}`);
      const responseData = response.data;
      
      setApartmentBalances(responseData.apartments || []);
      setSummary(responseData.summary || {});
      
      // Validate if the returned data matches the selected month
      if (selectedMonth) {
        const validation = validateFinancialDataMonth(responseData, selectedMonth);
        setDateValidation(validation);
        
        console.log('🔍 Date validation result:', {
          selectedMonth,
          validation,
          responseDataKeys: Object.keys(responseData)
        });
      }
      
      console.log('✅ Apartment balances loaded:', responseData);
    } catch (err: any) {
      console.error('❌ Error loading apartment balances:', err);
      setError(err.response?.data?.detail || err.message || 'Σφάλμα φόρτωσης δεδομένων');
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  const handleViewDetails = (apartment: ApartmentBalanceWithDetails) => {
    setSelectedApartment(apartment);
    setShowPaymentNotificationModal(true);
  };

  const handlePayment = (apartment: ApartmentBalanceWithDetails) => {
    // Calculate payment amounts to zero out debt
    const totalDebt = Math.max(0, apartment.net_obligation);
    
    // If there's a previous balance debt, allocate it to previous obligations
    const previousDebt = Math.max(0, apartment.previous_balance);
    
    // Current month expense share (cannot be negative)
    const currentMonthShare = Math.max(0, apartment.expense_share);
    
    // Calculate how to split the payment based on debt composition:
    // Priority: Previous balance first, then current month expenses
    let commonExpenseAmount = 0;
    let previousObligationsAmount = 0;
    
    if (previousDebt > 0) {
      // If there are previous obligations, pay them first
      previousObligationsAmount = roundToCents(Math.min(previousDebt, totalDebt));
      const remainingDebt = totalDebt - previousObligationsAmount;
      commonExpenseAmount = roundToCents(Math.max(0, remainingDebt));
    } else {
      // No previous debt, all goes to current expenses
      commonExpenseAmount = roundToCents(totalDebt);
      previousObligationsAmount = 0;
    }
    
    setPaymentModalData({
      apartment_id: apartment.apartment_id,
      common_expense_amount: commonExpenseAmount,
      previous_obligations_amount: previousObligationsAmount,
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setPaymentModalData(null);
    loadApartmentBalances(true);
  };

  const handlePaymentNotificationClose = () => {
    setShowPaymentNotificationModal(false);
    setSelectedApartment(null);
    loadApartmentBalances(true);
  };

  const handleViewHistory = (apartment: ApartmentBalanceWithDetails) => {
    setSelectedApartmentForHistory(apartment);
    setShowHistoryModal(true);
  };

  const handleHistoryModalClose = () => {
    setShowHistoryModal(false);
    setSelectedApartmentForHistory(null);
  };

  const handleViewTransactionHistory = (apartment: ApartmentBalanceWithDetails) => {
    setSelectedApartmentForTransactionHistory(apartment);
    setShowTransactionHistoryModal(true);
  };

  const handleTransactionHistoryModalClose = () => {
    setShowTransactionHistoryModal(false);
    setSelectedApartmentForTransactionHistory(null);
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setPaymentModalData(null);
    loadApartmentBalances(true);
  };

  const handleDeletePayments = (apartment: ApartmentBalanceWithDetails) => {
    setApartmentToDelete(apartment);
    setShowDeleteConfirmation(true);
  };

  const confirmDeletePayments = async () => {
    if (!apartmentToDelete) return;
    
    setIsDeleting(true);
    try {
      const params = new URLSearchParams({ 
        apartment_id: apartmentToDelete.apartment_id.toString(),
        building_id: buildingId.toString()
      });
      
      const response = await api.delete(`/financial/payments/bulk_delete/?${params.toString()}`);
      
      if (response.data.success) {
        await loadApartmentBalances(true);
        setShowDeleteConfirmation(false);
        setApartmentToDelete(null);
        console.log('Payments deleted successfully:', response.data);
      } else {
        throw new Error(response.data.message || 'Σφάλμα κατά τη διαγραφή');
      }
    } catch (error: any) {
      console.error('Error deleting payments:', error);
      setError(error.message || 'Σφάλμα κατά τη διαγραφή των πληρωμών');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeletePayments = () => {
    setShowDeleteConfirmation(false);
    setApartmentToDelete(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'ενήμερο':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'overdue':
      case 'οφειλή':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'κρίσιμο':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'πιστωτικό':
        return <CheckCircle className="w-4 h-4 text-blue-500" />; // Μπλε για πιστωτικό υπόλοιπο
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'ενήμερο':
        return 'default' as const;
      case 'overdue':
      case 'οφειλή':
        return 'destructive' as const;
      case 'pending':
        return 'secondary' as const;
      case 'κρίσιμο':
        return 'destructive' as const;
      case 'πιστωτικό':
        return 'secondary' as const; // Γκρι-μπλε για πιστωτικό υπόλοιπο
      default:
        return 'outline' as const;
    }
  };

  const getDebtApartmentsCount = () => {
    return apartmentBalances.filter(apt => 
      apt.status.toLowerCase() === 'overdue' ||
      apt.status.toLowerCase() === 'οφειλή' ||
      apt.status.toLowerCase() === 'κρίσιμο' ||
      apt.net_obligation > 0
    ).length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Φόρτωση δεδομένων...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
          <Button 
            onClick={() => loadApartmentBalances()} 
            className="mt-2"
            variant="outline"
          >
            Δοκιμή ξανά
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Validation Warning */}
      {dateValidation?.shouldShowWarning && (
        <Alert className={`border-l-4 ${
          dateValidation.severity === 'warning' 
            ? 'border-l-yellow-500 bg-yellow-50' 
            : 'border-l-blue-500 bg-blue-50'
        }`}>
          <Info className={`h-4 w-4 ${
            dateValidation.severity === 'warning' ? 'text-yellow-600' : 'text-blue-600'
          }`} />
          <AlertDescription className="space-y-2">
            <div>
              <strong className={dateValidation.severity === 'warning' ? 'text-yellow-800' : 'text-blue-800'}>
                {getValidationMessage(dateValidation).title}
              </strong>
            </div>
            <div className={dateValidation.severity === 'warning' ? 'text-yellow-700' : 'text-blue-700'}>
              {getValidationMessage(dateValidation).description}
            </div>
            {getValidationMessage(dateValidation).action && (
              <div className={`text-sm font-medium ${
                dateValidation.severity === 'warning' ? 'text-yellow-800' : 'text-blue-800'
              }`}>
                💡 {getValidationMessage(dateValidation).action}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Σύνολο Διαμερισμάτων</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{apartmentBalances.length}</div>
            <p className="text-xs text-muted-foreground">
              διαμερίσματα κτιρίου
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Συνολικές Οφειλές</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(apartmentBalances.reduce((sum, apt) => sum + Math.max(0, apt.net_obligation), 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              συνολικό χρέος κτιρίου
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Σύνολο Εισπράξεων</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(apartmentBalances.reduce((sum, apt) => sum + apt.total_payments, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              συνολικές πληρωμές
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Κατάσταση</CardTitle>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {getDebtApartmentsCount()}/{apartmentBalances.length}
            </div>
            <p className="text-xs text-muted-foreground">
              με οφειλές {getDebtApartmentsCount() > 0 ? `(${getDebtApartmentsCount()} διαμερίσματα)` : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Apartment Balances Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Υπόλοιπα Διαμερισμάτων
              {selectedMonth && (
                <Badge variant="outline" className="ml-2">
                  {formatMonthDisplay(selectedMonth)}
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadApartmentBalances(true)}
              disabled={isLoading || isRefreshing}
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
              title="Ανανέωση δεδομένων (χειροκίνητο)"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Ενημέρωση...' : 'Ενημέρωση'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isRefreshing && (
            <div className="flex items-center justify-center py-2 mb-4 bg-blue-50 rounded-lg">
              <RefreshCw className="w-4 h-4 animate-spin mr-2 text-blue-600" />
              <span className="text-sm text-blue-600">Ενημέρωση δεδομένων...</span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600">Διαμέρισμα</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600">Ιδιοκτήτης</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600">Χιλιοστά</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-gray-600">Προηγούμενο Υπόλοιπο</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-gray-600">Καθαρή Οφειλή</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-600">Κατάσταση</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-600">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {apartmentBalances.map((apartment) => (
                  <tr key={apartment.apartment_id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2 text-sm font-medium">{apartment.apartment_number}</td>
                    <td className="py-2 px-2 text-sm">{apartment.owner_name}</td>
                    <td className="py-2 px-2 text-sm">{apartment.participation_mills}</td>
                    <td className="py-2 px-2 text-sm text-right">
                      <span className={`font-medium ${
                        Math.abs(apartment.net_obligation) <= 0.30 ? 'text-gray-500' :
                        apartment.previous_balance > 0.30 ? 'text-red-600' : 
                        apartment.previous_balance < -0.30 ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {Math.abs(apartment.net_obligation) <= 0.30 ? '-' : formatCurrency(apartment.previous_balance)}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-sm text-right">
                      <span className={`font-medium ${
                        apartment.net_obligation > 0.30 ? 'text-red-600' : 
                        apartment.net_obligation < -0.30 ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {Math.abs(apartment.net_obligation) <= 0.30 ? '-' : formatCurrency(apartment.net_obligation)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {(() => {
                          const netObligation = apartment.net_obligation;
                          if (Math.abs(netObligation) <= 0.30) {
                            return <CheckCircle className="h-4 w-4 text-blue-500" />;
                          } else if (netObligation > 100) {
                            return <AlertTriangle className="h-4 w-4 text-red-500" />;
                          } else if (netObligation > 0.30) {
                            return <TrendingDown className="h-4 w-4 text-orange-500" />;
                          } else {
                            return <TrendingUp className="h-4 w-4 text-green-500" />;
                          }
                        })()}
                        <Badge variant={(() => {
                          const netObligation = apartment.net_obligation;
                          if (Math.abs(netObligation) <= 0.30) {
                            return 'default' as const;
                          } else if (netObligation > 100) {
                            return 'destructive' as const;
                          } else if (netObligation > 0.30) {
                            return 'destructive' as const;
                          } else {
                            return 'secondary' as const;
                          }
                        })()}>
                          {(() => {
                            const netObligation = apartment.net_obligation;
                            if (Math.abs(netObligation) <= 0.30) {
                              return 'Ενήμερο';
                            } else if (netObligation > 100) {
                              return 'Κρίσιμο';
                            } else if (netObligation > 0.30) {
                              return 'Οφειλή';
                            } else {
                              return 'Πιστωτικό';
                            }
                          })()}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(apartment)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Ειδοποιητήριο
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewHistory(apartment)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200"
                          title="Προβολή ιστορικού πληρωμών"
                        >
                          <History className="h-3 w-3" />
                          Ιστορικό
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewTransactionHistory(apartment)}
                          className="flex items-center gap-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 border-purple-200"
                          title="Προβολή ιστορικού κινήσεων (χρεώσεις και πληρωμές)"
                        >
                          <TrendingUp className="h-3 w-3" />
                          Κινήσεις
                        </Button>
                        {apartment.net_obligation > 0 && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handlePayment(apartment)}
                            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700"
                          >
                            <CreditCard className="h-3 w-3" />
                            Πληρωμή
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePayments(apartment)}
                          className="flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200"
                          title="Διαγραφή όλων των πληρωμών αυτού του διαμερίσματος"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Notification Modal */}
      <PaymentNotificationModal
        isOpen={showPaymentNotificationModal}
        onClose={handlePaymentNotificationClose}
        apartment={selectedApartment}
        onPaymentClick={() => {
          if (selectedApartment) {
            handlePayment(selectedApartment);
          }
        }}
      />

      {/* Payment Form Modal */}
      {showPaymentModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handlePaymentCancel}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Εισπράξη Πληρωμής</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handlePaymentCancel}
              >
                ✕
              </Button>
            </div>
            <PaymentForm 
              buildingId={buildingId}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
              apartments={apartmentBalances.map(apt => ({
                id: apt.apartment_id,
                number: apt.apartment_number,
                owner_name: apt.owner_name,
                tenant_name: '',
                occupant_name: apt.owner_name,
                is_rented: false,
                participation_mills: apt.participation_mills
              }))}
              initialData={paymentModalData || {
                apartment_id: 0,
                common_expense_amount: 0,
                previous_obligations_amount: 0,
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && apartmentToDelete && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={cancelDeletePayments}
        >
          <div 
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Διαγραφή Πληρωμών
                </h3>
                <p className="text-sm text-gray-600">
                  Η ενέργεια αυτή δεν μπορεί να αναιρεθεί
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Είστε σίγουροι ότι θέλετε να διαγράψετε όλες τις πληρωμές για το διαμέρισμα <strong>{apartmentToDelete.apartment_number}</strong>;
              </p>
              
              <div className="bg-gray-50 rounded-lg p-3 border">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Διαμέρισμα:</span>
                    <p className="font-medium text-blue-600">
                      {apartmentToDelete.apartment_number}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Ιδιοκτήτης:</span>
                    <p className="font-medium">
                      {apartmentToDelete.owner_name || 'Μη καταχωρημένος'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Καθαρή Οφειλή:</span>
                    <p className={`font-medium ${
                      apartmentToDelete.net_obligation > 0 ? 'text-red-600' : 
                      apartmentToDelete.net_obligation < 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {formatCurrency(apartmentToDelete.net_obligation)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Συνολικές Πληρωμές:</span>
                    <p className="font-medium text-green-600">
                      {formatCurrency(apartmentToDelete.total_payments)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Προσοχή:</strong> Θα διαγραφούν όλες οι πληρωμές που έχουν καταχωρηθεί για αυτό το διαμέρισμα.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={cancelDeletePayments}
                disabled={isDeleting}
              >
                Ακύρωση
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeletePayments}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Διαγραφή...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Διαγραφή Πληρωμών
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      <PaymentHistoryModal
        isOpen={showHistoryModal}
        onClose={handleHistoryModalClose}
        apartment={selectedApartmentForHistory}
      />

      {/* Transaction History Modal */}
      <TransactionHistoryModal
        isOpen={showTransactionHistoryModal}
        onClose={handleTransactionHistoryModalClose}
        apartmentId={selectedApartmentForTransactionHistory?.apartment_id || 0}
        buildingId={buildingId}
        apartmentNumber={selectedApartmentForTransactionHistory?.apartment_number || ''}
        ownerName={selectedApartmentForTransactionHistory?.owner_name || ''}
      />
    </div>
  );
};
