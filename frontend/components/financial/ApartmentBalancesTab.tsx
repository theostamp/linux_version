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
  CreditCard,
  Trash2
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { PaymentForm } from './PaymentForm';
import PaymentNotificationModal from './PaymentNotificationModal';


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
}

export const ApartmentBalancesTab: React.FC<ApartmentBalancesTabProps> = ({
  buildingId,
  selectedMonth
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apartmentBalances, setApartmentBalances] = useState<ApartmentBalance[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [showPaymentNotificationModal, setShowPaymentNotificationModal] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<ApartmentBalance | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalData, setPaymentModalData] = useState<{
    apartment_id: number;
    common_expense_amount: number;
    previous_obligations_amount: number;
  } | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [apartmentToDelete, setApartmentToDelete] = useState<ApartmentBalance | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadApartmentBalances();
  }, [buildingId, selectedMonth]);

  // Αφαιρέθηκε το auto-refresh όταν κλείνουν τα modals - μόνο χειροκίνητο refresh

  // Αφαιρέθηκε το auto-refresh hook - μόνο χειροκίνητο refresh

  const loadApartmentBalances = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
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
      
      console.log('✅ Apartment balances loaded:', response.data);
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

  const handleViewDetails = (apartment: ApartmentBalance) => {
    setSelectedApartment(apartment);
    setShowPaymentNotificationModal(true);
  };

  const handlePayment = (apartment: ApartmentBalance) => {
    setPaymentModalData({
      apartment_id: apartment.apartment_id,
      common_expense_amount: apartment.expense_share,
      previous_obligations_amount: apartment.previous_balance,
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setPaymentModalData(null);
    // Auto refresh data after successful payment
    loadApartmentBalances(true);
  };

  const handlePaymentNotificationClose = () => {
    setShowPaymentNotificationModal(false);
    setSelectedApartment(null);
    // Auto refresh data when notification modal closes
    loadApartmentBalances(true);
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setPaymentModalData(null);
    // Auto refresh data when payment modal is cancelled
    loadApartmentBalances(true);
  };

  const handleDeletePayments = (apartment: ApartmentBalance) => {
    setApartmentToDelete(apartment);
    setShowDeleteConfirmation(true);
  };

  const confirmDeletePayments = async () => {
    if (!apartmentToDelete) return;
    
    setIsDeleting(true);
    try {
      // Delete all payments for this apartment
      const params = new URLSearchParams({ 
        apartment_id: apartmentToDelete.apartment_id.toString(),
        building_id: buildingId.toString()
      });
      
      const response = await api.delete(`/financial/payments/bulk_delete/?${params.toString()}`);
      
      if (response.data.success) {
        // Auto refresh data after successful deletion
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

  const handlePrintStatement = (apartment: ApartmentBalance) => {
    // This will be handled by the PaymentNotificationModal
    console.log('Print statement for apartment:', apartment.apartment_number);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'overdue':
      case 'καθυστέρηση':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'default' as const;
      case 'overdue':
      case 'καθυστέρηση':
        return 'destructive' as const;
      case 'pending':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  // Δυναμική μέτρηση διαμερισμάτων με καθυστέρηση
  const getOverdueApartmentsCount = () => {
    return apartmentBalances.filter(apt => 
      apt.status.toLowerCase() === 'καθυστέρηση' || 
      apt.status.toLowerCase() === 'overdue' ||
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
            onClick={loadApartmentBalances} 
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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Σύνολο Διαμερισμάτων</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apartmentBalances.length}</div>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Συνολικές Πληρωμές</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(apartmentBalances.reduce((sum, apt) => sum + apt.total_payments, 0))}
            </div>
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
              {getOverdueApartmentsCount()}/{apartmentBalances.length}
            </div>
            <p className="text-xs text-muted-foreground">
              με οφειλή {getOverdueApartmentsCount() > 0 ? `(${getOverdueApartmentsCount()} καθυστέρηση)` : ''}
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
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Διαμέρισμα</th>
                  <th className="text-left py-3 px-2">Ιδιοκτήτης</th>
                  <th className="text-left py-3 px-2">Χιλιοστά</th>
                  <th className="text-right py-3 px-2">Καθαρή Οφειλή</th>
                  <th className="text-center py-3 px-2">Κατάσταση</th>
                  <th className="text-center py-3 px-2">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {apartmentBalances.map((apartment) => (
                  <tr key={apartment.apartment_id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">{apartment.apartment_number}</td>
                    <td className="py-3 px-2">{apartment.owner_name}</td>
                    <td className="py-3 px-2">{apartment.participation_mills}</td>
                    <td className="py-3 px-2 text-right">
                      <span className={`font-medium ${
                        apartment.net_obligation > 0 ? 'text-red-600' : 
                        apartment.net_obligation < 0 ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {formatCurrency(apartment.net_obligation)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {getStatusIcon(apartment.status)}
                        <Badge variant={getStatusBadgeVariant(apartment.status)}>
                          {apartment.status}
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
              <h2 className="text-xl font-semibold">Νέα Εισπράξη</h2>
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
            {/* Header */}
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

            {/* Content */}
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Είστε σίγουροι ότι θέλετε να διαγράψετε όλες τις πληρωμές για το διαμέρισμα <strong>{apartmentToDelete.apartment_number}</strong>;
              </p>
              
              {/* Apartment Details */}
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

            {/* Actions */}
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
    </div>
  );
};
