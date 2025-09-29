'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { fetchServiceReceipts, type ServiceReceipt, deleteServiceReceipt, api, fetchScheduledMaintenances, updateScheduledMaintenance } from '@/lib/api';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useRole } from '@/lib/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { BackButton } from '@/components/ui/BackButton';

export default function ReceiptsPage() {
  const { selectedBuilding, currentBuilding } = useBuilding();
  const router = useRouter();
  const qc = useQueryClient();
  const { isAdmin, isManager } = useRole();
  const { toast } = useToast();
  const [toDeleteId, setToDeleteId] = React.useState<number | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const buildingId = selectedBuilding?.id || currentBuilding?.id;
  const { data: receipts = [], isLoading } = useQuery<ServiceReceipt[]>({
    queryKey: ['maintenance', 'receipts', { buildingId }],
    queryFn: () => fetchServiceReceipts({ buildingId: buildingId ?? undefined }),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Αποδείξεις Υπηρεσιών</h1>
          <p className="text-muted-foreground">Τιμολόγια/αποδείξεις συνεργείων</p>
        </div>
        <BackButton href="/maintenance" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <div className="col-span-full flex items-center justify-center py-12 text-sm text-muted-foreground">Φόρτωση…</div>
        )}
        {!isLoading && receipts.length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground">Δεν βρέθηκαν αποδείξεις.</div>
        )}
        {!isLoading && receipts.map((r) => (
          <Card key={r.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Απόδειξη #{r.id}
                </CardTitle>
                <div className="text-xs text-muted-foreground">{new Date(r.service_date).toLocaleDateString('el-GR')}</div>
              </div>
              <Badge variant={r.payment_status === 'paid' ? 'secondary' : 'outline'}>
                {r.payment_status === 'paid' ? 'Εξοφλήθηκε' : r.payment_status === 'overdue' ? 'Ληγμένο' : 'Εκκρεμεί'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>Ποσό: €{(typeof r.amount === 'string' ? parseFloat(r.amount) : r.amount).toLocaleString('el-GR')}</div>
              <div>{r.description}</div>
              <div className="pt-2 flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/maintenance/receipts/${r.id}`}>Προβολή</Link>
                </Button>
                {(isAdmin || isManager) && (
                  <>
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/maintenance/receipts/${r.id}/edit`}>Επεξεργασία</Link>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setToDeleteId(r.id)}>Διαγραφή</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={toDeleteId !== null}
        onOpenChange={(open) => !open && setToDeleteId(null)}
        title="Επιβεβαίωση Διαγραφής"
        description="Θέλετε σίγουρα να διαγράψετε την απόδειξη;"
        confirmText="Διαγραφή"
        confirmVariant="destructive"
        isConfirmLoading={deleting}
        onConfirm={async () => {
          if (toDeleteId === null) return;
          try {
            setDeleting(true);
            await deleteServiceReceipt(toDeleteId);
            qc.invalidateQueries({ queryKey: ['maintenance', 'receipts'] });
            toast({ title: 'Διαγράφηκε', description: 'Η απόδειξη διαγράφηκε.' });

            // Optional follow-ups: offer to delete related financial expenses and revert related scheduled works
            try {
              const building = buildingId;
              // Find the deleted receipt details locally to derive date/amount/description
              const deleted = receipts.find(r => r.id === toDeleteId);
              const receiptDate = deleted?.service_date;
              const receiptAmount = typeof deleted?.amount === 'string' ? parseFloat(deleted?.amount as any) : (deleted?.amount ?? 0);
              const receiptTitle = (deleted?.description || '').trim().toLowerCase();

              if (building && receiptDate && receiptTitle) {
                // Fetch expenses in same day for the building
                const params = { building_id: building, date__gte: receiptDate.slice(0,10), date__lte: receiptDate.slice(0,10) } as any;
                const resp = await api.get(`/financial/expenses/`, { params });
                const rows = Array.isArray(resp.data) ? resp.data : resp.data?.results ?? [];
                // Prefer explicit linkage if backend supports it
                const explicit = rows.filter((e: any) => e?.linked_service_receipt === toDeleteId);
                if (explicit.length > 0) {
                  const alsoDelete = window.confirm(`Βρέθηκαν ${explicit.length} δαπάνες συνδεδεμένες με την απόδειξη. Θέλετε να διαγραφούν;`);
                  if (alsoDelete) {
                    for (const m of explicit) { try { await api.delete(`/financial/expenses/${m.id}/`); } catch {} }
                    toast({ title: 'Ολοκληρώθηκε', description: 'Οι συνδεδεμένες δαπάνες διαγράφηκαν.' });
                  }
                }
                const approxAmountEqual = (a: number, b: number) => Math.abs(Number(a || 0) - Number(b || 0)) < 0.005;
                const normalize = (s: string) => (s || '').trim().toLowerCase();
                const matches = rows.filter((e: any) => (
                  approxAmountEqual(Number(e?.amount), Number(receiptAmount)) && normalize(e?.title) === receiptTitle
                ));
                if (matches.length > 0) {
                  const alsoDelete = window.confirm(`Βρέθηκαν ${matches.length} σχετικές δαπάνες για ίδια ημερομηνία/ποσό/τίτλο. Θέλετε να διαγραφούν κι αυτές; (Ίσως είναι λογιστικά παρατυπία)`);
                  if (alsoDelete) {
                    for (const m of matches) {
                      try { await api.delete(`/financial/expenses/${m.id}/`); } catch {}
                    }
                    toast({ title: 'Ολοκληρώθηκε', description: 'Οι σχετικές δαπάνες διαγράφηκαν.' });
                  }
                }

                // Offer reverting related scheduled items from completed -> scheduled
                try {
                  const scheduled = await fetchScheduledMaintenances({ buildingId: building, ordering: 'scheduled_date' });
                  const closeDate = (d1?: string, d2?: string) => {
                    if (!d1 || !d2) return false;
                    const t1 = new Date(d1.length > 10 ? d1 : `${d1}T00:00:00`).getTime();
                    const t2 = new Date(d2.length > 10 ? d2 : `${d2}T00:00:00`).getTime();
                    return Number.isFinite(t1) && Number.isFinite(t2) && Math.abs(t1 - t2) <= 3 * 24 * 60 * 60 * 1000;
                  };
                  const related = (scheduled as any[]).filter((s) => (
                    (s?.status === 'completed') && closeDate(s?.scheduled_date, receiptDate) && normalize(s?.title) === receiptTitle
                  ));
                  if (related.length > 0) {
                    const revert = window.confirm(`Βρέθηκαν ${related.length} ολοκληρωμένα προγραμματισμένα έργα που ταιριάζουν (τίτλος/ημερομηνία). Θέλετε να επανέλθουν σε "scheduled";`);
                    if (revert) {
                      for (const s of related) {
                        try { await updateScheduledMaintenance(s.id, { status: 'scheduled' as any }); } catch {}
                      }
                      toast({ title: 'Ενημερώθηκαν', description: 'Τα σχετικά έργα επανήλθαν σε scheduled.' });
                    }
                  }
                } catch {}
              }
            } catch {}
          } catch (e) {
            toast({ title: 'Σφάλμα', description: 'Αποτυχία διαγραφής.', variant: 'destructive' as any });
          } finally {
            setDeleting(false);
            setToDeleteId(null);
          }
        }}
      />
    </div>
  );
}


