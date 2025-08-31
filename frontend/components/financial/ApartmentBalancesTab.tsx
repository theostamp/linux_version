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
      
      console.log('✅ Apartment balances loaded:', response.data);
    } catch (err: any) {
      console.error('❌ Error loading apartment balances:', err);
      setError(err.response?.data?.detail || err.message || 'Σφάλμα φόρτωσης δεδομένων');
    } finally {
      setIsLoading(false);
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
    loadApartmentBalances(); // Reload data
  };

  const handlePaymentNotificationClose = () => {
    setShowPaymentNotificationModal(false);
    setSelectedApartment(null);
    loadApartmentBalances(); // Reload data after any action
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setPaymentModalData(null);
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
        return 'destructive' as const;
      case 'pending':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
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
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {apartmentBalances.filter(apt => apt.status === 'paid').length}/{apartmentBalances.length}
            </div>
            <p className="text-xs text-muted-foreground">Εξοφλημένα</p>
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
              onClick={loadApartmentBalances}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Ενημέρωση
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
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
    </div>
  );
};
