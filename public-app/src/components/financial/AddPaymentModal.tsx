'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, Upload, Euro, Calendar, CreditCard, User, Home } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PaymentFormData, PaymentMethod, PaymentType } from '@/types/financial';
import { api } from '@/lib/api';
import { useApartmentsWithFinancialData, ApartmentWithFinancialData } from '@/hooks/useApartmentsWithFinancialData';
import { useSmartDateDefault } from '@/hooks/useSmartDateDefault';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { ModalPortal } from '@/components/ui/ModalPortal';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentAdded: () => void;
  selectedMonth?: string; // YYYY-MM
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentAdded,
  selectedMonth,
}) => {
  // Use BuildingContext for building data
  const { buildings, selectedBuilding, currentBuilding } = useBuilding();
  const buildingId = selectedBuilding?.id;
  const [formData, setFormData] = useState<PaymentFormData>({
    apartment_id: 0,
    amount: 0,
    reserve_fund_amount: 0,
    date: new Date().toISOString().split('T')[0],
    method: PaymentMethod.CASH,
    payment_type: PaymentType.COMMON_EXPENSE,
    payer_type: 'owner',
    reference_number: '',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  interface ApartmentShare {
    total_amount?: number;
    total_due?: number;
    [key: string]: unknown;
  }

  interface CalculateAdvancedResponse {
    shares?: Record<string, ApartmentShare>;
    [key: string]: unknown;
  }

  // Advanced calculation cache per modal open (maps apartmentId -> monthly total for selected month)
  const [monthlyShares, setMonthlyShares] = useState<Record<number, number> | null>(null);
  const [monthlySharesData, setMonthlySharesData] = useState<CalculateAdvancedResponse | null>(null); // Full calculation data
  const [isCalculatingShares, setIsCalculatingShares] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [amountTouched, setAmountTouched] = useState(false);

  // Use the new hook for consistent apartment data
  const {
    apartments,
    isLoading,
    error: apartmentError,
    loadApartments,
    forceRefresh
  } = useApartmentsWithFinancialData(isOpen ? buildingId : undefined, selectedMonth);

  // Deduplicate apartments by (number + tenant_name + owner_name) to avoid double entries for same unit
  const dedupedApartments = React.useMemo(() => {
    const seen = new Set<string>();
    const result: typeof apartments = [];
    apartments.forEach((apt) => {
      const key = `${apt.number}__${apt.owner_name || ''}__${apt.tenant_name || ''}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(apt);
      }
    });
    return result;
  }, [apartments]);

  // Building name for header
  const buildingName = React.useMemo(() => {
    const fromList = buildings.find(b => b.id === buildingId)?.name;
    return fromList || selectedBuilding?.name || currentBuilding?.name || '';
  }, [buildings, selectedBuilding, currentBuilding, buildingId]);

  // Compute month date range strings (YYYY-MM-DD) from selectedMonth
  const monthRange = React.useMemo(() => {
    if (!selectedMonth) return null;
    try {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 0)); // last day of month
      const toISO = (d: Date) => d.toISOString().slice(0, 10);
      return { start: toISO(start), end: toISO(end) };
    } catch {
      return null;
    }
  }, [selectedMonth]);

  // Fetch advanced calculation shares once per open/month change
  useEffect(() => {
    const fetchShares = async () => {
      if (!isOpen || !buildingId || !monthRange) {
        setMonthlyShares(null);
        setCalcError(null);
        return;
      }
      setIsCalculatingShares(true);
      setCalcError(null);
      try {
        interface CalculateAdvancedPayload {
          building_id: number;
          period_start_date: string;
          period_end_date: string;
        }
        const payload: CalculateAdvancedPayload = {
          building_id: buildingId,
          period_start_date: monthRange.start,
          period_end_date: monthRange.end,
        };
        // The api.post returns data directly
        const response = await api.post('/financial/common-expenses/calculate_advanced/', payload);
        const shares = response?.shares || {};
        const map: Record<number, number> = {};
        // shares is expected as record keyed by apartment_id with total_amount and total_due
        Object.entries(shares).forEach(([aptId, share]) => {
          const shareData = share as ApartmentShare;
          // Use total_due for monthly obligation instead of total_amount
          const monthlyDue = parseFloat(String(shareData?.total_due ?? 0));
          if (!isNaN(monthlyDue)) {
            map[Number(aptId)] = monthlyDue;
          }
        });
        setMonthlyShares(map);
        setMonthlySharesData(response); // Store full calculation data
      } catch (err) {
        console.error('Error fetching monthly shares:', err);
        const error = err as { response?: { data?: { error?: string } } };
        setCalcError(error?.response?.data?.error || 'Αποτυχία υπολογισμού κοινοχρήστων μήνα');
        setMonthlyShares(null);
      } finally {
        setIsCalculatingShares(false);
      }
    };
    fetchShares();
    // Reset amountTouched on month change/open
    setAmountTouched(false);
  }, [isOpen, buildingId, monthRange?.start, monthRange?.end]);

  // Update error state when apartment loading fails
  useEffect(() => {
    if (apartmentError) {
      setError(apartmentError);
    }
  }, [apartmentError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.apartment_id || Number(formData.amount || 0) <= 0) {
      setError('Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Calculate total amount (common expenses only, reserve fund is included in amount)
      const totalAmount = Math.round(Number(formData.amount || 0) * 100) / 100;

      const submitData: PaymentFormData = {
        ...formData,
        amount: totalAmount,
        receipt: receiptFile || undefined,
      };

      // Use the usePayments hook's createPayment method
      const { usePayments } = await import('@/hooks/usePayments');

      // Create FormData for file upload if needed
      interface PaymentRequestData {
        apartment: number;
        amount: number;
        reserve_fund_amount: number;
        date: string;
        method: string;
        payment_type: string;
        payer_type: string;
        payer_name: string;
        reference_number?: string;
        notes?: string;
      }
      let requestData: FormData | PaymentRequestData;

      if (receiptFile) {
        const formDataPayload = new FormData();
        formDataPayload.append('apartment', formData.apartment_id.toString());
        formDataPayload.append('amount', totalAmount.toString());
        formDataPayload.append('reserve_fund_amount', '0'); // Reserve fund is now included in amount
        formDataPayload.append('date', formData.date);
        formDataPayload.append('method', formData.method);
        formDataPayload.append('payment_type', formData.payment_type);
        formDataPayload.append('payer_type', formData.payer_type);
        formDataPayload.append('payer_name', formData.payer_name || '');

        if (formData.reference_number) {
          formDataPayload.append('reference_number', formData.reference_number);
        }
        if (formData.notes) {
          formDataPayload.append('notes', formData.notes);
        }

        formDataPayload.append('receipt', receiptFile);
        requestData = formDataPayload;
      } else {
        requestData = {
          apartment: formData.apartment_id,
          amount: totalAmount,
          reserve_fund_amount: 0, // Reserve fund is now included in amount
          date: formData.date,
          method: formData.method,
          payment_type: formData.payment_type,
          payer_type: formData.payer_type,
          payer_name: formData.payer_name || '',
          reference_number: formData.reference_number,
          notes: formData.notes
        };
      }

      // Make API call directly
      await api.post('/financial/payments/', requestData, {
        headers: receiptFile ? {} : { 'Content-Type': 'application/json' }
      });

      // Success - notify parent and close modal
      onPaymentAdded();
      handleClose();
    } catch (err) {
      console.error('Error creating payment:', err);
      const error = err as { response?: { data?: { error?: string } } };
      setError(error?.response?.data?.error || 'Σφάλμα κατά τη δημιουργία της εισπραξής');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use smart date default hook
  const { smartDefaultDate, monthContext, isHistoricalEntry } = useSmartDateDefault(selectedMonth);

  const handleClose = () => {
    // Reset form
    setFormData({
      apartment_id: 0,
      amount: 0,
      reserve_fund_amount: 0,
      date: smartDefaultDate,
      method: PaymentMethod.CASH,
      payment_type: PaymentType.COMMON_EXPENSE,
      payer_type: 'owner',
      reference_number: '',
      notes: '',
    });
    setReceiptFile(null);
    setError(null);
    setMonthlyShares(null);
    setMonthlySharesData(null);
    setCalcError(null);
    setAmountTouched(false);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: 5MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Μη υποστηριζόμενος τύπος αρχείου. Επιτρέπονται: JPEG, PNG, GIF, PDF');
        return;
      }

      setReceiptFile(file);
      setError(null);
    }
  };

  const selectedApartment = apartments.find(apt => apt.id === formData.apartment_id);

  // When selecting apartment, prefill amount with this month's common expense if available
  useEffect(() => {
    if (!selectedApartment) return;
    if (amountTouched) return; // don't override if user typed
    // Priority: monthlyShares for the selected month (which now contains total_due); fallback to apartment.monthly_due
    const monthAmount = monthlyShares?.[selectedApartment.id];
    const fallbackAmountRaw = selectedApartment.monthly_due ?? 0;
    const fallbackAmount = typeof fallbackAmountRaw === 'string' ? parseFloat(fallbackAmountRaw) : Number(fallbackAmountRaw || 0);
    const prefill = typeof monthAmount === 'number' ? monthAmount : fallbackAmount;
    // Round to 2 decimal places to avoid excessive decimals and ensure positive amounts
    const roundedPrefill = Math.round(Math.max(0, isNaN(prefill) ? 0 : prefill) * 100) / 100;
    setFormData(prev => ({ ...prev, amount: roundedPrefill }));
  }, [selectedApartment?.id, monthlyShares, amountTouched]);

  // Auto-update date when selectedMonth changes
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        date: smartDefaultDate
      }));
    }
  }, [selectedMonth, isOpen, smartDefaultDate]);

  // Auto-fill reserve fund amount based on participation mills when apartment is selected
  useEffect(() => {
    if (!selectedApartment || !selectedApartment.participation_mills) return;

    // Get building data for reserve fund calculation
    const building = buildings.find(b => b.id === buildingId) || selectedBuilding || currentBuilding;

    // Calculate monthly reserve fund target based on goal and duration
    let monthlyReserveTarget = 0;
    if (building?.reserve_fund_goal && building?.reserve_fund_duration_months) {
      monthlyReserveTarget = Number(building.reserve_fund_goal) / Number(building.reserve_fund_duration_months);
    } else {
      // Fallback to reserve_contribution_per_apartment if available
      monthlyReserveTarget = building?.reserve_contribution_per_apartment ?? 5;
    }

    // Calculate reserve fund amount based on participation mills
    const participationMills = selectedApartment.participation_mills;
    const reserveFundAmount = (participationMills / 1000) * monthlyReserveTarget;

    // Debug logging
    console.log('🔍 Reserve Fund Calculation Debug:', {
      apartmentId: selectedApartment.id,
      apartmentNumber: selectedApartment.number,
      participationMills,
      buildingId,
      buildingName: building?.name,
      reserve_fund_goal: building?.reserve_fund_goal || 0,
      reserve_fund_duration_months: building?.reserve_fund_duration_months || 12,
      reserve_fund_monthly_target: (building?.reserve_fund_goal && building?.reserve_fund_duration_months)
        ? (building.reserve_fund_goal / building.reserve_fund_duration_months).toFixed(2)
        : 0,
      calculatedAmount: reserveFundAmount,
      finalAmount: Number(reserveFundAmount.toFixed(2))
    });

    // Reserve fund is now included in the amount field, no need to auto-fill separate field
  }, [selectedApartment?.id, selectedApartment?.participation_mills, buildings, selectedBuilding, currentBuilding, buildingId]);

  if (!isOpen) return null;

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 flex items-center justify-center z-[120] p-4 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/60 backdrop-blur-sm transition-colors"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <Euro className="h-6 w-6" />
            <div>
              <h2 className="text-lg font-semibold">
                Νέα Εισπραξη{buildingName ? ` • ${buildingName}` : ''}{selectedMonth ? ` – ${new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}` : ''}
              </h2>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} className="text-white hover:bg-success/90">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="mb-4 p-2 bg-red-50 border border-gray-300 rounded-md">
              <p className="text-red-600 text-xs">{error}</p>
            </div>
          )}
          {calcError && (
            <div className="mb-4 p-2 bg-orange-50 border border-gray-300 rounded-md">
              <p className="text-orange-700 text-xs">{calcError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Apartment Selection */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="apartment" className="flex items-center gap-2 text-sm">
                  <Home className="h-4 w-4" />
                  Διαμέρισμα *
                </Label>
                <Select
                  value={formData.apartment_id.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, apartment_id: parseInt(value) }))}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoading ? "Φόρτωση..." : "Επιλέξτε διαμέρισμα"} />
                  </SelectTrigger>
                  <SelectContent>
                    {dedupedApartments.map((apartment) => (
                      <SelectItem key={apartment.id} value={apartment.id.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium mr-3 min-w-[3rem]">{apartment.number}</span>
                          <div className="text-sm text-gray-600 ml-2 flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-block px-1 rounded bg-success/10 text-success border border-success/20 text-xs">Ιδιοκτήτης</span>
                              <span className="truncate max-w-[200px]">
                                {apartment.owner_name || '—'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-block px-1 rounded bg-primary/10 text-primary border border-primary/20 text-xs">Ενοικιαστής</span>
                              <span className="truncate max-w-[200px]">
                                {apartment.tenant_name || '—'}
                              </span>
                            </div>
                            {(apartment.current_balance !== undefined && apartment.current_balance !== 0) && (
                              <span className={`text-xs ${apartment.current_balance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                Υπόλοιπο: {formatCurrency(apartment.current_balance || 0)}
                              </span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Apartment Info */}
                {selectedApartment && (
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Ενοίκος:</span>
                        <p className="font-medium">
                          {selectedApartment.tenant_name ? (
                            <span className="text-primary">
                              {selectedApartment.tenant_name} <span className="text-xs text-primary/70">(Ενοικιαστής)</span>
                            </span>
                          ) : selectedApartment.owner_name ? (
                            <span className="text-success">
                              {selectedApartment.owner_name} <span className="text-xs text-success/70">(Ιδιοκτήτης)</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Μη καταχωρημένος</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Τρέχον Υπόλοιπο:</span>
                        <p className={`font-medium ${
                          Number(selectedApartment.current_balance || 0) < 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatCurrency(typeof selectedApartment.current_balance === 'string' ? parseFloat(selectedApartment.current_balance) : Number(selectedApartment.current_balance || 0))}
                          <span className="text-xs ml-1">
                            {Number(selectedApartment.current_balance || 0) < 0 ? '(χρεωστικό)' :
                             Number(selectedApartment.current_balance || 0) > 0 ? '(πιστωτικό)' : '(εξοφλημένο)'}
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Μηνιαία Οφειλή:</span>
                        <p className="font-medium text-orange-600">
                          {selectedApartment.monthly_due !== undefined ?
                            formatCurrency(typeof selectedApartment.monthly_due === 'string' ? parseFloat(selectedApartment.monthly_due) : Number(selectedApartment.monthly_due || 0)) : 'Μη διαθέσιμο'
                          }
                        </p>
                      </div>
                    </div>
                    {selectedApartment.last_payment_date && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <span className="text-muted-foreground text-xs">Τελευταία πληρωμή:</span>
                        <span className="ml-2 text-xs text-foreground">
                          {formatCurrency(
                            typeof selectedApartment.latest_payment_amount === 'string'
                              ? parseFloat(selectedApartment.latest_payment_amount)
                              : Number(selectedApartment.latest_payment_amount || 0)
                          )} στις {new Date(selectedApartment.last_payment_date).toLocaleDateString('el-GR')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount" className="flex items-center gap-2 text-sm">
                  <Euro className="h-4 w-4" />
                  Ποσό Κοινόχρηστων *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max="999999.99"
                  value={formData.amount || ''}
                  onChange={(e) => {
                    setAmountTouched(true);
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      // Allow user to type freely, only round when submitting
                      setFormData(prev => ({ ...prev, amount: value }));
                    } else {
                      setFormData(prev => ({ ...prev, amount: 0 }));
                    }
                  }}
                  onBlur={(e) => {
                    // Round to 2 decimal places when user finishes editing
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      const roundedValue = Math.round(value * 100) / 100;
                      setFormData(prev => ({ ...prev, amount: roundedValue }));
                    }
                  }}
                  placeholder="0,00"
                  required
                />
                {isCalculatingShares && selectedMonth && (
                  <p className="text-xs text-muted-foreground mt-1">Υπολογισμός προτεινόμενου ποσού κοινοχρήστων για τον επιλεγμένο μήνα...</p>
                )}
                {!amountTouched && selectedApartment && (monthlyShares?.[selectedApartment.id] || selectedApartment.monthly_due) ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    Προτεινόμενο ποσό: {formatCurrency(Math.max(0, (monthlyShares?.[selectedApartment.id] ?? selectedApartment.monthly_due) || 0))}
                    <br />
                    <span className="text-xs text-primary">
                      (Μηνιαία οφειλή κοινοχρήστων με βάση χιλιοστά)
                    </span>
                  </p>
                ) : null}
                {(() => {
                  const building = buildings.find(b => b.id === buildingId) || selectedBuilding || currentBuilding;
                  const reserveAmount = building?.reserve_contribution_per_apartment || 0;

                  // Check if reserve fund is actually included in the current amount
                  // Use the actual calculation data from the backend
                  const currentAmount = formData.amount || 0;

                  // Get the actual reserve fund contribution for this apartment from the calculation
                  const apartmentShare = selectedApartment?.id ? monthlySharesData?.shares?.[selectedApartment.id] : null;
                  const actualReserveContribution = apartmentShare?.breakdown?.reserve_fund_contribution || 0;
                  const hasReserveFund = actualReserveContribution > 0;

                  return reserveAmount > 0 && hasReserveFund ? (
                    <p className="text-xs text-blue-600 mt-1">
                      💡 Το ποσό περιλαμβάνει και αποθεματικό {formatCurrency(actualReserveContribution)}
                    </p>
                  ) : reserveAmount > 0 && !hasReserveFund ? (
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ Αποθεματικό δεν συλλέγεται λόγω εκκρεμοτήτων
                    </p>
                  ) : null;
                })()}
              </div>


            </div>

            {/* Total Amount Display */}
            <div className="space-y-2">
              <Label>Συνολικό Ποσό Εισπράξεως</Label>
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="text-lg font-semibold text-primary">
                  {formatCurrency(formData.amount || 0)}
                </div>
                <div className="text-sm text-primary/80">
                  Κοινόχρηστα: {formatCurrency(formData.amount || 0)}
                  {(() => {
                    const building = buildings.find(b => b.id === buildingId) || selectedBuilding || currentBuilding;
                    const reserveAmount = building?.reserve_contribution_per_apartment || 0;

                    // Check if reserve fund is actually included in the current amount
                    // Use the actual calculation data from the backend
                    const currentAmount = formData.amount || 0;

                    // Get the actual reserve fund contribution for this apartment from the calculation
                    const apartmentShare = selectedApartment?.id ? monthlySharesData?.shares?.[selectedApartment.id] : null;
                    const actualReserveContribution = apartmentShare?.breakdown?.reserve_fund_contribution || 0;
                    const hasReserveFund = actualReserveContribution > 0;

                    return reserveAmount > 0 && hasReserveFund ? ` (συμπεριλαμβανομένου αποθεματικού ${formatCurrency(actualReserveContribution)})` : '';
                  })()}
                </div>
              </div>
            </div>

            {/* Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date" className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  Ημερομηνία *
                  {monthContext && (
                    <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                      📅 {monthContext.label}
                    </span>
                  )}
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
                {monthContext && !monthContext.type.includes('current') && (
                  <p className="text-xs text-gray-600 mt-1">
                    💡 {monthContext.description} ({
                      selectedMonth ? new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' }) : ''
                    })
                  </p>
                )}
                {isHistoricalEntry && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-orange-50 border border-gray-300 rounded">
                    <span className="text-orange-600 text-xs">⚠️</span>
                    <span className="text-xs text-orange-700">
                      Καταχωρείτε ιστορικά δεδομένα. Βεβαιωθείτε ότι η ημερομηνία είναι σωστή.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method & Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="method" className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4" />
                  Τρόπος Πληρωμής *
                </Label>
                <Select
                  value={formData.method}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, method: value as PaymentMethod }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Μετρητά</SelectItem>
                    <SelectItem value="bank_transfer">Τραπεζική Μεταφορά</SelectItem>
                    <SelectItem value="check">Επιταγή</SelectItem>
                    <SelectItem value="card">Κάρτα</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="payment_type" className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  Τύπος Πληρωμής *
                </Label>
                <Select
                  value={formData.payment_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, payment_type: value as PaymentType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="common_expense">Κοινόχρηστα</SelectItem>
                    <SelectItem value="reserve_fund">Αποθεματικό</SelectItem>
                    <SelectItem value="special_expense">Ειδική Δαπάνη</SelectItem>
                    <SelectItem value="advance">Προκαταβολή</SelectItem>
                    <SelectItem value="other">Άλλο</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reference Number and Notes on same row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reference_number">Αριθμός Αναφοράς</Label>
                <Input
                  id="reference_number"
                  type="text"
                  value={formData.reference_number || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                  placeholder="π.χ. αριθμός επιταγής, transaction ID"
                />
              </div>

              <div>
                <Label htmlFor="notes">Σημειώσεις</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Προαιρετικές σημειώσεις για την πληρωμή"
                  rows={2}
                />
              </div>
            </div>

            {/* Receipt Upload */}
            <div>
              <Label htmlFor="receipt" className="flex items-center gap-2 text-sm">
                <Upload className="h-4 w-4" />
                Απόδειξη / Παραστατικό
              </Label>
              <Input
                id="receipt"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="mt-1"
              />
              {receiptFile && (
                <p className="mt-1 text-sm text-success">
                  Επιλεγμένο αρχείο: {receiptFile.name}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Επιτρέπονται αρχεία JPEG, PNG, GIF, PDF μέχρι 5MB
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-muted px-6 py-4 border-t flex justify-between">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Ακύρωση
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.apartment_id || Number(formData.amount || 0) <= 0}
            className="bg-success hover:bg-success/90"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Αποθήκευση...
              </>
            ) : (
              <>
                <Euro className="h-4 w-4 mr-2" />
                Δημιουργία Εισπραξής
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
