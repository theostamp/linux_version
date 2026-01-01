'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Info,
  Users,
  Receipt,
  Settings,
  ChevronRight,
  AlertCircle,
  DollarSign,
  CreditCard,
  Plus,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { api } from '@/lib/api';

interface ObligationBreakdownProps {
  buildingId: number;
  totalAmount: number;
  children?: React.ReactNode;
  triggerClassName?: string;
}

interface ApartmentDebt {
  apartment_number: string;
  owner_name: string;
  debt_amount: number;
  balance: number;
  debt_start_month?: string;
  debt_message?: string;
  debt_creation_type?: 'actual' | 'estimated';
  urgency_level?: string;
  urgency_color?: string;
  days_in_debt?: number;
  months_in_debt?: number;
}

interface BreakdownData {
  apartment_debts: ApartmentDebt[];
  total_apartment_debts: number;
  total_expenses: number;
  total_management_fees: number;
  total_obligations: number;
  apartments_with_debt: number;
  building_name: string;
  debt_summary?: {
    recent_debts: number;
    moderate_debts: number;
    serious_debts: number;
    critical_debts: number;
    has_transaction_history: boolean;
    estimated_debts: number;
    average_debt_duration_days: number;
  };
}

export function ObligationBreakdownModal({
  buildingId,
  totalAmount,
  children,
  triggerClassName = ""
}: ObligationBreakdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BreakdownData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [apartmentToDelete, setApartmentToDelete] = useState<ApartmentDebt | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBreakdownData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch detailed breakdown from backend
      // The api.get returns data directly
      const response = await api.get(`/financial/obligations/breakdown/?building_id=${buildingId}`);
      setData(response);
    } catch (err) {
      console.error('Error fetching obligation breakdown:', err);
      setError('Σφάλμα κατά τη φόρτωση των στοιχείων');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !data) {
      fetchBreakdownData();
    }
  }, [isOpen]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handlePayNow = (apartmentDebt: ApartmentDebt) => {
    // Navigate to payments page with pre-filled data
    const paymentData = {
      apartment_number: apartmentDebt.apartment_number,
      owner_name: apartmentDebt.owner_name,
      amount: apartmentDebt.debt_amount,
      debt_balance: Math.abs(apartmentDebt.balance),
      previous_debts_amount: apartmentDebt.debt_amount, // Auto-fill previous debts with the debt amount
      building_id: buildingId,
      payment_type: 'debt_settlement',
      description: `Εξόφληση οφειλής διαμερίσματος ${apartmentDebt.apartment_number}`
    };

    // Store payment data in localStorage for the payment form
    localStorage.setItem('prefilled_payment', JSON.stringify(paymentData));

    // Navigate to financial page with payments tab and pre-selected apartment
    const apartmentParam = encodeURIComponent(apartmentDebt.apartment_number);
    router.push(`/financial?tab=payments&building=${buildingId}&action=new_payment&apartment=${apartmentParam}`);
  };

  const handleQuickPayment = async (apartmentDebt: ApartmentDebt) => {
    // Quick payment action - could open a mini modal or trigger immediate payment flow
    try {
      // For now, we'll use the same navigation but with a quick payment flag
      const paymentData = {
        apartment_number: apartmentDebt.apartment_number,
        owner_name: apartmentDebt.owner_name,
        amount: apartmentDebt.debt_amount,
        debt_balance: Math.abs(apartmentDebt.balance),
        previous_debts_amount: apartmentDebt.debt_amount, // Auto-fill previous debts with the debt amount
        building_id: buildingId,
        payment_type: 'debt_settlement',
        quick_payment: true,
        description: `Άμεση εξόφληση οφειλής διαμερίσματος ${apartmentDebt.apartment_number}`,
        urgency_level: apartmentDebt.urgency_level
      };

      localStorage.setItem('quick_payment', JSON.stringify(paymentData));

      // Close current modal and navigate to financial page with quick payment
      setIsOpen(false);
      const apartmentParam = encodeURIComponent(apartmentDebt.apartment_number);
      router.push(`/financial?tab=payments&building=${buildingId}&action=quick_payment&apartment=${apartmentParam}&auto_open=true`);

    } catch (error) {
      console.error('Error initiating quick payment:', error);
    }
  };

  const handleDeletePayments = (apartmentDebt: ApartmentDebt) => {
    setApartmentToDelete(apartmentDebt);
    setShowDeleteConfirmation(true);
  };

  const confirmDeletePayments = async () => {
    if (!apartmentToDelete) return;

    setIsDeleting(true);
    try {
      // Find apartment ID from the apartment number
      // The api.get returns data directly
      const apartmentResponse = await api.get(`/apartments/?building_id=${buildingId}&number=${apartmentToDelete.apartment_number}`);
      // Handle both paginated and non-paginated responses
      const apartments = Array.isArray(apartmentResponse) ? apartmentResponse : (apartmentResponse.results || apartmentResponse.data || []);
      const apartment = apartments.find((apt: any) => apt.number === apartmentToDelete.apartment_number);

      if (!apartment) {
        throw new Error('Διαμέρισμα δεν βρέθηκε');
      }

      // Delete all payments for this apartment
      const params = new URLSearchParams({
        apartment_id: apartment.id.toString(),
        building_id: buildingId.toString()
      });

      // The api.delete returns data directly
      const response = await api.delete(`/financial/payments/bulk_delete/?${params.toString()}`);

      if (response.success) {
        // Refresh data
        await fetchBreakdownData();
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

  const renderTrigger = () => {
    if (children) {
      return children;
    }

    return (
      <Button
        variant="ghost"
        size="sm"
        className={`text-red-700 hover:text-red-800 hover:bg-red-50 ${triggerClassName}`}
      >
        <Info className="h-4 w-4 mr-1" />
        Ανάλυση
      </Button>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {renderTrigger()}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <DollarSign className="h-5 w-5 text-red-600" />
            Ανάλυση Υποχρεώσεων: {formatCurrency(totalAmount)}
          </DialogTitle>
          <DialogDescription>
            Λεπτομερής ανάλυση των οφειλών και υποχρεώσεων του κτιρίου
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Φόρτωση στοιχείων...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-gray-300 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Σύνοψη */}
            <div className="bg-blue-50 p-4 rounded-lg border border-gray-300">
              <h3 className="font-semibold text-blue-800 mb-2">
                Σύνοψη για {data.building_name}
              </h3>

              {/* Ενημερωτικό μήνυμα για εκτιμήσεις */}
              {data.debt_summary?.estimated_debts && data.debt_summary.estimated_debts > 0 && (
                <div className="mb-3 p-2 bg-orange-50 border border-gray-300 rounded text-xs text-orange-700">
                  <strong>Σημείωση:</strong> {data.debt_summary.estimated_debts} από τις {data.apartments_with_debt} οφειλές δείχνουν εκτιμώμενες ημερομηνίες
                  καθώς δεν υπάρχει διαθέσιμο ιστορικό συναλλαγών. Οι εκτιμήσεις βασίζονται στο μέγεθος της οφειλής.
                </div>
              )}

              {data.debt_summary?.has_transaction_history && (
                <div className="mb-3 p-2 bg-green-50 border border-gray-300 rounded text-xs text-green-700">
                  <strong>✓ Ενημερωμένο κτίριο:</strong> Διαθέσιμο ιστορικό συναλλαγών για ακριβείς ημερομηνίες οφειλών.
                </div>
              )}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-blue-700">
                    {data.apartments_with_debt}
                  </div>
                  <div className="text-blue-600">Διαμερίσματα με οφειλές</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-700">
                    {formatCurrency(data.total_obligations)}
                  </div>
                  <div className="text-blue-600">Συνολικές υποχρεώσεις</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-700">
                    {data.apartments_with_debt > 0 ?
                      formatCurrency(data.total_apartment_debts / data.apartments_with_debt) :
                      '0,00 €'
                    }
                  </div>
                  <div className="text-blue-600">Μέσος όρος οφειλής</div>
                </div>
              </div>
            </div>

            {/* Ανάλυση Συστατικών */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Ανάλυση Συστατικών
              </h3>

              {/* Οφειλές Διαμερισμάτων */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-700">Οφειλές Διαμερισμάτων</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={data.total_apartment_debts > 0 ? "destructive" : "secondary"}>
                      {formatCurrency(data.total_apartment_debts)}
                    </Badge>
                    {data.apartments_with_debt > 0 && (
                      <span className="text-sm text-gray-500">
                        ({data.apartments_with_debt} διαμ.)
                      </span>
                    )}
                  </div>
                </div>

                {data.apartment_debts.length > 0 ? (
                  <div className="space-y-3">
                    {data.apartment_debts.map((apt, index) => (
                      <div key={index} className="p-4 bg-red-50 rounded-lg border border-gray-300">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-red-800">
                                Διαμ. {apt.apartment_number}
                              </span>
                              {apt.urgency_color && <span className="text-lg">{apt.urgency_color}</span>}
                              {apt.urgency_level && (
                                <span className={`text-xs px-2 py-1 rounded ${
                                  apt.urgency_level === 'Πρόσφατη' ? 'bg-green-100 text-green-700' :
                                  apt.urgency_level === 'Μέτρια' ? 'bg-yellow-100 text-yellow-700' :
                                  apt.urgency_level === 'Σοβαρή' ? 'bg-orange-100 text-orange-700' :
                                  apt.urgency_level === 'Κρίσιμη' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {apt.urgency_level}
                                </span>
                              )}
                            </div>
                            {apt.owner_name && (
                              <div className="text-sm text-red-600 mb-1">
                                👤 {apt.owner_name}
                              </div>
                            )}
                            {apt.debt_message && (
                              <div className="flex items-center gap-1 text-xs">
                                <span className={`font-medium ${
                                  apt.debt_creation_type === 'estimated'
                                    ? 'text-orange-600'
                                    : 'text-blue-600'
                                }`}>
                                  📅 {apt.debt_message}
                                </span>
                                {apt.debt_creation_type === 'estimated' && (
                                  <span className="text-orange-500 text-xs">
                                    (εκτίμηση)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="text-right flex flex-col items-end gap-2">
                            <div>
                              <div className="font-semibold text-red-700 text-lg">
                                {formatCurrency(apt.debt_amount)}
                              </div>
                              <div className="text-xs text-red-600">
                                Υπόλοιπο: {formatCurrency(apt.balance)}
                              </div>
                            </div>

                            {/* Payment Action Buttons */}
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePayNow(apt)}
                                className="text-xs px-3 py-1 h-7 bg-white hover:bg-blue-50 border-blue-200 text-blue-700 hover:text-blue-800"
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                Πληρωμή
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleQuickPayment(apt)}
                                className={`text-xs px-3 py-1 h-7 text-white ${
                                  apt.urgency_level === 'Κρίσιμη' ? 'bg-red-600 hover:bg-red-700' :
                                  apt.urgency_level === 'Σοβαρή' ? 'bg-orange-600 hover:bg-orange-700' :
                                  'bg-green-600 hover:bg-green-700'
                                }`}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Άμεσα
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeletePayments(apt)}
                                className="text-xs px-3 py-1 h-7 bg-white hover:bg-red-50 border-red-200 text-red-700 hover:text-red-800"
                                title="Διαγραφή όλων των πληρωμών αυτού του διαμερίσματος"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    ✅ Δεν υπάρχουν οφειλές διαμερισμάτων
                  </div>
                )}
              </div>

              {/* Ανέκδοτες Δαπάνες */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-orange-700">Ανέκδοτες Δαπάνες</span>
                  </div>
                  <Badge variant={data.total_expenses > 0 ? "destructive" : "secondary"}>
                    {formatCurrency(data.total_expenses)}
                  </Badge>
                </div>
                {data.total_expenses === 0 && (
                  <div className="text-sm text-gray-500 mt-2">
                    ✅ Δεν υπάρχουν ανέκδοτες δαπάνες
                  </div>
                )}
              </div>

              {/* Διαχειριστικά Τέλη */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-700">Διαχειριστικά Τέλη</span>
                  </div>
                  <Badge variant={data.total_management_fees > 0 ? "destructive" : "secondary"}>
                    {formatCurrency(data.total_management_fees)}
                  </Badge>
                </div>
                {data.total_management_fees === 0 && (
                  <div className="text-sm text-gray-500 mt-2">
                    ✅ Δεν έχουν οριστεί διαχειριστικά τέλη
                  </div>
                )}
              </div>
            </div>

            {/* Συνολικός Υπολογισμός */}
            <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
              <h3 className="font-semibold text-gray-800 mb-3">Συνολικός Υπολογισμός</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Οφειλές διαμερισμάτων:</span>
                  <span className="font-medium">{formatCurrency(data.total_apartment_debts)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ανέκδοτες δαπάνες:</span>
                  <span className="font-medium">{formatCurrency(data.total_expenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Διαχειριστικά τέλη:</span>
                  <span className="font-medium">{formatCurrency(data.total_management_fees)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Σύνολο:</span>
                  <span className="text-red-700">{formatCurrency(data.total_obligations)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4 border-t">
              {/* Bulk Payment Actions */}
              {data.apartment_debts.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg border border-gray-300">
                  <h4 className="font-medium text-blue-800 mb-2 text-sm">Μαζικές Ενέργειες</h4>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        // Prepare bulk payment data
                        const bulkPaymentData = {
                          building_id: buildingId,
                          apartment_debts: data.apartment_debts,
                          total_amount: data.total_apartment_debts,
                          payment_type: 'bulk_debt_settlement',
                          description: `Μαζική εξόφληση ${data.apartment_debts.length} οφειλών`
                        };

                        localStorage.setItem('bulk_payment', JSON.stringify(bulkPaymentData));
                        setIsOpen(false);
                        router.push(`/financial?tab=payments&building=${buildingId}&action=bulk_payment&auto_open=true`);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs"
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Πληρωμή Όλων ({formatCurrency(data.total_apartment_debts)})
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Filter only critical and serious debts
                        const urgentDebts = data.apartment_debts.filter(apt =>
                          apt.urgency_level === 'Κρίσιμη' || apt.urgency_level === 'Σοβαρή'
                        );

                        if (urgentDebts.length > 0) {
                          const urgentPaymentData = {
                            building_id: buildingId,
                            apartment_debts: urgentDebts,
                            total_amount: urgentDebts.reduce((sum, apt) => sum + apt.debt_amount, 0),
                            payment_type: 'urgent_debt_settlement',
                            description: `Εξόφληση επειγουσών οφειλών (${urgentDebts.length})`
                          };

                          localStorage.setItem('urgent_payment', JSON.stringify(urgentPaymentData));
                          setIsOpen(false);
                          router.push(`/financial?tab=payments&building=${buildingId}&action=urgent_payment&auto_open=true`);
                        }
                      }}
                      className="text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                      disabled={!data.apartment_debts.some(apt =>
                        apt.urgency_level === 'Κρίσιμη' || apt.urgency_level === 'Σοβαρή'
                      )}
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Μόνο Επείγουσες
                    </Button>
                  </div>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Navigate to financial page with payments tab
                    router.push(`/financial?tab=payments&building=${buildingId}&filter=debts`);
                  }}
                  className="flex-1"
                >
                  <ChevronRight className="h-4 w-4 mr-1" />
                  Δες Όλες τις Πληρωμές
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Κλείσιμο
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && apartmentToDelete && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
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
                    <span className="text-gray-600">Οφειλή:</span>
                    <p className="font-medium text-red-600">
                      {new Intl.NumberFormat('el-GR', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 2,
                      }).format(apartmentToDelete.debt_amount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Υπόλοιπο:</span>
                    <p className="font-medium text-red-600">
                      {new Intl.NumberFormat('el-GR', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 2,
                      }).format(apartmentToDelete.balance)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-gray-300 rounded-lg">
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
    </Dialog>
  );
}

export default ObligationBreakdownModal;
