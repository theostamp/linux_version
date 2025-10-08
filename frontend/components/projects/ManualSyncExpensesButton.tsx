'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ManualSyncExpensesButtonProps {
  projectId: string;
  expensesCount?: number;
  onSyncComplete?: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

interface SyncPreview {
  will_delete: number;
  will_create: number;
  current_expenses: Array<{
    id: number;
    title: string;
    amount: string;
    date: string;
  }>;
  new_expenses: Array<{
    title: string;
    amount: string;
    date: string;
    installment_number: number;
  }>;
}

export function ManualSyncExpensesButton({
  projectId,
  expensesCount = 0,
  onSyncComplete,
  variant = 'outline',
  size = 'default',
}: ManualSyncExpensesButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [step, setStep] = useState<'confirm' | 'preview' | 'success'>('confirm');
  const { toast } = useToast();

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/projects/projects/${projectId}/sync_expenses/`, {
        preview: true,
      });
      setPreview(data);
      setStep('preview');
    } catch (error: any) {
      toast({
        title: 'Σφάλμα',
        description: error?.response?.data?.detail || 'Αποτυχία φόρτωσης προεπισκόπησης',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/projects/projects/${projectId}/sync_expenses/`, {
        preview: false,
        confirm: true,
      });

      toast({
        title: 'Επιτυχία',
        description: `Οι δαπάνες επανασυγχρονίστηκαν επιτυχώς. Δημιουργήθηκαν ${data.created_count} δαπάνες.`,
      });

      setStep('success');

      // Κλείσιμο μετά από 2 δευτερόλεπτα
      setTimeout(() => {
        setOpen(false);
        setStep('confirm');
        setPreview(null);
        onSyncComplete?.();
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Σφάλμα',
        description: error?.response?.data?.detail || 'Αποτυχία συγχρονισμού δαπανών',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setOpen(true);
    setStep('confirm');
    setPreview(null);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpenDialog}
        disabled={loading}
      >
        <RefreshCw className={`h-4 w-4 ${size !== 'icon' ? 'mr-2' : ''}`} />
        {size !== 'icon' && 'Επανασυγχρονισμός Δαπανών'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {step === 'confirm' && (
            <>
              <DialogHeader>
                <DialogTitle>Επανασυγχρονισμός Δαπανών</DialogTitle>
                <DialogDescription>
                  Αυτή η ενέργεια θα επανασυγχρονίσει τις δαπάνες του έργου με βάση τα τρέχοντα δεδομένα πληρωμής.
                </DialogDescription>
              </DialogHeader>

              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Προσοχή:</strong> Οι υπάρχουσες δαπάνες που δημιουργήθηκαν από αυτό το έργο θα διαγραφούν και θα δημιουργηθούν νέες.
                  {expensesCount > 0 && (
                    <span className="block mt-2">
                      Αυτό θα επηρεάσει <strong>{expensesCount} υπάρχουσες δαπάνες</strong>.
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Ακύρωση
                </Button>
                <Button onClick={fetchPreview} disabled={loading}>
                  {loading ? 'Φόρτωση...' : 'Προεπισκόπηση Αλλαγών'}
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 'preview' && preview && (
            <>
              <DialogHeader>
                <DialogTitle>Προεπισκόπηση Αλλαγών</DialogTitle>
                <DialogDescription>
                  Ελέγξτε τις αλλαγές που θα γίνουν πριν επιβεβαιώσετε.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <Alert>
                    <AlertDescription>
                      <div className="font-semibold">Θα διαγραφούν</div>
                      <div className="text-2xl font-bold text-red-600">{preview.will_delete}</div>
                      <div className="text-xs text-muted-foreground">δαπάνες</div>
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <AlertDescription>
                      <div className="font-semibold">Θα δημιουργηθούν</div>
                      <div className="text-2xl font-bold text-green-600">{preview.will_create}</div>
                      <div className="text-xs text-muted-foreground">νέες δαπάνες</div>
                    </AlertDescription>
                  </Alert>
                </div>

                {/* Current Expenses */}
                {preview.current_expenses.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">Θα διαγραφούν:</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
                      {preview.current_expenses.map((exp) => (
                        <div key={exp.id} className="text-sm flex justify-between">
                          <span>{exp.title}</span>
                          <span className="font-medium">€{exp.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Expenses */}
                {preview.new_expenses.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-green-600">Θα δημιουργηθούν:</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
                      {preview.new_expenses.map((exp, idx) => (
                        <div key={idx} className="text-sm flex justify-between">
                          <span>{exp.title}</span>
                          <span className="font-medium">€{exp.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Ακύρωση
                </Button>
                <Button onClick={handleSync} disabled={loading}>
                  {loading ? 'Συγχρονισμός...' : 'Επιβεβαίωση & Συγχρονισμός'}
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 'success' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  Επιτυχής Συγχρονισμός
                </DialogTitle>
                <DialogDescription>
                  Οι δαπάνες επανασυγχρονίστηκαν επιτυχώς!
                </DialogDescription>
              </DialogHeader>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
