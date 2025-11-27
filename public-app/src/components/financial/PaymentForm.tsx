'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePayments } from '@/hooks/usePayments';
import { Payment, PaymentMethod, PaymentType, PayerType, PaymentFormData } from '@/types/financial';
import { useToast } from '@/hooks/use-toast';
import { ReceiptPrintModal } from './ReceiptPrintModal';
import { formatCurrency, roundToCents } from '@/lib/utils';
import { typography } from '@/lib/typography';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { showErrorFromException } from '@/lib/errorMessages';

const paymentFormSchema = z.object({
  apartment_id: z.number().min(1, 'Παρακαλώ επιλέξτε διαμέρισμα'),
  common_expense_amount: z.union([
    z.number().min(0, 'Το ποσό δεν μπορεί να είναι αρνητικό'),
    z.string().regex(/^\d*\.?\d*$/, 'Παρακαλώ εισάγετε έγκυρο ποσό').transform((val) => val === '' ? 0 : parseFloat(val)),
    z.literal('')
  ]).optional(),
  previous_obligations_amount: z.union([
    z.number().min(0, 'Το ποσό παλαιότερων οφειλών δεν μπορεί να είναι αρνητικό'),
    z.string().regex(/^\d*\.?\d*$/, 'Παρακαλώ εισάγετε έγκυρο ποσό').transform((val) => val === '' ? 0 : parseFloat(val)),
    z.literal('')
  ]).optional(),
  reserve_fund_amount: z.union([
    z.number().min(0, 'Το ποσό αποθεματικού δεν μπορεί να είναι αρνητικό'),
    z.string().regex(/^\d*\.?\d*$/, 'Παρακαλώ εισάγετε έγκυρο ποσό').transform((val) => val === '' ? 0 : parseFloat(val)),
    z.literal('')
  ]).optional(),
  date: z.string().min(1, 'Παρακαλώ επιλέξτε ημερομηνία'),
  method: z.string().min(1, 'Παρακαλώ επιλέξτε μέθοδο εισπράξεως'),
  payment_type: z.string().min(1, 'Παρακαλώ επιλέξτε τύπο εισπράξεως'),
  payer_type: z.string().min(1, 'Παρακαλώ επιλέξτε ένοικο'),
  payer_name: z.string().optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
  receipt: z.any().optional(),
}).refine(
  (data) => {
    // Convert values to numbers, treating empty strings and undefined as 0
    const commonAmount = typeof data.common_expense_amount === 'string' && data.common_expense_amount === '' 
      ? 0 
      : Number(data.common_expense_amount) || 0;
    const previousAmount = typeof data.previous_obligations_amount === 'string' && data.previous_obligations_amount === '' 
      ? 0 
      : Number(data.previous_obligations_amount) || 0;
    const reserveAmount = typeof data.reserve_fund_amount === 'string' && data.reserve_fund_amount === '' 
      ? 0 
      : Number(data.reserve_fund_amount) || 0;
    
    // At least one field must have a value > 0
    return commonAmount > 0 || previousAmount > 0 || reserveAmount > 0;
  },
  {
    message: 'Πρέπει να συμπληρώσετε τουλάχιστον ένα από τα πεδία "Ποσό Κοινόχρηστων", "Παλαιότερες Οφειλές" ή "Αποθεματικό"',
    path: ['common_expense_amount'],
  }
);

type LocalPaymentFormData = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  apartments: Array<{ 
    id: number; 
    number: string; 
    owner_name: string;
    tenant_name: string;
    occupant_name: string;
    is_rented: boolean;
    participation_mills?: number;
  }>;
  onSuccess?: (payment: Payment) => void;
  onCancel?: () => void;
  initialData?: Partial<LocalPaymentFormData>;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  apartments,
  onSuccess,
  onCancel,
  initialData,
}) => {
  // NEW: Use BuildingContext instead of props
  const { selectedBuilding, buildingContext } = useBuilding();
  const buildingId = selectedBuilding?.id;
  
  const { toast } = useToast();
  const { createPayment, isLoading } = usePayments();
  
  // Use building data from context
  const buildingData = buildingContext ? {
    reserve_contribution_per_apartment: buildingContext.reserve_contribution_per_apartment
  } : null;
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<LocalPaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      apartment_id: initialData?.apartment_id || 0,
      common_expense_amount: initialData?.common_expense_amount || undefined,
      previous_obligations_amount: initialData?.previous_obligations_amount || undefined,
      reserve_fund_amount: initialData?.reserve_fund_amount || undefined,
      date: initialData?.date || new Date().toISOString().split('T')[0],
      method: initialData?.method || PaymentMethod.CASH,
      payment_type: initialData?.payment_type || PaymentType.COMMON_EXPENSE,
      payer_type: initialData?.payer_type || PayerType.OWNER,
      payer_name: initialData?.payer_name || '',
      reference_number: initialData?.reference_number || '',
      notes: initialData?.notes || '',
    },
  });

  const selectedApartmentId = watch('apartment_id');
  const selectedPayerType = watch('payer_type');
  const selectedApartment = (apartments ?? []).find(apt => apt.id === selectedApartmentId);
  
  const [createdPayment, setCreatedPayment] = useState<Payment | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSubmitTimeRef = useRef<number>(0);
  
  // Store the last created payment for printing purposes
  const [lastCreatedPayment, setLastCreatedPayment] = useState<Payment | null>(null);
  const [lastSelectedApartment, setLastSelectedApartment] = useState<typeof apartments[0] | null>(null);
  const [lastPayerInfo, setLastPayerInfo] = useState<{
    payer_name: string;
    payer_type: PayerType;
  } | null>(null);
  
  // Reset print modal when created payment is cleared
  React.useEffect(() => {
    if (!createdPayment) {
      setShowPrintModal(false);
    }
  }, [createdPayment]);
  
  // NOTE: Building data now comes from buildingContext, no need to fetch separately
  
  // Auto-fill payer name based on selected apartment and payer type
  React.useEffect(() => {
    if (selectedApartment && selectedPayerType) {
      let payerName = '';
      if (selectedPayerType === PayerType.OWNER) {
        payerName = selectedApartment.owner_name || '';
      } else if (selectedPayerType === PayerType.TENANT) {
        payerName = selectedApartment.tenant_name || '';
      }
      setValue('payer_name', payerName);
    }
  }, [selectedApartment, selectedPayerType, setValue]);



  // Update form fields when initialData changes (for pre-filled data from apartment balances)
  React.useEffect(() => {
    if (initialData) {
      if (initialData.apartment_id) {
        setValue('apartment_id', initialData.apartment_id);
      }
      if (initialData.common_expense_amount) {
        setValue('common_expense_amount', initialData.common_expense_amount);
      }
      if (initialData.previous_obligations_amount) {
        setValue('previous_obligations_amount', initialData.previous_obligations_amount);
      }
      if (initialData.reserve_fund_amount) {
        setValue('reserve_fund_amount', initialData.reserve_fund_amount);
      }
    }
  }, [initialData, setValue]);

  const onSubmit = useCallback(async (data: LocalPaymentFormData) => {
    const now = Date.now();
    
    // Prevent multiple submissions with debouncing (2 seconds)
    if (isSubmitting || (now - lastSubmitTimeRef.current < 2000)) {
      console.warn('Payment submission too frequent or already in progress, ignoring duplicate request');
      return;
    }
    
    lastSubmitTimeRef.current = now;
    console.log('Starting payment submission...');
    setIsSubmitting(true);
    
    try {
      // Optimize: Pre-calculate values to reduce computation in the async function
      const commonExpenseAmount = roundToCents(data.common_expense_amount || 0);
      const previousObligationsAmount = roundToCents(data.previous_obligations_amount || 0);
      const reserveFundAmount = roundToCents(data.reserve_fund_amount || 0);
      const totalAmount = roundToCents(commonExpenseAmount + previousObligationsAmount + reserveFundAmount);
      
      const paymentData: PaymentFormData = {
        apartment_id: data.apartment_id,
        amount: totalAmount,
        reserve_fund_amount: reserveFundAmount,
        previous_obligations_amount: previousObligationsAmount,
        date: data.date,
        method: data.method,
        payment_type: data.payment_type,
        payer_type: data.payer_type,
        payer_name: data.payer_name,
        reference_number: data.reference_number,
        notes: data.notes,
        receipt: data.receipt,
      };

      // Optimize: Store data before API call to avoid blocking
      const currentSelectedApartment = selectedApartment;
      const currentPayerInfo = {
        payer_name: data.payer_name || '',
        payer_type: data.payer_type as PayerType,
      };

      const payment = await createPayment(paymentData);

      if (payment) {
        // Payment created successfully - update state efficiently
        setCreatedPayment(payment);
        setLastCreatedPayment(payment);
        setLastSelectedApartment(currentSelectedApartment || null);
        setLastPayerInfo(currentPayerInfo);

        // Automatically show receipt modal after successful payment
        setShowPrintModal(true);

        // Show success toast without print button (since receipt modal will open automatically)
        toast({
          title: 'Επιτυχία!',
          description: `Η είσπραξη καταχωρήθηκε επιτυχώς. Συνολικό ποσό: ${formatCurrency(totalAmount)}${reserveFundAmount > 0 ? ` (Αποθεματικό: ${formatCurrency(reserveFundAmount)})` : ''}${previousObligationsAmount > 0 ? ` (Παλαιότερες οφειλές: ${formatCurrency(previousObligationsAmount)})` : ''}.`,
        });

        reset();
      } else {
        toast({
          title: 'Σφάλμα',
          description: 'Η καταχώρηση της εισπράξεως απέτυχε. Παρακαλώ δοκιμάστε ξανά.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      showErrorFromException(error, 'Προέκυψε σφάλμα κατά την καταχώρηση της εισπράξεως');
      toast({
        title: 'Σφάλμα',
        description: error instanceof Error ? error.message : 'Προέκυψε σφάλμα κατά την καταχώρηση της εισπράξεως.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [createPayment, buildingData, selectedApartment, toast, onSuccess, reset]);

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    const labels: Record<PaymentMethod, string> = {
      [PaymentMethod.CASH]: 'Μετρητά',
      [PaymentMethod.BANK_TRANSFER]: 'Τραπεζική Μεταφορά',
      [PaymentMethod.CHECK]: 'Επιταγή',
      [PaymentMethod.CARD]: 'Κάρτα',
    };
    return labels[method];
  };

  const getPaymentTypeLabel = (type: PaymentType) => {
    const labels: Record<PaymentType, string> = {
      [PaymentType.COMMON_EXPENSE]: 'Κοινόχρηστα',
      [PaymentType.RESERVE_FUND]: 'Ταμείο Εφεδρείας',
      [PaymentType.SPECIAL_EXPENSE]: 'Ειδική Δαπάνη',
      [PaymentType.ADVANCE]: 'Προκαταβολή',
      [PaymentType.OTHER]: 'Άλλο',
    };
    return labels[type];
  };

  const getPayerTypeLabel = (type: PayerType) => {
    const labels: Record<PayerType, string> = {
      [PayerType.OWNER]: 'Ιδιοκτήτης',
      [PayerType.TENANT]: 'Ενοικιαστής',
      [PayerType.OTHER]: 'Άλλος',
    };
    return labels[type];
  };

  const handlePrintReceipt = async () => {
    const paymentToPrint = createdPayment || lastCreatedPayment;
    const apartmentToPrint = selectedApartment || lastSelectedApartment;
    
    if (!paymentToPrint || !apartmentToPrint) {
      console.error('Missing payment or apartment data for printing', {
        createdPayment: !!createdPayment,
        lastCreatedPayment: !!lastCreatedPayment,
        selectedApartment: !!selectedApartment,
        lastSelectedApartment: !!lastSelectedApartment,
        createdPaymentId: createdPayment?.id,
        lastCreatedPaymentId: lastCreatedPayment?.id,
        selectedApartmentId: selectedApartment?.id,
        lastSelectedApartmentId: lastSelectedApartment?.id
      });
      toast({
        title: 'Σφάλμα Εκτύπωσης',
        description: 'Δεν υπάρχουν δεδομένα για εκτύπωση. Παρακαλώ δημιουργήστε πρώτα μια είσπραξη.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const currentDate = new Date().toLocaleDateString('el-GR');
      const currentTime = new Date().toLocaleTimeString('el-GR');
      
      // Δημιουργία μοναδικού αριθμού απόδειξης
      const receiptNumber = `RCP-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}-${paymentToPrint.id}`;
      
      // URL για QR code επαλήθευσης
      const verificationUrl = `${window.location.origin}/verify-payment/${paymentToPrint.id}`;
      
      // Δημιουργία QR Code ως Data URL
      const generateQRCode = async (text: string): Promise<string> => {
        try {
          const QRCode = (await import('qrcode')).default;
          return await QRCode.toDataURL(text, {
            width: 100,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            },
            errorCorrectionLevel: 'M'
          });
        } catch (error) {
          console.error('Error generating QR code:', error);
          // Fallback απλό QR SVG
          return `data:image/svg+xml;base64,${btoa(`
            <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" fill="white"/>
              <rect x="10" y="10" width="80" height="80" fill="none" stroke="black" stroke-width="2"/>
              <text x="50" y="50" text-anchor="middle" dominant-baseline="middle" font-size="8">QR</text>
              <text x="50" y="60" text-anchor="middle" dominant-baseline="middle" font-size="6">${paymentToPrint.id}</text>
            </svg>
          `)}`;
        }
      };
      
      // Δημιουργία QR code
      const qrCodeDataUrl = await generateQRCode(verificationUrl);
      
      const receiptContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Απόδειξη Εισπράξεως - ${paymentToPrint.apartment_number}</title>
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
            .header-top {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 20px;
              text-align: left;
            }
            .logo-section {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            .logo-placeholder {
              flex-shrink: 0;
            }
            .company-info h2 {
              margin: 0;
              font-size: 18px;
              color: #2563eb;
              font-weight: bold;
            }
            .company-info p {
              margin: 2px 0;
              font-size: 14px;
              color: #666;
            }
            .receipt-number-section {
              text-align: right;
            }
            .receipt-number-section h3 {
              margin: 0 0 5px 0;
              font-size: 12px;
              color: #666;
              font-weight: normal;
            }
            .receipt-number {
              font-size: 16px;
              font-weight: bold;
              color: #2563eb;
              background: #f0f9ff;
              padding: 8px 12px;
              border-radius: 6px;
              border: 1px solid #2563eb;
            }
            .header h1 {
              margin: 0;
              color: #2563eb;
              font-size: 24px;
            }
            .header p {
              margin: 5px 0;
              color: #666;
            }
            .receipt-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-section {
              border: 1px solid #ddd;
              padding: 15px;
              border-radius: 8px;
              background: #f9fafb;
            }
            .info-section h3 {
              margin: 0 0 10px 0;
              color: #374151;
              font-size: 16px;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 5px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .info-label {
              font-weight: bold;
              color: #6b7280;
            }
            .info-value {
              color: #111827;
            }
            .amount-section {
              text-align: center;
              background: #f0f9ff;
              border: 2px solid #2563eb;
              padding: 20px;
              border-radius: 10px;
              margin: 30px 0;
            }
            .amount-value {
              font-size: 32px;
              font-weight: bold;
              color: #2563eb;
              margin: 10px 0;
            }
            .footer {
              margin-top: 40px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            .footer-content {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 30px;
            }
            .footer-text {
              flex: 1;
              font-size: 12px;
              color: #666;
            }
            .verification-url {
              font-size: 10px;
              word-break: break-all;
              background: #f5f5f5;
              padding: 4px 8px;
              border-radius: 4px;
              margin: 5px 0;
            }
            .qr-section {
              text-align: center;
              flex-shrink: 0;
            }
            .qr-section p {
              margin: 5px 0;
              font-size: 10px;
              color: #666;
            }
            .qr-label {
              font-size: 9px;
              color: #888;
            }
            .signature-section {
              margin-top: 40px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 50px;
            }
            .signature-box {
              text-align: center;
              border-top: 1px solid #333;
              padding-top: 10px;
              margin-top: 40px;
            }
            @media print {
              body { 
                margin: 0; 
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
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
            <div class="header-top">
              <div class="logo-section">
                <div class="logo-placeholder">
                  <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="60" height="60" rx="12" fill="#2563eb"/>
                    <path d="M15 20h30v25H15V20z" fill="white"/>
                    <path d="M20 25h5v5h-5v-5z M25 25h5v5h-5v-5z M30 25h5v5h-5v-5z" fill="#2563eb"/>
                    <path d="M20 35h5v5h-5v-5z M25 35h5v5h-5v-5z M30 35h5v5h-5v-5z" fill="#2563eb"/>
                  </svg>
                </div>
                <div class="company-info">
                  <h2>ΔΙΑΧΕΙΡΙΣΗ ΚΤΙΡΙΩΝ</h2>
                  <p>New Concierge Management</p>
                </div>
              </div>
              <div class="receipt-number-section">
                <h3>ΑΡΙΘΜΟΣ ΑΠΟΔΕΙΞΗΣ</h3>
                <div class="receipt-number">${receiptNumber}</div>
              </div>
            </div>
            <h1>ΑΠΟΔΕΙΞΗ ΕΙΣΠΡΑΞΕΩΣ</h1>
                          <p><strong>${paymentToPrint.building_name || 'Κτίριο'}</strong></p>
            <p>Ημερομηνία: ${currentDate} • Ώρα: ${currentTime}</p>
          </div>

          <div class="receipt-info">
            <div class="info-section">
              <h3>Στοιχεία Διαμερίσματος</h3>
              <div class="info-row">
                <span class="info-label">Διαμέρισμα:</span>
                <span class="info-value">${paymentToPrint.apartment_number}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Ιδιοκτήτης:</span>
                <span class="info-value">${paymentToPrint.owner_name || 'Μη καταχωρημένος'}</span>
              </div>
              ${paymentToPrint.tenant_name ? `
              <div class="info-row">
                <span class="info-label">Ενοικιαστής:</span>
                <span class="info-value">${paymentToPrint.tenant_name}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="info-section">
              <h3>Στοιχεία Πληρωμής</h3>
              <div class="info-row">
                <span class="info-label">Ημερομηνία:</span>
                <span class="info-value">${new Date(paymentToPrint.date).toLocaleDateString('el-GR')}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Μέθοδος:</span>
                <span class="info-value">${getPaymentMethodLabel(paymentToPrint.method as PaymentMethod)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Τύπος:</span>
                <span class="info-value">${getPaymentTypeLabel(paymentToPrint.payment_type as PaymentType)}</span>
              </div>
              ${paymentToPrint.reference_number ? `
              <div class="info-row">
                <span class="info-label">Αρ. Αναφοράς:</span>
                <span class="info-value">${paymentToPrint.reference_number}</span>
              </div>
              ` : ''}
            </div>
          </div>

          <div class="info-section">
                          <h3>Στοιχεία Ενοίκου</h3>
            <div class="info-row">
              <span class="info-label">Ένοικος:</span>
              <span class="info-value">${watch('payer_name') || 'Μη καταχωρημένος'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Ιδιότητα:</span>
              <span class="info-value">${getPayerTypeLabel(watch('payer_type') as PayerType)}</span>
            </div>
          </div>

          <div class="amount-section">
            <h2>ΠΟΣΟ ΕΙΣΠΡΑΞΕΩΣ</h2>
            <div class="amount-value">${formatCurrency(paymentToPrint.amount)}</div>
            <p>Ολογράφως: ${numberToWords(Number(paymentToPrint.amount))} ευρώ</p>
          </div>

          ${paymentToPrint.notes ? `
          <div class="info-section">
            <h3>Σημειώσεις</h3>
            <p>${paymentToPrint.notes}</p>
          </div>
          ` : ''}

          <div class="signature-section">
            <div class="signature-box">
                              <strong>Υπογραφή Ενοίκου</strong>
            </div>
            <div class="signature-box">
              <strong>Υπογραφή & Σφραγίδα Διαχειριστή</strong>
            </div>
          </div>

          <div class="footer">
            <div class="footer-content">
              <div class="footer-text">
                <p><strong>Επαλήθευση Απόδειξης:</strong></p>
                <p>Σκανάρετε το QR code ή επισκεφθείτε:</p>
                <p class="verification-url">${verificationUrl}</p>
                <hr/>
                <p>Αυτή η απόδειξη δημιουργήθηκε αυτόματα από το σύστημα διαχείρισης κτιρίου στις ${currentDate} ${currentTime}</p>
                <p>Για οποιαδήποτε διευκρίνιση επικοινωνήστε με τη διαχείριση</p>
              </div>
              <div class="qr-section">
                <p><strong>Επαλήθευση</strong></p>
                <img src="${qrCodeDataUrl}" alt="QR Code για επαλήθευση" width="100" height="100" style="border: 1px solid #ddd; border-radius: 4px;"/>
                <p class="qr-label">Σκανάρετε για επαλήθευση</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Δημιουργία του παραθύρου εκτύπωσης με καλύτερη διαχείριση popup blocker
      let printWindow: Window | null = null;
      
      try {
        // Πρώτη προσπάθεια: απλό παράθυρο
        printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes,toolbar=no,menubar=no');
        
        if (!printWindow) {
          // Δεύτερη προσπάθεια: με διαφορετικά options
          printWindow = window.open('', '_blank', 'width=800,height=600');
        }
        
        if (!printWindow) {
          // Τρίτη προσπάθεια: χωρίς options
          printWindow = window.open('', '_blank');
        }
        
        if (!printWindow) {
          toast({
            title: 'Σφάλμα Εκτύπωσης',
            description: 'Δεν μπόρεσε να ανοίξει το παράθυρο εκτύπωσης. Παρακαλώ επιτρέψτε τα pop-ups για αυτή τη σελίδα.',
            variant: 'destructive',
          });
          return;
        }
        
        // Εγγραφή του περιεχομένου
        printWindow.document.write(receiptContent);
        printWindow.document.close();
        
        // Περιμένουμε να φορτωθεί το περιεχόμενο
        const waitForLoad = () => {
          if (printWindow && printWindow.document.readyState === 'complete') {
            printWindow.focus();
            
            // Μικρή καθυστέρηση για να φορτωθούν τα styles και εικόνες
            setTimeout(() => {
              try {
                if (printWindow && !printWindow.closed) {
                  printWindow.print();
                  
                  // Κλείσιμο μετά την εκτύπωση
                  printWindow.onafterprint = () => {
                    if (printWindow && !printWindow.closed) {
                      printWindow.close();
                    }
                  };
                  
                  // Fallback: κλείσιμο μετά από 10 δευτερόλεπτα
                  setTimeout(() => {
                    if (printWindow && !printWindow.closed) {
                      printWindow.close();
                    }
                  }, 10000);
                }
              } catch (error) {
                console.error('Print error:', error);
                if (printWindow && !printWindow.closed) {
                  printWindow.close();
                }
                toast({
                  title: 'Σφάλμα Εκτύπωσης',
                  description: 'Παρουσιάστηκε σφάλμα κατά την εκτύπωση. Παρακαλώ δοκιμάστε ξανά.',
                  variant: 'destructive',
                });
              }
            }, 500);
          } else if (printWindow && !printWindow.closed) {
            // Ελέγχουμε ξανά μετά από λίγο
            setTimeout(waitForLoad, 100);
          }
        };
        
        // Ξεκινάμε τον έλεγχο φόρτωσης
        waitForLoad();
        
        // Fallback για περιπτώσεις που το readyState δεν αλλάζει
        setTimeout(() => {
          if (printWindow && !printWindow.closed && printWindow.document.readyState !== 'complete') {
            printWindow.focus();
            setTimeout(() => {
              try {
                if (printWindow && !printWindow.closed) {
                  printWindow.print();
                  printWindow.onafterprint = () => {
                    if (printWindow && !printWindow.closed) {
                      printWindow.close();
                    }
                  };
                }
              } catch (error) {
                console.error('Print error (fallback):', error);
                if (printWindow && !printWindow.closed) {
                  printWindow.close();
                }
              }
            }, 500);
          }
        }, 2000);
        
      } catch (error) {
        console.error('Error creating print window:', error);
        if (printWindow && !printWindow.closed) {
          printWindow.close();
        }
        toast({
          title: 'Σφάλμα Εκτύπωσης',
          description: 'Παρουσιάστηκε σφάλμα κατά τη δημιουργία του παραθύρου εκτύπωσης.',
          variant: 'destructive',
        });
      }
      
    } catch (error) {
      console.error('Error in handlePrintReceipt:', error);
      toast({
        title: 'Σφάλμα Εκτύπωσης',
        description: 'Παρουσιάστηκε σφάλμα κατά την προετοιμασία της εκτύπωσης. Παρακαλώ δοκιμάστε ξανά.',
        variant: 'destructive',
      });
    }
  };

  // Helper function to convert numbers to words (simplified version)
  const numberToWords = (num: number): string => {
    const units = ['', 'ένα', 'δύο', 'τρία', 'τέσσερα', 'πέντε', 'έξι', 'επτά', 'οκτώ', 'εννέα'];
    const teens = ['δέκα', 'έντεκα', 'δώδεκα', 'δεκατρία', 'δεκατέσσερα', 'δεκαπέντε', 'δεκαέξι', 'δεκαεπτά', 'δεκαοκτώ', 'δεκαεννέα'];
    const tens = ['', '', 'είκοσι', 'τριάντα', 'σαράντα', 'πενήντα', 'εξήντα', 'εβδομήντα', 'ογδόντα', 'ενενήντα'];
    const hundreds = ['', 'εκατό', 'διακόσια', 'τριακόσια', 'τετρακόσια', 'πεντακόσια', 'εξακόσια', 'επτακόσια', 'οκτακόσια', 'εννιακόσια'];
    
    if (num === 0) return 'μηδέν';
    if (num < 0) return 'μείον ' + numberToWords(-num);
    
    // Simplified conversion for common amounts
    if (num < 10) return units[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      const ten = Math.floor(num / 10);
      const unit = num % 10;
      return tens[ten] + (unit ? ' ' + units[unit] : '');
    }
    if (num < 1000) {
      const hundred = Math.floor(num / 100);
      const remainder = num % 100;
      return hundreds[hundred] + (remainder ? ' ' + numberToWords(remainder) : '');
    }
    
    // For larger numbers, just return the decimal representation
    return num.toString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className={typography.cardTitle}>Νέα Είσπραξη</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Print Receipt Controls - Always at top for visibility */}
        {(createdPayment || lastCreatedPayment) && (
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                ✅
              </div>
              <div>
                <h4 className="font-bold text-green-900 text-lg">🎉 Επιτυχής Καταχώρηση!</h4>
                <p className="text-green-700">
                  Η είσπραξη #{(createdPayment || lastCreatedPayment)?.id} καταχωρήθηκε επιτυχώς για το διαμέρισμα {(createdPayment || lastCreatedPayment)?.apartment_number}
                </p>
                <p className="text-green-600 text-sm">
                  Συνολικό Ποσό: <strong>{formatCurrency((createdPayment || lastCreatedPayment)?.amount)}</strong>
                  {((createdPayment || lastCreatedPayment)?.reserve_fund_amount ?? 0) > 0 && (
                    <span> (συμπεριλαμβανομένου αποθεματικού {formatCurrency((createdPayment || lastCreatedPayment)?.reserve_fund_amount)})</span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <Button 
                type="button" 
                onClick={() => {
                  const paymentToPrint = createdPayment || lastCreatedPayment;
                  const apartmentToPrint = selectedApartment || lastSelectedApartment;
                  
                  if (!paymentToPrint || !apartmentToPrint) {
                    toast({
                      title: 'Σφάλμα',
                      description: 'Δεν υπάρχουν δεδομένα για εκτύπωση.',
                      variant: 'destructive',
                    });
                    return;
                  }
                  setShowPrintModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg font-semibold shadow-lg h-14"
                size="lg"
              >
                🖨️ ΕΚΤΥΠΩΣΗ ΑΠΟΔΕΙΞΗΣ
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  const paymentToPrint = createdPayment || lastCreatedPayment;
                  const apartmentToPrint = selectedApartment || lastSelectedApartment;
                  
                  if (!paymentToPrint || !apartmentToPrint) {
                    toast({
                      title: 'Σφάλμα',
                      description: 'Δεν υπάρχουν δεδομένα για εκτύπωση.',
                      variant: 'destructive',
                    });
                    return;
                  }
                  handlePrintReceipt();
                }}
                className="bg-green-100 hover:bg-green-200 border-green-300 h-14"
              >
                🖨️ Άμεση Εκτύπωση
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  setCreatedPayment(null);
                  // ΔΕΝ καθαρίζουμε τα lastCreatedPayment, lastSelectedApartment, lastPayerInfo
                  // για να μπορούμε να εκτυπώσουμε την απόδειξη αργότερα
                }}
                className="bg-orange-100 hover:bg-orange-200 border-orange-300 h-14"
              >
                ➕ Νέα Είσπραξη
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  // Call onSuccess to close modal and refresh data
                  if (createdPayment) {
                    onSuccess?.(createdPayment);
                  }
                  // Καθαρίζουμε όλα τα δεδομένα εκτύπωσης
                  setLastCreatedPayment(null);
                  setLastSelectedApartment(null);
                  setLastPayerInfo(null);
                }}
                className="bg-gray-100 hover:bg-gray-200 border-slate-200 h-14"
              >
                ✕ Κλείσιμο Modal
              </Button>
            </div>
            
            <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200 mt-3">
              <p className="font-medium mb-1">💡 Επιλογές:</p>
              <ul className="space-y-1">
                <li>• <strong>ΕΚΤΥΠΩΣΗ ΑΠΟΔΕΙΞΗΣ:</strong> Ανοίγει modal με προεπισκόπηση (Προτεινόμενο)</li>
                <li>• <strong>Άμεση Εκτύπωση:</strong> Ανοίγει νέο παράθυρο για εκτύπωση</li>
                <li>• <strong>Νέα Είσπραξη:</strong> Καθαρίζει τη φόρμα για νέα είσπραξη (διατηρεί δεδομένα εκτύπωσης)</li>
                <li>• <strong>Κλείσιμο Modal:</strong> Κλείνει το modal και ανανεώνει τη λίστα (καθαρίζει όλα)</li>
              </ul>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Apartment Selection */}
          <div className="space-y-2">
            <Label>Διαμέρισμα *</Label>
            <Select
              value={selectedApartmentId ? selectedApartmentId.toString() : ''}
              onValueChange={(value) => setValue('apartment_id', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε διαμέρισμα" />
              </SelectTrigger>
              <SelectContent>
                {(apartments ?? []).map((apartment) => (
                  <SelectItem key={apartment.id} value={apartment.id.toString()}>
                    <div className="flex flex-col">
                      <span className="font-medium">{apartment.number}</span>
                      <div className="text-xs text-gray-600">
                        <div>Ιδιοκτήτης: {apartment.owner_name || 'Μη καταχωρημένος'}</div>
                        {apartment.is_rented && apartment.tenant_name && (
                          <div>Ενοικιαστής: {apartment.tenant_name}</div>
                        )}
                        {apartment.occupant_name && apartment.occupant_name !== apartment.owner_name && apartment.occupant_name !== apartment.tenant_name && (
                          <div>Ένοικος: {apartment.occupant_name}</div>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.apartment_id && (
              <p className="text-sm text-red-600">{errors.apartment_id.message}</p>
            )}
            {selectedApartment && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm font-medium text-blue-900 mb-2">
                  📍 Επιλεγμένο Διαμέρισμα: {selectedApartment.number}
                </div>
                <div className="space-y-1 text-sm text-blue-700">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">👤 Ιδιοκτήτης:</span>
                    <span>{selectedApartment.owner_name || 'Μη καταχωρημένος'}</span>
                  </div>
                  {selectedApartment.is_rented && selectedApartment.tenant_name && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">🏠 Ενοικιαστής:</span>
                      <span>{selectedApartment.tenant_name}</span>
                    </div>
                  )}
                  {selectedApartment.occupant_name && 
                   selectedApartment.occupant_name !== selectedApartment.owner_name && 
                   selectedApartment.occupant_name !== selectedApartment.tenant_name && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">🚪 Ένοικος:</span>
                      <span>{selectedApartment.occupant_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-medium">📋 Κατάσταση:</span>
                    <span className={selectedApartment.is_rented ? 'text-orange-600' : 'text-green-600'}>
                      {selectedApartment.is_rented ? 'Ενοικιασμένο' : 'Ιδιοκατοίκηση'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Amount and Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="common_expense_amount" className={typography.formLabel}>Ποσό Κοινόχρηστων (€) *</Label>
              <Input
                id="common_expense_amount"
                type="number"
                step="0.01"
                min="0"
                max="999999.99"
                {...register('common_expense_amount', { 
                  valueAsNumber: true,
                  onChange: (e) => {
                    // Allow user to type freely
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      setValue('common_expense_amount', value);
                    }
                  },
                  onBlur: (e) => {
                    // Round to 2 decimal places when user finishes editing
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      const roundedValue = roundToCents(value);
                      e.target.value = roundedValue.toFixed(2);
                      setValue('common_expense_amount', roundedValue);
                    }
                  }
                })}
                placeholder="0,00"
              />
              {errors.common_expense_amount && (
                <p className={typography.formError}>{errors.common_expense_amount.message}</p>
              )}
              {/* Custom validation error for the refine rule */}
              {errors.root && (
                <p className="text-sm text-red-600">{errors.root.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="previous_obligations_amount" className={typography.formLabel}>Παλαιότερες Οφειλές (€)</Label>
              <Input
                id="previous_obligations_amount"
                type="number"
                step="0.01"
                min="0"
                max="999999.99"
                {...register('previous_obligations_amount', { 
                  valueAsNumber: true,
                  onChange: (e) => {
                    // Allow user to type freely
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      setValue('previous_obligations_amount', value);
                    }
                  },
                  onBlur: (e) => {
                    // Round to 2 decimal places when user finishes editing
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      const roundedValue = roundToCents(value);
                      e.target.value = roundedValue.toFixed(2);
                      setValue('previous_obligations_amount', roundedValue);
                    }
                  }
                })}
                placeholder="0,00"
              />
              {errors.previous_obligations_amount && (
                <p className="text-sm text-red-600">{errors.previous_obligations_amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reserve_fund_amount" className={typography.formLabel}>Αποθεματικό (€)</Label>
              <Input
                id="reserve_fund_amount"
                type="number"
                step="0.01"
                min="0"
                max="999999.99"
                {...register('reserve_fund_amount', { 
                  valueAsNumber: true,
                  onChange: (e) => {
                    // Allow user to type freely
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      setValue('reserve_fund_amount', value);
                    }
                  },
                  onBlur: (e) => {
                    // Round to 2 decimal places when user finishes editing
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      const roundedValue = roundToCents(value);
                      e.target.value = roundedValue.toFixed(2);
                      setValue('reserve_fund_amount', roundedValue);
                    }
                  }
                })}
                placeholder="0,00"
              />
              {errors.reserve_fund_amount && (
                <p className="text-sm text-red-600">{errors.reserve_fund_amount.message}</p>
              )}
              {buildingData?.reserve_contribution_per_apartment && buildingData.reserve_contribution_per_apartment > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  💡 Προτεινόμενο: {formatCurrency(buildingData.reserve_contribution_per_apartment)}
                </p>
              )}
            </div>
          </div>

          {/* Total Amount Display */}
          <div className="space-y-2">
            <Label>Συνολικό Ποσό Εισπράξεως</Label>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-lg font-semibold text-blue-900">
                {formatCurrency((watch('common_expense_amount') || 0) + (watch('previous_obligations_amount') || 0) + (watch('reserve_fund_amount') || 0))}
              </div>
              <div className="text-sm text-blue-700">
                Κοινόχρηστα: {formatCurrency(watch('common_expense_amount') || 0)} + Παλαιότερες Οφειλές: {formatCurrency(watch('previous_obligations_amount') || 0)} + Αποθεματικό: {formatCurrency(watch('reserve_fund_amount') || 0)}
                {buildingData?.reserve_contribution_per_apartment && buildingData.reserve_contribution_per_apartment > 0 && (
                  <span> (συμπεριλαμβανομένου αποθεματικού {formatCurrency(buildingData.reserve_contribution_per_apartment)})</span>
                )}
              </div>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="payment_date" className={typography.formLabel}>Ημερομηνία Εισπράξεως *</Label>
            <Input
              id="payment_date"
              type="date"
              {...register('date')}
            />
            {errors.date && (
              <p className="text-sm text-red-600">{errors.date.message}</p>
            )}
          </div>

          {/* Payment Method and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Μέθοδος Εισπράξεως *</Label>
              <Select
                value={watch('method')}
                onValueChange={(value) => setValue('method', value as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε μέθοδο" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PaymentMethod).map((method) => (
                    <SelectItem key={method} value={method}>
                      {getPaymentMethodLabel(method)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.method && (
                <p className="text-sm text-red-600">{errors.method.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Τύπος Εισπράξεως *</Label>
              <Select
                value={watch('payment_type')}
                onValueChange={(value) => setValue('payment_type', value as PaymentType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε τύπο" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PaymentType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {getPaymentTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.payment_type && (
                <p className="text-sm text-red-600">{errors.payment_type.message}</p>
              )}
            </div>
          </div>

          {/* Payer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ένοικος *</Label>
              <Select
                value={watch('payer_type')}
                onValueChange={(value) => setValue('payer_type', value as PayerType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε ένοικο" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PayerType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {getPayerTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.payer_type && (
                <p className="text-sm text-red-600">{errors.payer_type.message}</p>
              )}
            </div>

            <div className="space-y-2">
                              <Label htmlFor="payer_name">Όνομα Ενοίκου</Label>
              <Input
                id="payer_name"
                {...register('payer_name')}
                placeholder="Θα συμπληρωθεί αυτόματα"
                className="bg-gray-50"
              />
              {errors.payer_name && (
                <p className="text-sm text-red-600">{errors.payer_name.message}</p>
              )}
            </div>
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="reference_number">Αριθμός Αναφοράς</Label>
            <Input
              id="reference_number"
              {...register('reference_number')}
              placeholder="π.χ. Τραπεζική αναφορά, αριθμός επιταγής"
            />
            {errors.reference_number && (
              <p className="text-sm text-red-600">{errors.reference_number.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Σημειώσεις</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Προαιρετικές σημειώσεις για την είσπραξη"
              rows={3}
            />
            {errors.notes && (
              <p className="text-sm text-red-600">{errors.notes.message}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={isLoading || isSubmitting || !!createdPayment} className="flex-1">
              {isLoading || isSubmitting ? 'Καταχώρηση...' : 'Καταχώρηση Εισπράξεως'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Ακύρωση
              </Button>
            )}
          </div>
        </form>
      </CardContent>

      {/* Receipt Print Modal */}
      {showPrintModal && (createdPayment || lastCreatedPayment) && (selectedApartment || lastSelectedApartment) && (
        <ReceiptPrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          payment={createdPayment || lastCreatedPayment!}
          apartmentInfo={{
            number: (selectedApartment || lastSelectedApartment)!.number,
            owner_name: (selectedApartment || lastSelectedApartment)!.owner_name || '',
            tenant_name: (selectedApartment || lastSelectedApartment)!.tenant_name || '',
            building_name: (createdPayment || lastCreatedPayment)!.building_name || '',
          }}
          payerInfo={{
            payer_name: lastPayerInfo?.payer_name || watch('payer_name') || '',
            payer_type: lastPayerInfo?.payer_type || (watch('payer_type') as PayerType),
          }}
        />
      )}


    </Card>
  );
};