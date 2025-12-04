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
import { ensureArray } from '@/lib/arrayHelpers';
import { formatCurrency, roundToCents } from '@/lib/utils';
import { PaymentForm } from './PaymentForm';
import PaymentNotificationModal from './PaymentNotificationModal';
import { PaymentHistoryModal, PaymentHistoryItem } from './PaymentHistoryModal';
import { TransactionHistoryModal } from './TransactionHistoryModal';
import { ModalPortal } from '@/components/ui/ModalPortal';
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
  reserve_fund_share: number;  // ← ΝΕΟ FIELD - Αποθεματικό
  expense_share: number;
  // ΝΕΑ FIELDS: Διαχωρισμός δαπανών τρέχοντος μήνα
  resident_expenses: number;  // Δαπάνες Ενοίκου (τρέχων μήνας)
  owner_expenses: number;     // Δαπάνες Ιδιοκτήτη (τρέχων μήνας)
  // 🔧 ΝΕΑ FIELDS 2025-11-24: Διαχωρισμός προηγούμενων οφειλών
  previous_resident_expenses?: number;  // Δαπάνες Ενοίκου (προηγούμενοι)
  previous_owner_expenses?: number;     // Δαπάνες Ιδιοκτήτη (προηγούμενοι)
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
    reserve_fund_amount: number;
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

      // Fetch both apartment balances and financial summary
      const [balancesRaw, summaryRaw] = await Promise.all([
        api.get(`/financial/dashboard/apartment_balances/?${params}`),
        api.get(`/financial/dashboard/summary/?${params}`)
      ]);

      const responseData = balancesRaw ?? {};
      const financialSummary = summaryRaw ?? {};

      const apartments = ensureArray<ApartmentBalanceWithDetails>(
        (responseData as { apartments?: unknown }).apartments ?? responseData
      );

      setApartmentBalances(
        apartments.map((apartment) => ({
          ...apartment,
          participation_mills: Number((apartment as { participation_mills?: number }).participation_mills ?? 0),
          current_balance: Number((apartment as { current_balance?: number }).current_balance ?? 0),
          previous_balance: Number((apartment as { previous_balance?: number }).previous_balance ?? 0),
          reserve_fund_share: Number((apartment as { reserve_fund_share?: number }).reserve_fund_share ?? 0),
          expense_share: Number((apartment as { expense_share?: number }).expense_share ?? 0),
          resident_expenses: Number((apartment as { resident_expenses?: number }).resident_expenses ?? 0),
          owner_expenses: Number((apartment as { owner_expenses?: number }).owner_expenses ?? 0),
          total_obligations: Number((apartment as { total_obligations?: number }).total_obligations ?? 0),
          total_payments: Number((apartment as { total_payments?: number }).total_payments ?? 0),
          net_obligation: Number((apartment as { net_obligation?: number }).net_obligation ?? 0),
        }))
      );

      // Merge the summary data from both endpoints
      const mergedSummary = {
        ...((responseData as { summary?: Record<string, unknown> }).summary ?? {}),
        ...(typeof financialSummary === 'object' ? financialSummary as Record<string, unknown> : {}),
      };

      setSummary({
        ...mergedSummary,
        management_fee_per_apartment: Number(
          (financialSummary as { management_fee_per_apartment?: number })?.management_fee_per_apartment ??
            (responseData as { management_fee_per_apartment?: number })?.management_fee_per_apartment ??
            0
        ),
      });

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
      console.log('✅ Management fee per apartment:', 
        Number(
          (financialSummary as { management_fee_per_apartment?: number })?.management_fee_per_apartment ??
            (responseData as { management_fee_per_apartment?: number })?.management_fee_per_apartment ??
            0
        )
      );
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
    // 🔧 FIX 2025-11-20: Το reserve_fund_share ήδη περιλαμβάνεται στο expense_share - ΔΕΝ προσθέτουμε ξανά
    const currentExpenseWithManagement = apartment.expense_share;
    const totalObligationWithManagement = apartment.previous_balance + currentExpenseWithManagement;
    const netObligationCalculated = totalObligationWithManagement - apartment.total_payments;
    
    // Calculate payment amounts to zero out debt
    const totalDebt = Math.max(0, netObligationCalculated);
    
    // If there's a previous balance debt, allocate it to previous obligations
    const previousDebt = Math.max(0, apartment.previous_balance);
    
    // Current month expense share (cannot be negative)
    const currentMonthShare = Math.max(0, apartment.expense_share);
    
    // Reserve fund share (cannot be negative)
    const reserveFundShare = Math.max(0, apartment.reserve_fund_share || 0);
    
    // Calculate how to split the payment based on debt composition:
    // Priority: Previous balance first, then reserve fund, then current month expenses
    let commonExpenseAmount = 0;
    let previousObligationsAmount = 0;
    let reserveFundAmount = 0;
    
    if (previousDebt > 0) {
      // If there are previous obligations, pay them first
      previousObligationsAmount = roundToCents(Math.min(previousDebt, totalDebt));
      const remainingDebt = totalDebt - previousObligationsAmount;
      
      // Then pay reserve fund if available
      if (reserveFundShare > 0 && remainingDebt > 0) {
        reserveFundAmount = roundToCents(Math.min(reserveFundShare, remainingDebt));
        const finalRemainingDebt = remainingDebt - reserveFundAmount;
        commonExpenseAmount = roundToCents(Math.max(0, finalRemainingDebt));
      } else {
        commonExpenseAmount = roundToCents(Math.max(0, remainingDebt));
      }
    } else {
      // No previous debt, check for reserve fund first
      if (reserveFundShare > 0) {
        reserveFundAmount = roundToCents(Math.min(reserveFundShare, totalDebt));
        const remainingDebt = totalDebt - reserveFundAmount;
        commonExpenseAmount = roundToCents(Math.max(0, remainingDebt));
      } else {
        commonExpenseAmount = roundToCents(totalDebt);
      }
      previousObligationsAmount = 0;
    }
    
    setPaymentModalData({
      apartment_id: apartment.apartment_id,
      common_expense_amount: commonExpenseAmount,
      previous_obligations_amount: previousObligationsAmount,
      reserve_fund_amount: reserveFundAmount,
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
      
      // The api.delete returns data directly
      const response = await api.delete(`/financial/payments/bulk_delete/?${params.toString()}`) as { success?: boolean; message?: string };
      
      if (response.success) {
        await loadApartmentBalances(true);
        setShowDeleteConfirmation(false);
        setApartmentToDelete(null);
        console.log('Payments deleted successfully:', response);
      } else {
        throw new Error(response.message || 'Σφάλμα κατά τη διαγραφή');
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
    return apartmentBalances.filter(apt => {
      // 🔧 FIX 2025-11-20: Το reserve_fund_share ήδη περιλαμβάνεται στο expense_share - ΔΕΝ προσθέτουμε ξανά
      const currentExpenseWithManagement = apt.expense_share;
      const totalObligationWithManagement = apt.previous_balance + currentExpenseWithManagement;
      const netObligationCalculated = totalObligationWithManagement - apt.total_payments;
      
      return apt.status.toLowerCase() === 'overdue' ||
        apt.status.toLowerCase() === 'οφειλή' ||
        apt.status.toLowerCase() === 'κρίσιμο' ||
        netObligationCalculated > 0;
    }).length;
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

      {/* Apartment Balances Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Κατάσταση Διαμερισμάτων
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
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-700">Α/Δ</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-700">Ιδιοκτήτης</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-700">Χιλιοστά</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-gray-700">
                    <div className="flex items-center justify-end gap-1">
                      Δαπάνες Ενοίκου
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-1 py-0">Ε</Badge>
                    </div>
                  </th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-gray-700">
                    <div className="flex items-center justify-end gap-1">
                      Δαπάνες Ιδιοκτήτη
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs px-1 py-0">Δ</Badge>
                    </div>
                  </th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-gray-700">Συνολική Οφειλή</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-700">Κατάσταση</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-700">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {apartmentBalances.map((apartment) => {
                  // Το expense_share από το backend ήδη περιλαμβάνει τις δαπάνες διαχείρισης
                  // Δεν χρειάζεται να προσθέσουμε ξανά το management_fee_per_apartment
                  const currentExpenseWithManagement = apartment.expense_share;
                  
                  // 🔧 FIX 2025-11-20: Το reserve_fund_share ΗΔΗ ΠΕΡΙΛΑΜΒΑΝΕΤΑΙ στο expense_share (backend services.py:1225)
                  // ΔΕΝ πρέπει να το προσθέτουμε ξεχωριστά γιατί προκαλεί διπλή χρέωση!
                  // Σωστή συνολική οφειλή = previous_balance + current_expenses (που ήδη έχουν το reserve fund)
                  const totalObligationWithManagement = apartment.previous_balance + currentExpenseWithManagement;
                  
                  // Αφαιρούμε τις πληρωμές για να βρούμε την καθαρή οφειλή
                  const netObligationCalculated = totalObligationWithManagement - apartment.total_payments;

                  return (
                  <tr key={apartment.apartment_id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2 text-xs font-medium">{apartment.apartment_number}</td>
                    <td className="py-2 px-2 text-xs">{apartment.owner_name}</td>
                    <td className="py-2 px-2 text-xs">{apartment.participation_mills}</td>
                    {/* Δαπάνες Ενοίκου */}
                    <td className="py-2 px-2 text-xs text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className={`font-medium ${
                          Math.abs(netObligationCalculated) <= 0.30 ? 'text-gray-500' :
                          Math.abs(apartment.resident_expenses || 0) <= 0.30 ? 'text-gray-500' :
                          (apartment.resident_expenses || 0) > 0.30 ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {Math.abs(netObligationCalculated) <= 0.30 || Math.abs(apartment.resident_expenses || 0) <= 0.30 ? '-' : formatCurrency(apartment.resident_expenses || 0)}
                        </span>
                        {(apartment.resident_expenses || 0) > 0.30 && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-1 py-0">
                            Ε
                          </Badge>
                        )}
                      </div>
                    </td>
                    {/* Δαπάνες Ιδιοκτήτη */}
                    <td className="py-2 px-2 text-xs text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className={`font-medium ${
                          Math.abs(netObligationCalculated) <= 0.30 ? 'text-gray-500' :
                          Math.abs(apartment.owner_expenses || 0) <= 0.30 ? 'text-gray-500' :
                          (apartment.owner_expenses || 0) > 0.30 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {Math.abs(netObligationCalculated) <= 0.30 || Math.abs(apartment.owner_expenses || 0) <= 0.30 ? '-' : formatCurrency(apartment.owner_expenses || 0)}
                        </span>
                        {(apartment.owner_expenses || 0) > 0.30 && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs px-1 py-0">
                            Δ
                          </Badge>
                        )}
                      </div>
                    </td>
                    {/* 🔧 FIX: Χρήση υπολογισμένης συνολικής οφειλής αντί για net_obligation από backend */}
                    <td className="py-2 px-2 text-xs text-right">
                      <span className={`font-medium ${
                        Math.abs(netObligationCalculated) <= 0.30 ? 'text-gray-500' :
                        netObligationCalculated > 0.30 ? 'text-red-600' :
                        netObligationCalculated < -0.30 ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {Math.abs(netObligationCalculated) <= 0.30 ? '-' : formatCurrency(netObligationCalculated)}
                      </span>
                    </td>
                    {/* 🔧 FIX: Χρήση υπολογισμένης οφειλής για την κατάσταση */}
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {(() => {
                          const netObligation = netObligationCalculated;
                          if (Math.abs(netObligation) <= 0.30) {
                            return <CheckCircle className="h-3 w-3 text-blue-500" />;
                          } else if (netObligation > 100) {
                            return <AlertTriangle className="h-3 w-3 text-red-500" />;
                          } else if (netObligation > 0.30) {
                            return <TrendingDown className="h-3 w-3 text-orange-500" />;
                          } else {
                            return <TrendingUp className="h-3 w-3 text-green-500" />;
                          }
                        })()}
                        <Badge variant={(() => {
                          const netObligation = netObligationCalculated;
                          if (Math.abs(netObligation) <= 0.30) {
                            return 'default' as const;
                          } else if (netObligation > 100) {
                            return 'destructive' as const;
                          } else if (netObligation > 0.30) {
                            return 'destructive' as const;
                          } else {
                            return 'secondary' as const;
                          }
                        })()} className="text-xs">
                          {(() => {
                            const netObligation = netObligationCalculated;
                            if (Math.abs(netObligation) <= 0.30) {
                              return 'Ενήμερο';
                            } else if (netObligation > 100) {
                              return 'Οφειλή';
                            } else if (netObligation > 0.30) {
                              return 'Οφειλή';
                            } else {
                              return 'Πιστωτικό';
                            }
                          })()}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(apartment)}
                          className="flex items-center gap-1 text-xs"
                          title="Ενημέρωση διαμερίσματος"
                        >
                          <Eye className="h-3 w-3" />
                          Ενημέρωση
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewHistory(apartment)}
                          className="flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200 text-xs w-10 h-8"
                          title="Προβολή ιστορικού πληρωμών"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewTransactionHistory(apartment)}
                          className="flex items-center justify-center text-purple-600 hover:text-purple-800 hover:bg-purple-50 border-purple-200 text-xs w-10 h-8"
                          title="Προβολή ιστορικού κινήσεων (χρεώσεις και πληρωμές)"
                        >
                          <TrendingUp className="h-4 w-4" />
                        </Button>
                        {/* 🔧 FIX: Χρήση υπολογισμένης οφειλής για το κουμπί πληρωμής */}
                        {netObligationCalculated > 0 && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handlePayment(apartment)}
                            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-xs"
                          >
                            <CreditCard className="h-3 w-3" />
                            Πληρωμή
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePayments(apartment)}
                          className="flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200 text-xs w-10 h-8"
                          title="Διαγραφή όλων των πληρωμών αυτού του διαμερίσματος"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Notification Modal - Only rendered when open */}
      {showPaymentNotificationModal && (
        <PaymentNotificationModal
          isOpen={showPaymentNotificationModal}
          onClose={handlePaymentNotificationClose}
          apartment={selectedApartment as any}
          onPaymentClick={() => {
            if (selectedApartment) {
              handlePayment(selectedApartment);
            }
          }}
        />
      )}

      {/* Payment Form Modal */}
      {showPaymentModal && (
        <ModalPortal>
          <div 
            className="fixed inset-0 flex items-center justify-center z-[120] p-4 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/60 backdrop-blur-sm transition-colors"
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
                  reserve_fund_amount: 0,
                }}
              />
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && apartmentToDelete && (
        <ModalPortal>
          <div 
            className="fixed inset-0 flex items-center justify-center z-[120] p-4 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/60 backdrop-blur-sm transition-colors"
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
        </ModalPortal>
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
