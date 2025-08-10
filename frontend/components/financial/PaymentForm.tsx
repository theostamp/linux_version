'use client';

import React, { useState } from 'react';
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

const paymentFormSchema = z.object({
  apartment_id: z.number().min(1, 'Παρακαλώ επιλέξτε διαμέρισμα'),
  amount: z.number().min(0.01, 'Το ποσό πρέπει να είναι μεγαλύτερο από 0'),
  date: z.string().min(1, 'Παρακαλώ επιλέξτε ημερομηνία'),
  method: z.string().min(1, 'Παρακαλώ επιλέξτε μέθοδο εισπράξεως'),
  payment_type: z.string().min(1, 'Παρακαλώ επιλέξτε τύπο εισπράξεως'),
  payer_type: z.string().min(1, 'Παρακαλώ επιλέξτε πληρωτή'),
  payer_name: z.string().optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
  receipt: z.any().optional(),
});

type LocalPaymentFormData = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  buildingId: number;
  apartments: Array<{ 
    id: number; 
    number: string; 
    owner_name: string;
    tenant_name: string;
    occupant_name: string;
    is_rented: boolean;
  }>;
  onSuccess?: (payment: Payment) => void;
  onCancel?: () => void;
  initialData?: Partial<LocalPaymentFormData>;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  buildingId,
  apartments,
  onSuccess,
  onCancel,
  initialData,
}) => {
  const { toast } = useToast();
  const { createPayment, isLoading } = usePayments();
  
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
      amount: initialData?.amount || 0,
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

  const onSubmit = async (data: LocalPaymentFormData) => {
    try {
      const paymentData: PaymentFormData = {
        apartment_id: data.apartment_id,
        amount: data.amount,
        date: data.date,
        method: data.method,
        payment_type: data.payment_type,
        payer_type: data.payer_type,
        payer_name: data.payer_name,
        reference_number: data.reference_number,
        notes: data.notes,
        receipt: data.receipt,
      };

      const payment = await createPayment(paymentData);

      if (payment) {
        console.log('Payment created successfully:', payment);
        setCreatedPayment(payment);

        toast({
          title: 'Επιτυχία!',
          description: 'Η είσπραξη καταχωρήθηκε επιτυχώς.',
        });

        reset();
        if (payment) {
          onSuccess?.(payment);
        }
      } else {
        // Payment creation failed
        toast({
          title: 'Σφάλμα',
          description: 'Η καταχώρηση της εισπράξεως απέτυχε. Παρακαλώ δοκιμάστε ξανά.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Σφάλμα',
        description: error instanceof Error ? error.message : 'Προέκυψε σφάλμα κατά την καταχώρηση της εισπράξεως.',
        variant: 'destructive',
      });
    }
  };

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
    if (!createdPayment || !selectedApartment) {
      console.error('Missing payment or apartment data for printing');
      return;
    }
    
    try {
      const currentDate = new Date().toLocaleDateString('el-GR');
      const currentTime = new Date().toLocaleTimeString('el-GR');
      
      // Δημιουργία μοναδικού αριθμού απόδειξης
      const receiptNumber = `RCP-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}-${createdPayment.id}`;
      
      // URL για QR code επαλήθευσης
      const verificationUrl = `${window.location.origin}/verify-payment/${createdPayment.id}`;
      
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
              <text x="50" y="60" text-anchor="middle" dominant-baseline="middle" font-size="6">${createdPayment.id}</text>
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
          <title>Απόδειξη Εισπράξεως - ${createdPayment.apartment_number}</title>
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
            <p><strong>${createdPayment.building_name || 'Κτίριο'}</strong></p>
            <p>Ημερομηνία: ${currentDate} • Ώρα: ${currentTime}</p>
          </div>

          <div class="receipt-info">
            <div class="info-section">
              <h3>Στοιχεία Διαμερίσματος</h3>
              <div class="info-row">
                <span class="info-label">Διαμέρισμα:</span>
                <span class="info-value">${createdPayment.apartment_number}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Ιδιοκτήτης:</span>
                <span class="info-value">${createdPayment.owner_name || 'Μη καταχωρημένος'}</span>
              </div>
              ${createdPayment.tenant_name ? `
              <div class="info-row">
                <span class="info-label">Ενοικιαστής:</span>
                <span class="info-value">${createdPayment.tenant_name}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="info-section">
              <h3>Στοιχεία Πληρωμής</h3>
              <div class="info-row">
                <span class="info-label">Ημερομηνία:</span>
                <span class="info-value">${new Date(createdPayment.date).toLocaleDateString('el-GR')}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Μέθοδος:</span>
                <span class="info-value">${getPaymentMethodLabel(createdPayment.method as PaymentMethod)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Τύπος:</span>
                <span class="info-value">${getPaymentTypeLabel(createdPayment.payment_type as PaymentType)}</span>
              </div>
              ${createdPayment.reference_number ? `
              <div class="info-row">
                <span class="info-label">Αρ. Αναφοράς:</span>
                <span class="info-value">${createdPayment.reference_number}</span>
              </div>
              ` : ''}
            </div>
          </div>

          <div class="info-section">
            <h3>Στοιχεία Πληρωτή</h3>
            <div class="info-row">
              <span class="info-label">Πληρωτής:</span>
              <span class="info-value">${watch('payer_name') || 'Μη καταχωρημένος'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Ιδιότητα:</span>
              <span class="info-value">${getPayerTypeLabel(watch('payer_type') as PayerType)}</span>
            </div>
          </div>

          <div class="amount-section">
            <h2>ΠΟΣΟ ΕΙΣΠΡΑΞΕΩΣ</h2>
            <div class="amount-value">${createdPayment.amount}€</div>
            <p>Ολογράφως: ${numberToWords(Number(createdPayment.amount))} ευρώ</p>
          </div>

          ${createdPayment.notes ? `
          <div class="info-section">
            <h3>Σημειώσεις</h3>
            <p>${createdPayment.notes}</p>
          </div>
          ` : ''}

          <div class="signature-section">
            <div class="signature-box">
              <strong>Υπογραφή Πληρωτή</strong>
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
        <CardTitle>Νέα Είσπραξη</CardTitle>
      </CardHeader>
      <CardContent>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Ποσό (€) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                {...register('amount', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_date">Ημερομηνία Εισπράξεως *</Label>
              <Input
                id="payment_date"
                type="date"
                {...register('date')}
              />
              {errors.date && (
                <p className="text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>
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
              <Label>Πληρωτής *</Label>
              <Select
                value={watch('payer_type')}
                onValueChange={(value) => setValue('payer_type', value as PayerType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε πληρωτή" />
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
              <Label htmlFor="payer_name">Όνομα Πληρωτή</Label>
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

          {/* Success Actions - Print Receipt */}
          {createdPayment && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  ✓
                </div>
                <div>
                  <h4 className="font-medium text-green-900">Επιτυχής Καταχώρηση!</h4>
                  <p className="text-sm text-green-700">
                    Η είσπραξη καταχωρήθηκε επιτυχώς για το διαμέρισμα {createdPayment.apartment_number}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    type="button" 
                    onClick={() => {
                      console.log('🖨️ Modal button clicked!');
                      console.log('Current showPrintModal state:', showPrintModal);
                      console.log('createdPayment:', createdPayment);
                      console.log('selectedApartment:', selectedApartment);
                      setShowPrintModal(true);
                      console.log('After setShowPrintModal(true)');
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    🖨️ Προεπισκόπηση & Εκτύπωση
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handlePrintReceipt}
                  >
                    🖨️ Εκτύπωση (Παλιός Τρόπος)
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      // Debug version - just try to open a simple popup
                      try {
                        const testWindow = window.open('', '_blank', 'width=400,height=300');
                        if (testWindow) {
                          testWindow.document.write(`
                            <html>
                              <head><title>Τέστ Εκτύπωσης</title></head>
                              <body style="font-family: Arial; padding: 20px; text-align: center;">
                                <h1>Τέστ Εκτύπωσης</h1>
                                <p>Διαμέρισμα: ${createdPayment.apartment_number}</p>
                                <p>Ποσό: ${createdPayment.amount}€</p>
                                <p>Ημερομηνία: ${new Date().toLocaleDateString('el-GR')}</p>
                                <button onclick="window.print()">Εκτύπωση</button>
                                <button onclick="window.close()">Κλείσιμο</button>
                              </body>
                            </html>
                          `);
                          testWindow.document.close();
                        } else {
                          alert('Δεν μπόρεσε να ανοίξει παράθυρο. Επιτρέψτε τα pop-ups.');
                        }
                      } catch (error: unknown) {
                        console.error('Test print error:', error);
                        const errorMessage = error instanceof Error ? error.message : 'Άγνωστο σφάλμα';
                        alert('Σφάλμα: ' + errorMessage);
                      }
                    }}
                  >
                    🔧 Τέστ Εκτύπωσης
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setCreatedPayment(null)}
                  >
                    Νέα Είσπραξη
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      // Εναλλακτική εκτύπωση: χρησιμοποιώντας iframe
                      const iframe = document.createElement('iframe');
                      iframe.style.position = 'fixed';
                      iframe.style.right = '0';
                      iframe.style.bottom = '0';
                      iframe.style.width = '0';
                      iframe.style.height = '0';
                      iframe.style.border = '0';
                      
                      const receiptContent = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <meta charset="UTF-8">
                          <title>Απόδειξη Εισπράξεως</title>
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
                              font-size: 24px;
                            }
                            .header p {
                              margin: 5px 0;
                              color: #666;
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
                              text-align: center;
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
                            <h1>ΑΠΟΔΕΙΞΗ ΕΙΣΠΡΑΞΕΩΣ</h1>
                            <p><strong>${createdPayment.building_name || 'Κτίριο'}</strong></p>
                            <p>Διαμέρισμα: ${createdPayment.apartment_number}</p>
                            <p>Ημερομηνία: ${new Date().toLocaleDateString('el-GR')}</p>
                          </div>
                          
                          <div class="amount-section">
                            <h2>ΠΟΣΟ ΕΙΣΠΡΑΞΕΩΣ</h2>
                            <div class="amount-value">${createdPayment.amount}€</div>
                            <p>Ολογράφως: ${numberToWords(Number(createdPayment.amount))} ευρώ</p>
                          </div>
                          
                          <div class="footer">
                            <p style="font-size: 12px; color: #666;">
                              Αυτή η απόδειξη δημιουργήθηκε αυτόματα από το σύστημα διαχείρισης κτιρίου
                            </p>
                          </div>
                        </body>
                        </html>
                      `;
                      
                      document.body.appendChild(iframe);
                      
                      iframe.onload = () => {
                        if (iframe.contentDocument) {
                          iframe.contentDocument.write(receiptContent);
                          iframe.contentDocument.close();
                          
                          setTimeout(() => {
                            iframe.contentWindow?.print();
                            
                            // Αφαιρούμε το iframe μετά την εκτύπωση
                            setTimeout(() => {
                              document.body.removeChild(iframe);
                            }, 1000);
                          }, 500);
                        }
                      };
                    }}
                  >
                    📄 Εκτύπωση Απλή
                  </Button>
                </div>
                
                <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                  <p className="font-medium mb-1">💡 Επιλογές Εκτύπωσης:</p>
                  <ul className="space-y-1">
                    <li>• <strong>Προεπισκόπηση & Εκτύπωση:</strong> Ανοίγει modal με προεπισκόπηση και επιλογές εκτύπωσης (Προτεινόμενο)</li>
                    <li>• <strong>Εκτύπωση (Παλιός Τρόπος):</strong> Ανοίγει νέο παράθυρο με πλήρη απόδειξη</li>
                    <li>• <strong>Τέστ Εκτύπωσης:</strong> Απλό τέστ για να ελέγξετε αν λειτουργούν τα pop-ups</li>
                    <li>• <strong>Εκτύπωση Απλή:</strong> Εκτυπώνει απευθείας χωρίς νέο παράθυρο</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={isLoading || !!createdPayment} className="flex-1">
              {isLoading ? 'Καταχώρηση...' : 'Καταχώρηση Εισπράξεως'}
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
      {showPrintModal && createdPayment && selectedApartment && (
        <ReceiptPrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          payment={createdPayment}
          apartmentInfo={{
            number: selectedApartment.number,
            owner_name: selectedApartment.owner_name || '',
            tenant_name: selectedApartment.tenant_name || '',
            building_name: createdPayment.building_name || '',
          }}
          payerInfo={{
            payer_name: watch('payer_name') || '',
            payer_type: watch('payer_type') as PayerType,
          }}
        />
      )}

      {/* Debug Modal for testing */}
      {showPrintModal && (!createdPayment || !selectedApartment) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-bold mb-4">⚠️ Debug Info</h2>
            <div className="space-y-2 text-sm">
              <p><strong>showPrintModal:</strong> {showPrintModal ? 'true' : 'false'}</p>
              <p><strong>createdPayment exists:</strong> {createdPayment ? 'true' : 'false'}</p>
              <p><strong>selectedApartment exists:</strong> {selectedApartment ? 'true' : 'false'}</p>
              <p className="text-red-600">Κάποια από τα απαραίτητα δεδομένα λείπουν για την εκτύπωση.</p>
            </div>
            <Button onClick={() => setShowPrintModal(false)} className="mt-4">
              Κλείσιμο
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}; 