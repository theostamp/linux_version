'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2, AlertTriangle } from 'lucide-react';

type Overview = {
  item: any | null;
  schedule: any | null;
  installments: any[];
  receipts: any[];
};

export default function ScheduledMaintenanceOverviewModal({
  open,
  onOpenChange,
  maintenanceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenanceId: number | null;
}) {
  const id = useMemo(() => (maintenanceId ? Number(maintenanceId) : null), [maintenanceId]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Overview>({ item: null, schedule: null, installments: [], receipts: [] });

  useEffect(() => {
    if (!open || !id) return;
    setLoading(true);
    (async () => {
      try {
        const [{ data: item }, { data: history }] = await Promise.all([
          api.get(`/maintenance/scheduled/${id}/`),
          api.get(`/maintenance/scheduled/${id}/payment_history/`),
        ]);
        const schedule = item?.payment_schedule ?? null;
        const { installments = [], receipts = [] } = history || {};
        setData({ item, schedule, installments, receipts });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, id]);

  const totalInstallmentsAmount = useMemo(() => {
    return (data.installments ?? []).reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);
  }, [data.installments]);

  const paidAmount = useMemo(() => {
    return (data.receipts ?? []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
  }, [data.receipts]);

  const remaining = useMemo(() => {
    const total = Number(data.schedule?.total_amount || 0);
    return Math.max(0, total - paidAmount);
  }, [data.schedule, paidAmount]);

  const refresh = async () => {
    if (!id) return;
    const [{ data: item }, { data: history }] = await Promise.all([
      api.get(`/maintenance/scheduled/${id}/`),
      api.get(`/maintenance/scheduled/${id}/payment_history/`),
    ]);
    const schedule = item?.payment_schedule ?? null;
    const { installments = [], receipts = [] } = history || {};
    setData({ item, schedule, installments, receipts });
  };

  const markInstallmentPaid = async (installmentId: number) => {
    await api.post(`/maintenance/payment-installments/${installmentId}/mark_paid/`, {});
    await refresh();
  };

  const downloadReceiptPdf = async (receiptId: number, receiptNumber?: string) => {
    const res = await api.post(`/maintenance/payment-receipts/${receiptId}/generate_pdf/`, {}, { responseType: 'blob' as any });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${receiptNumber || receiptId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const deleteInstallment = async (installmentId: number) => {
    const confirmed = window.confirm(
      'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή τη δόση;\n\nΑυτή η ενέργεια δεν μπορεί να αναιρεθεί.'
    );
    
    if (!confirmed) return;
    
    try {
      await api.delete(`/maintenance/payment-installments/${installmentId}/`);
      toast.success('Η δόση διαγράφηκε επιτυχώς!');
      await refresh();
    } catch (error) {
      toast.error('Σφάλμα κατά τη διαγραφή της δόσης');
      console.error('Error deleting installment:', error);
    }
  };

  const deleteReceipt = async (receiptId: number) => {
    const confirmed = window.confirm(
      'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την απόδειξη;\n\nΑυτή η ενέργεια δεν μπορεί να αναιρεθεί.'
    );
    
    if (!confirmed) return;
    
    try {
      await api.delete(`/maintenance/payment-receipts/${receiptId}/`);
      toast.success('Η απόδειξη διαγράφηκε επιτυχώς!');
      await refresh();
    } catch (error) {
      toast.error('Σφάλμα κατά τη διαγραφή της απόδειξης');
      console.error('Error deleting receipt:', error);
    }
  };

  const deleteEntireProject = async () => {
    const confirmed = window.confirm(
      `Είστε σίγουροι ότι θέλετε να διαγράψετε ολόκληρο το έργο "${data.item?.title}";\n\nΑυτό θα διαγράψει:\n- Όλες τις δόσεις\n- Όλες τις αποδείξεις\n- Την ίδια τη δαπάνη\n\nΑυτή η ενέργεια δεν μπορεί να αναιρεθεί.`
    );
    
    if (!confirmed) return;
    
    try {
      // Διαγραφή όλων των δόσεων
      for (const installment of data.installments || []) {
        try {
          await api.delete(`/maintenance/payment-installments/${installment.id}/`);
        } catch (error) {
          console.warn(`Failed to delete installment ${installment.id}:`, error);
        }
      }
      
      // Διαγραφή όλων των αποδείξεων
      for (const receipt of data.receipts || []) {
        try {
          await api.delete(`/maintenance/payment-receipts/${receipt.id}/`);
        } catch (error) {
          console.warn(`Failed to delete receipt ${receipt.id}:`, error);
        }
      }
      
      // Διαγραφή του έργου συντήρησης
      await api.delete(`/maintenance/scheduled/${id}/`);
      
      toast.success('Το έργο και όλα τα σχετικά στοιχεία διαγράφηκαν επιτυχώς!');
      onOpenChange(false); // Κλείνει το modal
      
      // Ενημέρωση της σελίδας
      window.dispatchEvent(new CustomEvent('expense-deleted'));
      
    } catch (error) {
      toast.error('Σφάλμα κατά τη διαγραφή του έργου');
      console.error('Error deleting project:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Οικονομική Επισκόπηση Έργου</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={deleteEntireProject}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Διαγραφή Έργου
            </Button>
          </DialogTitle>
        </DialogHeader>
        {loading && <div className="text-sm text-muted-foreground">Φόρτωση…</div>}
        {!loading && (
          <div className="space-y-6">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Στοιχεία Έργου</h3>
              <Card>
                <CardContent className="pt-4 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">Τίτλος:</span> <span className="font-medium">{data.item?.title || '—'}</span></div>
                    <div><span className="text-muted-foreground">Συνεργείο:</span> <span className="font-medium">{data.item?.contractor_name || '—'}</span></div>
                    <div><span className="text-muted-foreground">Ημ/νία:</span> <span className="font-medium">{data.item?.scheduled_date ? new Date(data.item.scheduled_date).toLocaleDateString('el-GR') : '—'}</span></div>
                    <div><span className="text-muted-foreground">Κατάσταση:</span> <span className="font-medium">{data.item?.status || '—'}</span></div>
                    <div><span className="text-muted-foreground">Προτεραιότητα:</span> <span className="font-medium">{data.item?.priority || '—'}</span></div>
                    <div><span className="text-muted-foreground">Κτίριο:</span> <span className="font-medium">{data.item?.building_name || data.item?.building?.name || '—'}</span></div>
                  </div>
                  {data.item?.description && <p className="mt-3 text-muted-foreground">{data.item.description}</p>}
                </CardContent>
              </Card>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Σύνοψη Πληρωμών</h3>
              <Card>
                <CardContent className="pt-4 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">Τύπος:</span> <span className="font-medium">{data.schedule?.payment_type || '—'}</span></div>
                    <div><span className="text-muted-foreground">Σύνολο:</span> <span className="font-medium">€ {Number(data.schedule?.total_amount || 0).toFixed(2)}</span></div>
                    <div><span className="text-muted-foreground">Πληρωθέντα:</span> <span className="font-medium">€ {paidAmount.toFixed(2)}</span></div>
                    <div><span className="text-muted-foreground">Υπόλοιπο:</span> <span className="font-medium">€ {remaining.toFixed(2)}</span></div>
                    {data.schedule?.advance_percentage != null && (
                      <div><span className="text-muted-foreground">Προκαταβολή %:</span> <span className="font-medium">{Number(data.schedule.advance_percentage)}%</span></div>
                    )}
                    {(data.schedule?.advance_percentage != null) && (
                      <div><span className="text-muted-foreground">Προκαταβολή Ποσό:</span> <span className="font-medium">€ {((Number(data.schedule.total_amount || 0) * Number(data.schedule.advance_percentage || 0)) / 100).toFixed(2)}</span></div>
                    )}
                    {data.schedule?.installment_count != null && (
                      <div><span className="text-muted-foreground">Αριθμός Δόσεων:</span> <span className="font-medium">{data.schedule.installment_count}</span></div>
                    )}
                    {data.schedule?.installment_frequency && (
                      <div><span className="text-muted-foreground">Συχνότητα Δόσεων:</span> <span className="font-medium">{data.schedule.installment_frequency}</span></div>
                    )}
                    {data.schedule?.periodic_frequency && (
                      <div><span className="text-muted-foreground">Περιοδικότητα:</span> <span className="font-medium">{data.schedule.periodic_frequency}</span></div>
                    )}
                    {data.schedule?.periodic_amount != null && (
                      <div><span className="text-muted-foreground">Περιοδικό Ποσό:</span> <span className="font-medium">€ {Number(data.schedule.periodic_amount).toFixed(2)}</span></div>
                    )}
                    {data.schedule?.start_date && (
                      <div><span className="text-muted-foreground">Έναρξη Πληρωμών:</span> <span className="font-medium">{new Date(data.schedule.start_date).toLocaleDateString('el-GR')}</span></div>
                    )}
                  </div>
                  {data.schedule?.notes && <p className="mt-3 text-muted-foreground">{data.schedule.notes}</p>}
                </CardContent>
              </Card>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Δόσεις</h3>
              <div className="rounded border">
                <div className="p-2 text-xs text-muted-foreground">Σύνολο δόσεων: {data.installments?.length || 0} — Σύνολο ποσού: € {totalInstallmentsAmount.toFixed(2)}</div>
                <Separator />
                <div className="max-h-56 overflow-auto text-sm">
                  {(data.installments ?? []).map((i: any) => (
                    <div key={i.id} className="grid grid-cols-5 gap-2 p-2 border-b last:border-b-0 items-center">
                      <div>Ημ/νία: <span className="font-medium">{i.payment_date ? new Date(i.payment_date).toLocaleDateString('el-GR') : '—'}</span></div>
                      <div>Ποσό: <span className="font-medium">€ {Number(i.amount || 0).toFixed(2)}</span></div>
                      <div>Κατάσταση: <span className="font-medium">{i.status || '—'}</span></div>
                      <div>Περιγραφή: <span className="font-medium">{i.description || '—'}</span></div>
                      <div className="text-right flex gap-1">
                        {i.status !== 'paid' && (
                          <Button size="sm" onClick={() => markInstallmentPaid(i.id)}>Εξόφληση</Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => deleteInstallment(i.id)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Αποδείξεις</h3>
              <div className="rounded border">
                <div className="p-2 text-xs text-muted-foreground">Σύνολο αποδείξεων: {data.receipts?.length || 0}</div>
                <Separator />
                <div className="max-h-56 overflow-auto text-sm">
                  {(data.receipts ?? []).map((r: any) => (
                    <div key={r.id} className="grid grid-cols-5 gap-2 p-2 border-b last:border-b-0 items-center">
                      <div>#<span className="font-medium">{r.receipt_number || r.id}</span></div>
                      <div>Ημ/νία: <span className="font-medium">{r.payment_date ? new Date(r.payment_date).toLocaleDateString('el-GR') : '—'}</span></div>
                      <div>Ποσό: <span className="font-medium">€ {Number(r.amount || 0).toFixed(2)}</span></div>
                      <div>Τύπος: <span className="font-medium">{r.receipt_type || '—'}</span></div>
                      <div className="text-right flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => downloadReceiptPdf(r.id, r.receipt_number)}>PDF</Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => deleteReceipt(r.id)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


