'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { 
  FileText, 
  Printer, 
  Save, 
  PenTool, 
  CheckCircle, 
  AlertCircle,
  Building,
  User,
  Calendar,
  Euro
} from 'lucide-react';

const receiptSchema = z.object({
  receipt_type: z.enum(['payment', 'advance', 'installment', 'final']),
  amount: z.number().positive('Το ποσό πρέπει να είναι θετικό'),
  payment_date: z.string().min(1, 'Η ημερομηνία πληρωμής είναι υποχρεωτική'),
  description: z.string().min(1, 'Η περιγραφή είναι υποχρεωτική').max(500, 'Η περιγραφή δεν μπορεί να ξεπερνά τους 500 χαρακτήρες'),
  contractor_invoice: z.string().optional(),
});

type ReceiptFormData = z.infer<typeof receiptSchema>;

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduledMaintenanceId?: number;
  installmentId?: number;
  contractorId?: number;
  initialData?: Partial<ReceiptFormData>;
  onReceiptCreated?: (receipt: any) => void;
}

interface MaintenanceInfo {
  id: number;
  title: string;
  building_name: string;
  contractor_name?: string;
  estimated_cost?: number;
  scheduled_date: string;
}

export default function PaymentReceiptModal({
  isOpen,
  onClose,
  scheduledMaintenanceId,
  installmentId,
  contractorId,
  initialData,
  onReceiptCreated
}: PaymentReceiptModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [maintenanceInfo, setMaintenanceInfo] = useState<MaintenanceInfo | null>(null);
  const [createdReceipt, setCreatedReceipt] = useState<any>(null);

  const form = useForm<ReceiptFormData>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      receipt_type: 'payment',
      payment_date: new Date().toISOString().slice(0, 10),
      ...initialData
    }
  });

  // Load maintenance info when modal opens
  useEffect(() => {
    if (isOpen && scheduledMaintenanceId) {
      loadMaintenanceInfo();
    }
  }, [isOpen, scheduledMaintenanceId]);

  const loadMaintenanceInfo = async () => {
    try {
      const response = await api.get(`/api/maintenance/scheduled-maintenance/${scheduledMaintenanceId}/`);
      setMaintenanceInfo(response.data);
    } catch (error) {
      console.error('Error loading maintenance info:', error);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η φόρτωση των στοιχείων του έργου",
        variant: "destructive",
      });
    }
  };

  const onSubmit: SubmitHandler<ReceiptFormData> = async (data) => {
    setIsLoading(true);
    try {
      const receiptData = {
        scheduled_maintenance: scheduledMaintenanceId,
        installment: installmentId,
        contractor: contractorId,
        receipt_type: data.receipt_type,
        amount: data.amount,
        payment_date: data.payment_date,
        description: data.description,
        contractor_invoice: data.contractor_invoice,
        contractor_signature: signatureData,
        status: 'issued',
      };

      const response = await api.post('/api/maintenance/payment-receipts/', receiptData);
      
      setCreatedReceipt(response.data);
      setReceiptNumber(response.data.receipt_number);
      setShowPreview(true);
      
      toast({
        title: "Επιτυχία",
        description: "Η απόδειξη δημιουργήθηκε επιτυχώς",
      });

      if (onReceiptCreated) {
        onReceiptCreated(response.data);
      }
    } catch (error) {
      console.error('Error creating receipt:', error);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η δημιουργία της απόδειξης",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!createdReceipt) return;
    
    setIsGenerating(true);
    try {
      const response = await api.post(`/api/maintenance/payment-receipts/${createdReceipt.id}/generate-pdf/`);
      
      // Download the PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receiptNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Επιτυχία",
        description: "Το PDF δημιουργήθηκε και κατέβηκε επιτυχώς",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η δημιουργία του PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setShowPreview(false);
    setShowSignature(false);
    setSignatureData('');
    setReceiptNumber('');
    setMaintenanceInfo(null);
    setCreatedReceipt(null);
    onClose();
  };

  const receiptTypeLabels = {
    payment: 'Πληρωμή',
    advance: 'Προκαταβολή',
    installment: 'Δόση',
    final: 'Τελική Πληρωμή'
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {showPreview ? 'Προεπισκόπηση Απόδειξης' : 'Δημιουργία Απόδειξης Πληρωμής'}
          </DialogTitle>
        </DialogHeader>

        {showPreview && createdReceipt ? (
          // Receipt Preview
          <div className="space-y-6">
            <Card>
              <CardHeader className="text-center border-b">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">ΑΠΟΔΕΙΞΗ ΠΛΗΡΩΜΗΣ</h2>
                  <p className="text-lg text-muted-foreground">#{receiptNumber}</p>
                  <Badge variant="outline" className="text-sm">
                    {receiptTypeLabels[createdReceipt.receipt_type as keyof typeof receiptTypeLabels]}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6 p-6">
                {/* Company Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Εκδότης</h3>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">New Concierge</p>
                      <p>Διαχείριση Κτιρίων</p>
                      <p>info@newconcierge.gr</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <h3 className="font-semibold mb-2">Στοιχεία Απόδειξης</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Ημ/νία Έκδοσης:</span> {new Date(createdReceipt.issue_date).toLocaleDateString('el-GR')}</p>
                      <p><span className="font-medium">Ημ/νία Πληρωμής:</span> {new Date(createdReceipt.payment_date).toLocaleDateString('el-GR')}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Project Info */}
                {maintenanceInfo && (
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Στοιχεία Έργου
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><span className="font-medium">Τίτλος:</span> {maintenanceInfo.title}</p>
                        <p><span className="font-medium">Κτίριο:</span> {maintenanceInfo.building_name}</p>
                      </div>
                      <div>
                        <p><span className="font-medium">Συνεργείο:</span> {maintenanceInfo.contractor_name || 'Δεν έχει οριστεί'}</p>
                        <p><span className="font-medium">Προγρ. Ημ/νία:</span> {new Date(maintenanceInfo.scheduled_date).toLocaleDateString('el-GR')}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Payment Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Euro className="h-4 w-4" />
                    Στοιχεία Πληρωμής
                  </h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-medium">Ποσό Πληρωμής:</span>
                      <span className="font-bold text-2xl">€{createdReceipt.amount}</span>
                    </div>
                  </div>
                  <div className="text-sm">
                    <p><span className="font-medium">Περιγραφή:</span> {createdReceipt.description}</p>
                    {createdReceipt.payment_method && (
                      <p><span className="font-medium">Τρόπος Πληρωμής:</span> {createdReceipt.payment_method}</p>
                    )}
                  </div>
                </div>

                {/* Digital Signature */}
                {signatureData && (
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <PenTool className="h-4 w-4" />
                      Ψηφιακή Υπογραφή
                    </h3>
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <img src={signatureData} alt="Υπογραφή" className="max-h-20" />
                      <p className="text-xs text-muted-foreground mt-2">
                        Υπογραφή: {new Date().toLocaleString('el-GR')}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Επεξεργασία
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={generatePDF}
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  {isGenerating ? 'Δημιουργία...' : 'Εκτύπωση PDF'}
                </Button>
                <Button onClick={handleClose} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Ολοκλήρωση
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Receipt Creation Form
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {maintenanceInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Στοιχεία Έργου</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><span className="font-medium">Τίτλος:</span> {maintenanceInfo.title}</p>
                      <p><span className="font-medium">Κτίριο:</span> {maintenanceInfo.building_name}</p>
                    </div>
                    <div>
                      <p><span className="font-medium">Συνεργείο:</span> {maintenanceInfo.contractor_name || 'Δεν έχει οριστεί'}</p>
                      <p><span className="font-medium">Εκτιμώμενο Κόστος:</span> €{maintenanceInfo.estimated_cost || 'Δεν έχει οριστεί'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="receipt_type">Τύπος Απόδειξης *</Label>
                <Controller
                  name="receipt_type"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Επιλέξτε τύπο" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="payment">Πληρωμή</SelectItem>
                        <SelectItem value="advance">Προκαταβολή</SelectItem>
                        <SelectItem value="installment">Δόση</SelectItem>
                        <SelectItem value="final">Τελική Πληρωμή</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.receipt_type && (
                  <p className="text-sm text-destructive">{form.formState.errors.receipt_type.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Ποσό (€) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register('amount', { valueAsNumber: true })}
                />
                {form.formState.errors.amount && (
                  <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_date">Ημερομηνία Πληρωμής *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  {...form.register('payment_date')}
                />
                {form.formState.errors.payment_date && (
                  <p className="text-sm text-destructive">{form.formState.errors.payment_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractor_invoice">Αρ. Τιμολογίου Συνεργείου</Label>
                <Input
                  id="contractor_invoice"
                  placeholder="π.χ. INV-2024-001"
                  {...form.register('contractor_invoice')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Περιγραφή *</Label>
              <Textarea
                id="description"
                placeholder="Περιγράψτε την υπηρεσία ή την εργασία που πληρώθηκε..."
                rows={3}
                {...form.register('description')}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>

            {/* Signature Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PenTool className="h-5 w-5" />
                  Ψηφιακή Υπογραφή (Προαιρετική)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!showSignature ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSignature(true)}
                    className="w-full"
                  >
                    Προσθήκη Υπογραφής
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Υπογραφή δεν είναι διαθέσιμη σε αυτή την έκδοση
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSignature(false)}
                      >
                        Ακύρωση
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Ακύρωση
              </Button>
              <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {isLoading ? 'Δημιουργία...' : 'Δημιουργία Απόδειξης'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
