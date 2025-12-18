'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Payment, PaymentMethod, PaymentType, PayerType } from '@/types/financial';
import { useToast } from '@/hooks/use-toast';
import { useReceipts, FinancialReceipt } from '@/hooks/useReceipts';
import { useAuth } from '@/components/contexts/AuthContext';
import { getOfficeLogoUrl } from '@/lib/utils';

interface ReceiptPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
  apartmentInfo: {
    number: string;
    owner_name: string;
    tenant_name?: string;
    building_name?: string;
  };
  payerInfo: {
    payer_name: string;
    payer_type: PayerType;
  };
  receiptData?: FinancialReceipt;
}

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({
  isOpen,
  onClose,
  payment,
  apartmentInfo,
  payerInfo,
  receiptData,
}) => {
  const { toast } = useToast();
  const { loadReceipts } = useReceipts();
  const { user } = useAuth();
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [storedReceipt, setStoredReceipt] = useState<FinancialReceipt | null>(receiptData || null);
  const [logoError, setLogoError] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Load receipt data from database if not provided
  useEffect(() => {
    if (isOpen && !storedReceipt && payment.id) {
      loadReceipts(undefined, payment.id).then((receipts) => {
        if (receipts && receipts.length > 0) {
          setStoredReceipt(receipts[0]);
        }
      }).catch((error) => {
        console.error('Failed to load receipt data:', error);
      });
    }
  }, [isOpen, payment.id, storedReceipt, loadReceipts]);

  // Generate QR code for verification
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
      // Fallback SVG
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" fill="white"/>
          <rect x="10" y="10" width="80" height="80" fill="none" stroke="black" stroke-width="2"/>
          <text x="50" y="50" text-anchor="middle" dominant-baseline="middle" font-size="8">QR</text>
          <text x="50" y="60" text-anchor="middle" dominant-baseline="middle" font-size="6">${payment.id}</text>
        </svg>
      `)}`;
    }
  };

  // Initialize QR code when modal opens
  React.useEffect(() => {
    if (isOpen && !qrCodeDataUrl) {
      setIsGeneratingQR(true);
      // Use receipt number if available, otherwise use payment ID
      const verificationId = storedReceipt?.receipt_number || payment.id;
      const verificationUrl = `${window.location.origin}/verify-payment/${verificationId}`;
      generateQRCode(verificationUrl).then((dataUrl) => {
        setQrCodeDataUrl(dataUrl);
        setIsGeneratingQR(false);
      });
    }
  }, [isOpen, payment.id, storedReceipt?.receipt_number, qrCodeDataUrl]);

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

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Απόδειξη Εισπράξεως - ${apartmentInfo.number}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
                color: #333;
                line-height: 1.6;
              }
              .receipt-content * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              @media print {
                body { 
                  margin: 0; 
                }
                .no-print {
                  display: none !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="receipt-content">
              ${printContent}
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
        
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.onafterprint = () => {
            printWindow.close();
          };
        }, 500);
      } else {
        toast({
          title: 'Σφάλμα Εκτύπωσης',
          description: 'Δεν μπόρεσε να ανοίξει το παράθυρο εκτύπωσης. Δοκιμάστε την εκτύπωση από τον browser.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDirectPrint = () => {
    // Hide dialog and print the current page content
    const originalContent = document.body.innerHTML;
    const printContent = printRef.current?.innerHTML || '';
    
    document.body.innerHTML = `
      <div style="font-family: Arial, sans-serif; margin: 20px; color: #333; line-height: 1.6;">
        ${printContent}
      </div>
    `;
    
    window.print();
    
    // Restore original content
    document.body.innerHTML = originalContent;
    // Reload to restore event listeners
    window.location.reload();
  };

  const currentDate = new Date().toLocaleDateString('el-GR');
  const currentTime = new Date().toLocaleTimeString('el-GR');
  const receiptNumber = storedReceipt?.receipt_number || `RCP-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}-${payment.id}`;
  const verificationUrl = `${window.location.origin}/verify-payment/${storedReceipt?.receipt_number || payment.id}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🖨️ Προεπισκόπηση Απόδειξης Εισπράξεως
          </DialogTitle>
          <DialogDescription>
            Προεπισκόπηση της απόδειξης εισπράξεως για το διαμέρισμα {apartmentInfo.number}. Μπορείτε να εκτυπώσετε την απόδειξη ή να την κλείσετε.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Print Action Buttons */}
          <div className="flex gap-2 justify-end border-b pb-4 no-print">
            <Button onClick={handlePrint} variant="default">
              🖨️ Εκτύπωση με Παράθυρο
            </Button>
            <Button onClick={handleDirectPrint} variant="outline">
              📄 Άμεση Εκτύπωση
            </Button>
            <Button onClick={onClose} variant="outline">
              Κλείσιμο
            </Button>
          </div>

          {/* Receipt Content */}
          <div ref={printRef} className="bg-white p-6 border border-gray-300 rounded-lg shadow-sm">
            {/* Header */}
            <div className="text-center border-b-2 border-gray-300 pb-5 mb-8">
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {(() => {
                      const logoUrl = getOfficeLogoUrl(user?.office_logo);
                      return logoUrl && !logoError ? (
                        <img 
                          src={logoUrl}
                          alt="Office Logo" 
                          className="w-16 h-16 object-contain rounded-lg"
                          onLoad={() => setLogoError(false)}
                          onError={() => setLogoError(true)}
                        />
                      ) : (
                        <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="60" height="60" rx="12" fill="currentColor" className="text-primary"/>
                          <path d="M15 20h30v25H15V20z" fill="white"/>
                          <path d="M20 25h5v5h-5v-5z M25 25h5v5h-5v-5z M30 25h5v5h-5v-5z" fill="currentColor" className="text-primary"/>
                          <path d="M20 35h5v5h-5v-5z M25 35h5v5h-5v-5z M30 35h5v5h-5v-5z" fill="currentColor" className="text-primary"/>
                        </svg>
                      );
                    })()}
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-bold text-primary m-0">
                      {user?.office_name || 'ΔΙΑΧΕΙΡΙΣΗ ΚΤΙΡΙΩΝ'}
                    </h2>
                    {user?.office_address && (
                      <p className="text-xs text-muted-foreground m-0 mt-1">{user.office_address}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      {user?.office_phone && (
                        <p className="text-xs text-muted-foreground m-0">Τηλ: {user.office_phone}</p>
                      )}
                      {user?.office_phone_emergency && (
                        <p className="text-xs text-muted-foreground m-0">Τηλ. Ανάγκης: {user.office_phone_emergency}</p>
                      )}
                      {user?.email && (
                        <p className="text-xs text-muted-foreground m-0">Email: {user.email}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-xs text-muted-foreground font-normal m-0 mb-1">ΑΡΙΘΜΟΣ ΑΠΟΔΕΙΞΗΣ</h3>
                  <div className="text-base font-bold text-primary bg-primary/10 px-3 py-2 rounded border border-primary">
                    {receiptNumber}
                  </div>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-primary m-0">ΑΠΟΔΕΙΞΗ ΕΙΣΠΡΑΞΕΩΣ</h1>
              <p className="mt-2 mb-1"><strong>{apartmentInfo.building_name || 'Κτίριο'}</strong></p>
              <p className="text-muted-foreground">Ημερομηνία: {currentDate} • Ώρα: {currentTime}</p>
            </div>

            {/* Receipt Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="border border-slate-200 p-4 rounded-lg bg-gray-50">
                <h3 className="font-semibold text-gray-800 text-base border-b border-slate-200 pb-2 mb-3">
                  Στοιχεία Διαμερίσματος
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Διαμέρισμα:</span>
                    <span className="text-gray-900">{apartmentInfo.number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Ιδιοκτήτης:</span>
                    <span className="text-gray-900">{apartmentInfo.owner_name || 'Μη καταχωρημένος'}</span>
                  </div>
                  {apartmentInfo.tenant_name && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Ενοικιαστής:</span>
                      <span className="text-gray-900">{apartmentInfo.tenant_name}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="border border-slate-200 p-4 rounded-lg bg-gray-50">
                <h3 className="font-semibold text-gray-800 text-base border-b border-slate-200 pb-2 mb-3">
                  Στοιχεία Πληρωμής
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Ημερομηνία:</span>
                    <span className="text-gray-900">{new Date(payment.date).toLocaleDateString('el-GR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Μέθοδος:</span>
                    <span className="text-gray-900">{getPaymentMethodLabel(payment.method as PaymentMethod)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Τύπος:</span>
                    <span className="text-gray-900">{getPaymentTypeLabel(payment.payment_type as PaymentType)}</span>
                  </div>
                  {payment.reference_number && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Αρ. Αναφοράς:</span>
                      <span className="text-gray-900">{payment.reference_number}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payer Info */}
            <div className="border border-slate-200 p-4 rounded-lg bg-gray-50 mb-8">
              <h3 className="font-semibold text-gray-800 text-base border-b border-slate-200 pb-2 mb-3">
                Στοιχεία Ενοίκου
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Ένοικος:</span>
                  <span className="text-gray-900">{storedReceipt?.payer_name || payerInfo.payer_name || 'Μη καταχωρημένος'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Ιδιότητα:</span>
                  <span className="text-gray-900">{storedReceipt?.payer_type_display || getPayerTypeLabel(payerInfo.payer_type)}</span>
                </div>
                {storedReceipt?.reference_number && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Αρ. Αναφοράς:</span>
                    <span className="text-gray-900">{storedReceipt.reference_number}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Amount Section */}
            <div className="text-center bg-primary/10 border-2 border-primary p-6 rounded-lg my-8">
              <h2 className="text-xl font-bold text-primary mb-2">ΠΟΣΟ ΕΙΣΠΡΑΞΕΩΣ</h2>
              <div className="text-4xl font-bold text-primary my-4">{payment.amount}€</div>
              <p className="text-primary/90">Ολογράφως: {numberToWords(Number(payment.amount))} ευρώ</p>
            </div>

            {/* Notes */}
            {(storedReceipt?.notes || payment.notes) && (
              <div className="border border-slate-200 p-4 rounded-lg bg-gray-50 mb-8">
                <h3 className="font-semibold text-gray-800 text-base border-b border-slate-200 pb-2 mb-3">
                  Σημειώσεις
                </h3>
                <p className="text-gray-900">{storedReceipt?.notes || payment.notes}</p>
              </div>
            )}

            {/* Signature Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12 mb-8">
              <div className="text-center">
                <div className="border-t-2 border-gray-300 pt-3 mt-12">
                  <strong>Υπογραφή Ενοίκου</strong>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t-2 border-gray-300 pt-3 mt-12">
                  <strong>Υπογραφή & Σφραγίδα Διαχειριστή</strong>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 pt-6 mt-12">
              <div className="flex justify-between items-start gap-8">
                <div className="flex-1 text-xs text-gray-600">
                  <p><strong>Επαλήθευση Απόδειξης:</strong></p>
                  <p>Σκανάρετε το QR code ή επισκεφθείτε:</p>
                  <p className="text-xs bg-gray-100 p-2 rounded break-all">{verificationUrl}</p>
                  <hr className="my-3"/>
                  <p>Αυτή η απόδειξη δημιουργήθηκε αυτόματα από το σύστημα διαχείρισης κτιρίου στις {currentDate} {currentTime}</p>
                  <p>Για οποιαδήποτε διευκρίνιση επικοινωνήστε με τη διαχείριση</p>
                </div>
                <div className="text-center flex-shrink-0">
                  <p className="text-xs font-medium mb-2">Επαλήθευση</p>
                  {isGeneratingQR ? (
                    <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-xs">Φόρτωση...</span>
                    </div>
                  ) : qrCodeDataUrl ? (
                    <img 
                      src={qrCodeDataUrl} 
                      alt="QR Code για επαλήθευση" 
                      width="100" 
                      height="100" 
                      className="border border-slate-200 rounded"
                    />
                  ) : null}
                  <p className="text-xs text-gray-500 mt-1">Σκανάρετε για επαλήθευση</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
